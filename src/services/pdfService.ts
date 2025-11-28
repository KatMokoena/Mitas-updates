import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { In, IsNull } from 'typeorm';
import { getDataSource } from '../database/config';
import { OrderEntity } from '../database/entities/Order';
import { TaskEntity } from '../database/entities/Task';
import { ResourceEntity } from '../database/entities/Resource';
import { ProjectEntity } from '../database/entities/Project';
import { RequisitionEntity } from '../database/entities/Requisition';
import { RequisitionItemEntity } from '../database/entities/Requisition';
import { TaskInvitationEntity } from '../database/entities/TaskInvitation';
import { AuditLogEntity, AuditAction, AuditEntityType } from '../database/entities/AuditLog';
import { UserEntity } from '../database/entities/User';
import { TimeTrackingService } from './timeTrackingService';
import { SchedulingEngine, TimelineResult } from './schedulingEngine';
import * as fs from 'fs';
import * as path from 'path';

interface ProcurementRequestData {
  itemName: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  customerNumber: string;
  additionalCriteria?: string;
  taggedUsers: string[];
  orderId: string;
  requestedBy: string;
  requestedByName: string;
}

export class PdfService {
  private schedulingEngine: SchedulingEngine;
  private timeTrackingService: TimeTrackingService;

  constructor() {
    this.schedulingEngine = new SchedulingEngine();
    this.timeTrackingService = new TimeTrackingService();
  }

  /**
   * Generate comprehensive PDF report for an order/project
   */
  async generateOrderPDF(orderId: string): Promise<Buffer> {
    const dataSource = getDataSource();
    const orderRepository = dataSource.getRepository(OrderEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);
    const resourceRepository = dataSource.getRepository(ResourceEntity);
    const requisitionRepository = dataSource.getRepository(RequisitionEntity);
    const requisitionItemRepository = dataSource.getRepository(RequisitionItemEntity);
    const invitationRepository = dataSource.getRepository(TaskInvitationEntity);
    const auditLogRepository = dataSource.getRepository(AuditLogEntity);
    const userRepository = dataSource.getRepository(UserEntity);
    const projectRepository = dataSource.getRepository(ProjectEntity);

    // Fetch order
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Fetch timeline
    const timeline = await this.schedulingEngine.recalculateOrderTimeline(orderId);

    // Fetch tasks
    const tasks = await taskRepository.find({
      where: { orderId },
      order: { startDate: 'ASC' },
    });

    // Find associated project(s) from tasks
    const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
    let project: ProjectEntity | null = null;
    let timeSummary: any = null;
    
    if (projectIds.length > 0) {
      project = await projectRepository.findOne({ where: { id: projectIds[0] } });
      if (project) {
        try {
          timeSummary = await this.timeTrackingService.getProjectTimeSummary(project.id);
        } catch (error) {
          console.warn('Could not fetch time tracking summary:', error);
        }
      }
    }

    // Fetch equipment/resources
    const equipment: Array<{ id: string; name: string; category?: string }> = [];
    if (order.equipmentIds && order.equipmentIds.length > 0) {
      const equipmentIds = Array.isArray(order.equipmentIds)
        ? order.equipmentIds
        : (order.equipmentIds as string).split(',').filter((id: string) => id.trim());

      const resources = await resourceRepository.find({
        where: { id: In(equipmentIds) },
      });
      equipment.push(
        ...resources.map((r) => ({
          id: r.id,
          name: r.name,
          category: (r as any).category || undefined,
        }))
      );
    }

    // Fetch all requisitions for this order
    const requisitions = await requisitionRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    // Fetch requisition items
    const requisitionsWithItems = await Promise.all(
      requisitions.map(async (req) => {
        const items = await requisitionItemRepository.find({
          where: { requisitionId: req.id },
        });
        const requester = await userRepository.findOne({ where: { id: req.requestedBy } });
        const approvers = req.approverIds ? await userRepository.find({
          where: { id: In(req.approverIds) },
        }) : [];
        const approvedBy = req.approvedByIds ? await userRepository.find({
          where: { id: In(req.approvedByIds) },
        }) : [];
        const rejectedBy = req.rejectedByIds ? await userRepository.find({
          where: { id: In(req.rejectedByIds) },
        }) : [];
        return {
          ...req,
          items,
          requester: requester ? `${requester.name} ${requester.surname}` : 'Unknown',
          approvers: approvers.map(u => `${u.name} ${u.surname}`).join(', ') || 'N/A',
          approvedBy: approvedBy.map(u => `${u.name} ${u.surname}`).join(', ') || 'None',
          rejectedBy: rejectedBy.map(u => `${u.name} ${u.surname}`).join(', ') || 'None',
        };
      })
    );

    // Fetch task invitations for tasks in this order
    const taskIds = tasks.map(t => t.id);
    const invitations = taskIds.length > 0 ? await invitationRepository.find({
      where: { taskId: In(taskIds) },
      order: { createdAt: 'DESC' },
    }) : [];

    // Fetch invitation details
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (inv) => {
        const task = await taskRepository.findOne({ where: { id: inv.taskId } });
        const inviter = await userRepository.findOne({ where: { id: inv.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: inv.inviteeId } });
        return {
          ...inv,
          taskTitle: task?.title || 'Unknown Task',
          inviterName: inviter ? `${inviter.name} ${inviter.surname}` : 'Unknown',
          inviteeName: invitee ? `${invitee.name} ${invitee.surname}` : 'Unknown',
        };
      })
    );

    // Fetch audit logs for this order and related entities
    const auditLogs = await auditLogRepository.find({
      where: [
        { entityType: AuditEntityType.ORDER, entityId: orderId },
        { entityType: AuditEntityType.TASK, entityId: In(taskIds) },
        { entityType: AuditEntityType.REQUISITION, entityId: In(requisitions.map(r => r.id)) },
      ],
      order: { createdAt: 'DESC' },
      take: 100, // Limit to most recent 100 entries
    });

    // Fetch user details for audit logs
    const auditLogsWithUsers = await Promise.all(
      auditLogs.map(async (log) => {
        const user = log.userId ? await userRepository.findOne({ where: { id: log.userId } }) : null;
        return {
          ...log,
          userName: user ? `${user.name} ${user.surname}` : 'System',
        };
      })
    );

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPos = 20;
    let pageNumber = 1;

    // Add logo and banner to first page
    await this.addLogoAndBanner(doc, yPos);
    yPos = 40;

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPREHENSIVE PROJECT REPORT', 105, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order: ${order.orderNumber}`, 105, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Executive Summary Section
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addExecutiveSummary(doc, order, timeline, timeSummary, yPos);

    // Order Information
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addOrderInfoTable(doc, order, yPos);

    // Timeline Status
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addTimelineStatusTable(doc, order, timeline, yPos);

    // Time Tracking Data
    if (timeSummary) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      yPos = this.addTimeTrackingSection(doc, timeSummary, yPos);
    }

    // Required Solution & Equipment
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addEquipmentTable(doc, order, equipment, yPos);

    // Tasks and Milestones
    if (tasks.length > 0) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      yPos = this.addTasksTable(doc, tasks, timeline, yPos);
    }

    // Critical Path
    if (timeline.criticalPathTasks && timeline.criticalPathTasks.length > 0) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      yPos = this.addCriticalPathSection(doc, timeline, tasks, yPos);
    }

    // Requisitions Section
    if (requisitionsWithItems.length > 0) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      yPos = this.addRequisitionsSection(doc, requisitionsWithItems, yPos);
    }

    // Audit Trail - Invitations and Additions
    if (invitationsWithDetails.length > 0 || auditLogsWithUsers.length > 0) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      yPos = this.addAuditTrailSection(doc, invitationsWithDetails, auditLogsWithUsers, yPos);
    }

    // Weaknesses, Faults, and Mistakes Section
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addWeaknessesSection(doc, yPos);

    // Recommendations Section
    yPos = await this.addNewPageIfNeeded(doc, yPos);
    yPos = this.addRecommendationsSection(doc, yPos);

    // Add footer to all pages
    await this.addFooter(doc);

    // Convert to buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  private async addNewPageIfNeeded(doc: jsPDF, yPos: number): Promise<number> {
    if (yPos > 250) {
      doc.addPage();
      // Add logo to new page
      await this.addLogoAndBanner(doc, 10);
      return 40;
    }
    return yPos;
  }

  private async addLogoAndBanner(doc: jsPDF, startY: number): Promise<void> {
    let logoHeight = 20;
    let logoWidth = 25;
    let logoDataUrl: string | null = null;

    // Try to load logo
    try {
      const logoPath = path.join(__dirname, '../../public/Mitas logo.jpeg');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;

        // Get image dimensions (simplified - assume square-ish logo)
        logoWidth = 25;
        logoHeight = 25;
      }
    } catch (error) {
      console.warn('Could not load logo:', error);
    }

    // Add orange banner with bevel
    const bannerY = 10;
    const bannerHeight = Math.max(logoHeight, 20);

    const orangeBase = [249, 115, 22];
    const orangeLight = [255, 165, 0];
    const orangeDark = [220, 90, 15];

    // Base banner
    doc.setFillColor(orangeBase[0], orangeBase[1], orangeBase[2]);
    doc.rect(14, bannerY, 260, bannerHeight, 'F');

    // Top highlight
    doc.setFillColor(orangeLight[0], orangeLight[1], orangeLight[2]);
    doc.rect(14, bannerY, 260, bannerHeight * 0.3, 'F');

    // Bottom shadow
    doc.setFillColor(orangeDark[0], orangeDark[1], orangeDark[2]);
    doc.rect(14, bannerY + bannerHeight * 0.7, 260, bannerHeight * 0.3, 'F');

    // Middle blend
    doc.setFillColor(orangeBase[0], orangeBase[1], orangeBase[2]);
    doc.rect(14, bannerY + bannerHeight * 0.3, 260, bannerHeight * 0.4, 'F');

    // Add logo on top
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'JPEG', 14, 10, logoWidth, logoHeight);
      } catch (error) {
        console.warn('Could not add logo image:', error);
      }
    }
  }

  private addOrderInfoTable(doc: jsPDF, order: OrderEntity, yPos: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Information', 14, yPos);
    yPos += 8;

    const orderInfoData = [
      ['Order Number', order.orderNumber],
      ['Customer', order.customerName],
      ['Status', order.status.replace('_', ' ').toUpperCase()],
      ['Priority', order.priority.toUpperCase()],
      ['Description', order.description || 'N/A'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: orderInfoData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
        1: { cellWidth: 140, fillColor: [255, 255, 255] },
      },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 50;
  }

  private addTimelineStatusTable(
    doc: jsPDF,
    order: OrderEntity,
    timeline: TimelineResult,
    yPos: number
  ): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Timeline Status', 14, yPos);
    yPos += 8;

    const deadline = new Date(order.deadline);
    const projectedCompletion = new Date(timeline.projectedCompletionDate);

    const timelineStatusData = [
      ['Deadline Status', timeline.status.replace('_', ' ').toUpperCase()],
      [
        'Days Until Deadline',
        timeline.daysUntilDeadline > 0
          ? `${timeline.daysUntilDeadline} days`
          : `${Math.abs(timeline.daysUntilDeadline)} days overdue`,
      ],
      ['Target Deadline', `${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}`],
      [
        'Projected Completion',
        `${projectedCompletion.toLocaleDateString()} ${projectedCompletion.toLocaleTimeString()}`,
      ],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: timelineStatusData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
        1: { cellWidth: 140, fillColor: [255, 255, 255] },
      },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 50;
  }

  private addEquipmentTable(
    doc: jsPDF,
    order: OrderEntity,
    equipment: Array<{ id: string; name: string; category?: string }>,
    yPos: number
  ): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Required Solution & Equipment', 14, yPos);
    yPos += 8;

    const equipmentData: string[][] = [];
    if (equipment.length > 0) {
      equipment.forEach((eq) => {
        equipmentData.push([eq.category === 'solution' ? 'Solution' : 'Technology', eq.name]);
      });
    }

    const body = equipmentData.length > 0 ? equipmentData : [['N/A', 'No equipment specified']];

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Name']],
      body,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
        1: { cellWidth: 140, fillColor: [255, 255, 255] },
      },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 50;
  }

  private addTasksTable(
    doc: jsPDF,
    tasks: TaskEntity[],
    timeline: TimelineResult,
    yPos: number
  ): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tasks', 14, yPos);
    yPos += 8;

    const taskData = tasks.map((task) => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const isCritical = task.isCritical || (timeline.criticalPathTasks || []).includes(task.id);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const description = task.description || '';
      const shortDescription = description.length > 50 ? description.substring(0, 47) + '...' : description;

      return [
        task.title,
        shortDescription || '-',
        task.status.replace('_', ' '),
        startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString(),
        endDate.toLocaleDateString() + ' ' + endDate.toLocaleTimeString(),
        `${duration} days`,
        isCritical ? 'Yes' : 'No',
        task.slackDays !== undefined ? `${task.slackDays} days` : '-',
        task.dependencies && task.dependencies.length > 0
          ? `${task.dependencies.length} task(s)`
          : 'None',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [
        ['Task', 'Description', 'Status', 'Start Date', 'End Date', 'Duration', 'Critical', 'Slack', 'Dependencies'],
      ],
      body: taskData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 9, cellPadding: 2 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 35, fillColor: [255, 255, 255] },
        1: { cellWidth: 40, fillColor: [255, 255, 255] },
        2: { cellWidth: 20, fillColor: [255, 255, 255] },
        3: { cellWidth: 35, fillColor: [255, 255, 255] },
        4: { cellWidth: 35, fillColor: [255, 255, 255] },
        5: { cellWidth: 20, fillColor: [255, 255, 255] },
        6: { cellWidth: 18, fillColor: [255, 255, 255] },
        7: { cellWidth: 18, fillColor: [255, 255, 255] },
        8: { cellWidth: 25, fillColor: [255, 255, 255] },
      },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 100;
  }

  private addCriticalPathSection(
    doc: jsPDF,
    timeline: TimelineResult,
    tasks: TaskEntity[],
    yPos: number
  ): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Critical Path Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${timeline.criticalPathTasks.length} task(s) on the critical path`, 14, yPos);
    yPos += 6;
    doc.text(
      'Critical path tasks have zero slack time. Any delay in these tasks will directly impact the deadline.',
      14,
      yPos
    );
    yPos += 8;

    const criticalTasks = tasks
      .filter((t) => (timeline.criticalPathTasks || []).includes(t.id))
      .map((t) => t.title);

    if (criticalTasks.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Critical Tasks:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      criticalTasks.forEach((taskTitle) => {
        doc.text(`  • ${taskTitle}`, 20, yPos);
        yPos += 6;
      });
    }

    return yPos;
  }

  private async addFooter(doc: jsPDF): Promise<void> {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add logo to header of each page (if not already present)
      await this.addLogoAndBanner(doc, 10);
      
      // Add page number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        105,
        285,
        { align: 'center' }
      );
    }
  }

  private addExecutiveSummary(
    doc: jsPDF,
    order: OrderEntity,
    timeline: TimelineResult,
    timeSummary: any,
    yPos: number
  ): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryLines = [
      `This comprehensive report documents the complete lifecycle of Order ${order.orderNumber} for customer ${order.customerName}.`,
      '',
      `Project Status: ${order.status.replace('_', ' ').toUpperCase()}`,
      `Timeline Status: ${timeline.status.replace('_', ' ').toUpperCase()}`,
      timeSummary ? `Total Time Invested: ${timeSummary.totalHours.toFixed(2)} hours` : '',
      `Days Until Deadline: ${timeline.daysUntilDeadline > 0 ? timeline.daysUntilDeadline : Math.abs(timeline.daysUntilDeadline) + ' days overdue'}`,
      '',
      'This report includes detailed information on project execution, time tracking, requisitions,',
      'tasks, milestones, audit trails, and lessons learned for future project improvement.',
    ].filter(Boolean);

    summaryLines.forEach((line) => {
      if (yPos > 250) {
        doc.addPage();
        this.addLogoAndBanner(doc, 10).catch(() => {});
        yPos = 40;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });

    return yPos + 10;
  }

  private addTimeTrackingSection(doc: jsPDF, timeSummary: any, yPos: number): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Time Tracking Summary', 14, yPos);
    yPos += 10;

    // Total Time
    const totalTimeData = [
      ['Total Hours', `${timeSummary.totalHours.toFixed(2)} hours`],
      ['Total Entries', timeSummary.totalEntries.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: totalTimeData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
    });

    yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;

    // Breakdown by User
    if (timeSummary.byUser && timeSummary.byUser.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        this.addLogoAndBanner(doc, 10).catch(() => {});
        yPos = 40;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Time Breakdown by User', 14, yPos);
      yPos += 8;

      const userData = timeSummary.byUser.map((user: any) => [
        user.userName,
        `${user.totalHours.toFixed(2)} hours`,
        user.entryCount.toString(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['User', 'Total Hours', 'Entries']],
        body: userData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: { fontSize: 9, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    // Breakdown by Task
    if (timeSummary.byTask && timeSummary.byTask.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        this.addLogoAndBanner(doc, 10).catch(() => {});
        yPos = 40;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Time Breakdown by Task', 14, yPos);
      yPos += 8;

      const taskData = timeSummary.byTask.map((task: any) => [
        task.taskTitle || 'N/A',
        `${task.totalHours.toFixed(2)} hours`,
        task.entryCount.toString(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Task', 'Total Hours', 'Entries']],
        body: taskData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: { fontSize: 9, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    return yPos;
  }

  private addRequisitionsSection(doc: jsPDF, requisitions: any[], yPos: number): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Requisitions', 14, yPos);
    yPos += 10;

    requisitions.forEach((req, index) => {
      if (yPos > 200) {
        doc.addPage();
        this.addLogoAndBanner(doc, 10).catch(() => {});
        yPos = 40;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Requisition ${index + 1}`, 14, yPos);
      yPos += 8;

      const reqData = [
        ['Status', req.status.replace('_', ' ').toUpperCase()],
        ['Requested By', req.requester],
        ['Requested On', new Date(req.createdAt).toLocaleDateString()],
        ['Approvers', req.approvers],
        ['Approved By', req.approvedBy],
        ['Rejected By', req.rejectedBy],
        req.rejectionReason ? ['Rejection Reason', req.rejectionReason] : null,
        req.notes ? ['Notes', req.notes] : null,
      ].filter(Boolean) as string[][];

      autoTable(doc, {
        startY: yPos,
        head: [['Field', 'Value']],
        body: reqData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: { fontSize: 9, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;

      // Requisition Items
      if (req.items && req.items.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          this.addLogoAndBanner(doc, 10).catch(() => {});
          yPos = 40;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Items:', 14, yPos);
        yPos += 6;

        const itemData = req.items.map((item: any) => [
          item.equipmentId || 'N/A',
          item.quantity?.toString() || '1',
          item.availability || 'N/A',
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Equipment ID', 'Quantity', 'Availability']],
          body: itemData,
          theme: 'striped',
          headStyles: {
            fillColor: [249, 115, 22],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [255, 250, 245] },
        });

        yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
      }
    });

    return yPos;
  }

  private addAuditTrailSection(doc: jsPDF, invitations: any[], auditLogs: any[], yPos: number): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Trail', 14, yPos);
    yPos += 10;

    // Task Invitations
    if (invitations.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Task Invitations', 14, yPos);
      yPos += 8;

      const invitationData = invitations.map((inv) => [
        new Date(inv.createdAt).toLocaleDateString(),
        inv.taskTitle,
        inv.inviterName,
        inv.inviteeName,
        inv.status.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Task', 'Invited By', 'Invited User', 'Status']],
        body: invitationData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    // Audit Logs
    if (auditLogs.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        this.addLogoAndBanner(doc, 10).catch(() => {});
        yPos = 40;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('System Activity Log', 14, yPos);
      yPos += 8;

      const auditData = auditLogs.slice(0, 50).map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.userName,
        log.action.toUpperCase(),
        log.entityType.toUpperCase(),
        log.entityName || log.entityId || 'N/A',
        log.description || '-',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Timestamp', 'User', 'Action', 'Entity Type', 'Entity', 'Description']],
        body: auditData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: { fontSize: 7, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    return yPos;
  }

  private addWeaknessesSection(doc: jsPDF, yPos: number): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Weaknesses, Faults, and Mistakes', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('This section documents issues, weaknesses, faults, and mistakes identified during the project execution.', 14, yPos);
    yPos += 8;
    doc.text('Note: This section can be manually populated with project-specific issues and lessons learned.', 14, yPos, { maxWidth: 180 });
    yPos += 10;

    // Placeholder table
    const weaknessesData = [
      ['No specific weaknesses documented at this time.', ''],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Issue Description', 'Impact']],
      body: weaknessesData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
  }

  private addRecommendationsSection(doc: jsPDF, yPos: number): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations for Future Projects', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('This section provides recommendations on how to handle similar projects better in the future,', 14, yPos);
    yPos += 5;
    doc.text('based on lessons learned from this project.', 14, yPos);
    yPos += 8;
    doc.text('Note: This section can be manually populated with project-specific recommendations.', 14, yPos, { maxWidth: 180 });
    yPos += 10;

    // Placeholder table
    const recommendationsData = [
      ['No specific recommendations documented at this time.', ''],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Recommendation', 'Priority']],
      body: recommendationsData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
    });

    return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
  }

  /**
   * Generate PDF for time tracking report
   */
  async generateTimeTrackingPDF(projectId: string, summary: any): Promise<Buffer> {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPos = 20;

    // Add logo and banner
    await this.addLogoAndBanner(doc, yPos);
    yPos = 40;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Time Tracking Report', 105, yPos, { align: 'center' });
    yPos += 10;

    // Project Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Information', 14, yPos);
    yPos += 8;

    const projectInfoData = [
      ['Project Title', project.title],
      ['Description', project.description || 'N/A'],
      ['Status', project.status.replace('_', ' ').toUpperCase()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: projectInfoData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
        1: { cellWidth: 140, fillColor: [255, 255, 255] },
      },
    });

    yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;

    // Total Time Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Time Summary', 14, yPos);
    yPos += 8;

    const totalTimeData = [
      ['Total Hours', `${summary.totalHours.toFixed(2)} hours`],
      ['Total Entries', summary.totalEntries.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: totalTimeData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
        1: { cellWidth: 140, fillColor: [255, 255, 255] },
      },
    });

    yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;

    // Breakdown by User
    if (summary.byUser && summary.byUser.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Time Breakdown by User', 14, yPos);
      yPos += 8;

      const userData = summary.byUser.map((user: any) => [
        user.userName,
        `${user.totalHours.toFixed(2)} hours`,
        user.entryCount.toString(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['User', 'Total Hours', 'Entries']],
        body: userData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        styles: { fontSize: 9, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    // Breakdown by Task
    if (summary.byTask && summary.byTask.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Time Breakdown by Task', 14, yPos);
      yPos += 8;

      const taskData = summary.byTask.map((task: any) => [
        task.taskTitle,
        `${task.totalHours.toFixed(2)} hours`,
        task.entryCount.toString(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Task', 'Total Hours', 'Entries']],
        body: taskData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        styles: { fontSize: 9, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 50;
    }

    // Detailed Time Entries
    if (summary.entries && summary.entries.length > 0) {
      if (yPos > 160) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Time Entries', 14, yPos);
      yPos += 8;

      const entryData = summary.entries.map((entry: any) => {
        const date = new Date(entry.startTime);
        return [
          date.toLocaleDateString(),
          entry.userName,
          entry.taskTitle || 'N/A',
          entry.entryType.toUpperCase(),
          `${entry.durationHours.toFixed(2)}h`,
          entry.description || '-',
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'User', 'Task', 'Type', 'Duration', 'Description']],
        body: entryData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
      });
    }

    // Footer
    this.addFooter(doc);

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate Procurement Request PDF
   */
  async generateProcurementRequestPDF(data: ProcurementRequestData): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPos = 20;

    // Add logo and banner on first page
    await this.addLogoAndBanner(doc, yPos);
    yPos = 40;

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('PROCUREMENT REQUEST', 105, yPos, { align: 'center' });
    yPos += 12;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPos, { align: 'center' });
    yPos += 20;

    // Professional Information Table
    const infoData = [
      ['Item Code', data.itemCode],
      ['Item Description', data.itemDescription],
      ['Quantity', data.quantity.toString()],
      ['Customer Number', data.customerNumber],
      ['Requested By', data.requestedByName],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: infoData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 130 },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Additional Criteria
    if (data.additionalCriteria) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Additional Criteria', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const criteriaLines = doc.splitTextToSize(data.additionalCriteria, 170);
      doc.text(criteriaLines, 20, yPos);
      yPos += criteriaLines.length * 5 + 10;
    }

    // Tagged Users
    if (data.taggedUsers && data.taggedUsers.length > 0) {
      yPos = await this.addNewPageIfNeeded(doc, yPos);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Tagged Users (To View PDF)', 20, yPos);
      yPos += 10;

      const dataSource = getDataSource();
      const userRepository = dataSource.getRepository(UserEntity);
      const taggedUsers = await userRepository.find({
        where: { id: In(data.taggedUsers) },
      });

      const userTableData = taggedUsers.map((user, index) => [
        (index + 1).toString(),
        `${user.name} ${user.surname}`,
        user.email || 'N/A',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Name', 'Email']],
        body: userTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      // Add logo to every page
      await this.addLogoAndBanner(doc, 10);
      
      // Add footer only on last page
      if (i === pageCount) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('This is an automated procurement request generated by Mitas IPMP', 105, 280, { align: 'center' });
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}

