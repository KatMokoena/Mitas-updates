import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { In } from 'typeorm';
import { getDataSource } from '../database/config';
import { OrderEntity } from '../database/entities/Order';
import { TaskEntity } from '../database/entities/Task';
import { ResourceEntity } from '../database/entities/Resource';
import { SchedulingEngine, TimelineResult } from './schedulingEngine';
import * as fs from 'fs';
import * as path from 'path';

export class PdfService {
  private schedulingEngine: SchedulingEngine;

  constructor() {
    this.schedulingEngine = new SchedulingEngine();
  }

  /**
   * Generate PDF for an order (server-side version)
   */
  async generateOrderPDF(orderId: string): Promise<Buffer> {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const resourceRepository = getDataSource().getRepository(ResourceEntity);

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

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'landscape',
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
    doc.text('Order Details Report', 148, yPos, { align: 'center' });
    yPos += 15;

    // Order Information Table
    yPos = this.addOrderInfoTable(doc, order, yPos);

    // Timeline Status Table
    yPos = this.addTimelineStatusTable(doc, order, timeline, yPos);

    // Required Solution & Equipment Table
    yPos = this.addEquipmentTable(doc, order, equipment, yPos);

    // Tasks Table
    if (tasks.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      yPos = this.addTasksTable(doc, tasks, timeline, yPos);
    }

    // Critical Path Section
    if (timeline.criticalPathTasks && timeline.criticalPathTasks.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      yPos = this.addCriticalPathSection(doc, timeline, tasks, yPos);
    }

    // Footer
    this.addFooter(doc);

    // Convert to buffer
    return Buffer.from(doc.output('arraybuffer'));
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

  private addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        148,
        200,
        { align: 'center' }
      );
    }
  }
}

