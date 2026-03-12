import { getDataSource } from '../database/config';
import { OrderEntity } from '../database/entities/Order';
import { TaskEntity } from '../database/entities/Task';
import { TimeEntryEntity } from '../database/entities/TimeEntry';
import { PurchaseEntity } from '../database/entities/Purchase';
import { ProjectAnalysisEntity } from '../database/entities/ProjectAnalysis';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectAnalysisData {
  recommendations: string;
  weaknesses: string;
  faults: string;
  mistakes: string;
  summary?: string;
}

export class ProjectAnalysisService {
  /**
   * Analyze a completed project and generate insights based on data patterns
   */
  async analyzeProject(orderId: string): Promise<ProjectAnalysisEntity | null> {
    try {
      // Collect all project data
      const projectData = await this.collectProjectData(orderId);
      
      // Generate analysis based on rules and patterns
      const analysis = this.generateAnalysis(projectData);
      
      // Save analysis to database
      const analysisEntity = await this.saveAnalysis(orderId, analysis, projectData);
      
      return analysisEntity;
    } catch (error) {
      console.error('[ProjectAnalysisService] Error analyzing project:', error);
      throw error;
    }
  }

  /**
   * Collect all relevant data for analysis
   */
  private async collectProjectData(orderId: string): Promise<any> {
    const dataSource = getDataSource();
    const orderRepository = dataSource.getRepository(OrderEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);
    const purchaseRepository = dataSource.getRepository(PurchaseEntity);

    // Get order
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Get all tasks
    const tasks = await taskRepository.find({ where: { orderId } });

    // Get all time entries
    const timeEntries = await timeEntryRepository.find({ where: { orderId } });

    // Get all purchases
    const purchases = await purchaseRepository.find({ where: { orderId } });

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalEstimatedDays = tasks.reduce((sum, t) => sum + (t.estimatedDays || 0), 0);
    const totalActualDays = tasks.reduce((sum, t) => {
      if (t.actualStartDateTime && t.actualEndDateTime) {
        const days = Math.ceil((new Date(t.actualEndDateTime).getTime() - new Date(t.actualStartDateTime).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum;
    }, 0);
    const totalHours = timeEntries.reduce((sum, te) => sum + parseFloat(te.durationHours.toString()), 0);
    
    // Calculate deadline performance
    const deadline = new Date(order.deadline);
    const completedDate = order.completedDate ? new Date(order.completedDate) : new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
    const wasOnTime = daysUntilDeadline >= 0;
    const daysEarlyOrLate = Math.abs(daysUntilDeadline);

    // Task delays
    const delayedTasks = tasks.filter(t => {
      if (t.plannedEndDateTime && t.actualEndDateTime) {
        return new Date(t.actualEndDateTime) > new Date(t.plannedEndDateTime);
      }
      return false;
    });

    // Critical path tasks
    const criticalTasks = tasks.filter(t => t.isCritical);

    // Purchase delays
    const delayedPurchases = purchases.filter(p => {
      if (p.expectedDeliveryDate && p.actualDeliveryDate) {
        return new Date(p.actualDeliveryDate) > new Date(p.expectedDeliveryDate);
      }
      return false;
    });

    // Task estimation accuracy
    const tasksWithActuals = tasks.filter(t => t.actualStartDateTime && t.actualEndDateTime && t.estimatedDays);
    const estimationVariances = tasksWithActuals.map(t => {
      const actualDays = Math.ceil((new Date(t.actualEndDateTime!).getTime() - new Date(t.actualStartDateTime!).getTime()) / (1000 * 60 * 60 * 24));
      return {
        task: t.title,
        estimated: t.estimatedDays,
        actual: actualDays,
        variance: actualDays - t.estimatedDays,
        variancePercent: ((actualDays - t.estimatedDays) / t.estimatedDays) * 100,
      };
    });

    return {
      order: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        description: order.description,
        priority: order.priority,
        deadline: order.deadline,
        completedDate: order.completedDate,
        createdAt: order.createdAt,
        status: order.status,
      },
      metrics: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        totalEstimatedDays,
        totalActualDays,
        estimationAccuracy: totalEstimatedDays > 0 ? ((totalActualDays / totalEstimatedDays) * 100) : 0,
        totalHours,
        daysUntilDeadline,
        wasOnTime,
        daysEarlyOrLate,
        delayedTasksCount: delayedTasks.length,
        criticalTasksCount: criticalTasks.length,
        delayedPurchasesCount: delayedPurchases.length,
      },
      tasks: tasks.map(t => ({
        title: t.title,
        status: t.status,
        estimatedDays: t.estimatedDays,
        actualDays: t.actualStartDateTime && t.actualEndDateTime 
          ? Math.ceil((new Date(t.actualEndDateTime).getTime() - new Date(t.actualStartDateTime).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        plannedStart: t.plannedStartDateTime,
        plannedEnd: t.plannedEndDateTime,
        actualStart: t.actualStartDateTime,
        actualEnd: t.actualEndDateTime,
        isCritical: t.isCritical,
        assignedUser: t.assignedUserName ? `${t.assignedUserName} ${t.assignedUserSurname || ''}`.trim() : null,
        wasDelayed: t.plannedEndDateTime && t.actualEndDateTime 
          ? new Date(t.actualEndDateTime) > new Date(t.plannedEndDateTime)
          : false,
      })),
      timeEntries: timeEntries.map(te => ({
        durationHours: parseFloat(te.durationHours.toString()),
        description: te.description,
        entryType: te.entryType,
        userName: te.userName ? `${te.userName} ${te.userSurname || ''}`.trim() : null,
      })),
      purchases: purchases.map(p => ({
        supplierName: p.supplierName,
        itemDescription: p.itemDescription,
        expectedDeliveryDate: p.expectedDeliveryDate,
        actualDeliveryDate: p.actualDeliveryDate,
        wasDelayed: p.expectedDeliveryDate && p.actualDeliveryDate
          ? new Date(p.actualDeliveryDate) > new Date(p.expectedDeliveryDate)
          : false,
      })),
      estimationVariances,
    };
  }

  /**
   * Generate analysis based on data patterns and rules
   */
  private generateAnalysis(projectData: any): ProjectAnalysisData {
    const { metrics, tasks, purchases, estimationVariances } = projectData;
    
    const recommendations: string[] = [];
    const weaknesses: string[] = [];
    const faults: string[] = [];
    const mistakes: string[] = [];

    // Summary
    let summary = `Project ${projectData.order.orderNumber} completed `;
    if (metrics.wasOnTime) {
      summary += `${metrics.daysEarlyOrLate} day(s) early. `;
    } else {
      summary += `${metrics.daysEarlyOrLate} day(s) late. `;
    }
    summary += `Completion rate: ${metrics.completionRate.toFixed(1)}%. `;
    summary += `Total hours worked: ${metrics.totalHours.toFixed(1)}.`;

    // Recommendations based on patterns
    if (metrics.estimationAccuracy < 80) {
      recommendations.push(`1. Improve estimation accuracy: Actual time was ${(100 - metrics.estimationAccuracy).toFixed(1)}% different from estimates. Consider adding buffer time (20-30%) to initial estimates.`);
    }

    if (metrics.delayedTasksCount > 0) {
      const delayRate = (metrics.delayedTasksCount / metrics.totalTasks) * 100;
      recommendations.push(`2. Task delay management: ${metrics.delayedTasksCount} out of ${metrics.totalTasks} tasks (${delayRate.toFixed(1)}%) were delayed. Implement earlier task monitoring and proactive intervention.`);
    }

    if (metrics.delayedPurchasesCount > 0) {
      recommendations.push(`3. Procurement planning: ${metrics.delayedPurchasesCount} purchase(s) arrived late, impacting project timeline. Order materials earlier or identify alternative suppliers.`);
    }

    if (metrics.criticalTasksCount > 0 && metrics.delayedTasksCount > 0) {
      const delayedCritical = tasks.filter((t: any) => t.isCritical && t.wasDelayed).length;
      if (delayedCritical > 0) {
        recommendations.push(`4. Critical path monitoring: ${delayedCritical} critical path task(s) were delayed. Prioritize critical tasks and allocate additional resources.`);
      }
    }

    if (metrics.wasOnTime && metrics.daysEarlyOrLate > 3) {
      recommendations.push(`5. Buffer time optimization: Project completed ${metrics.daysEarlyOrLate} days early. Consider reducing buffer time in future estimates to improve resource utilization.`);
    }

    if (estimationVariances.length > 0) {
      const avgVariance = estimationVariances.reduce((sum: number, v: any) => sum + v.variancePercent, 0) / estimationVariances.length;
      if (Math.abs(avgVariance) > 30) {
        recommendations.push(`6. Estimation review: Average estimation variance was ${avgVariance > 0 ? '+' : ''}${avgVariance.toFixed(1)}%. Review estimation process and historical data for similar tasks.`);
      }
    }

    // Weaknesses
    if (metrics.completionRate < 100) {
      weaknesses.push(`• Incomplete tasks: ${metrics.totalTasks - metrics.completedTasks} task(s) were not completed, indicating potential scope creep or planning issues.`);
    }

    if (metrics.estimationAccuracy > 120) {
      weaknesses.push(`• Underestimation: Tasks took ${(metrics.estimationAccuracy - 100).toFixed(1)}% longer than estimated, suggesting insufficient time allocation or unexpected complexity.`);
    }

    if (metrics.delayedTasksCount > metrics.totalTasks * 0.3) {
      weaknesses.push(`• High delay rate: Over 30% of tasks were delayed, indicating systemic issues with timeline management or resource availability.`);
    }

    if (!metrics.wasOnTime && metrics.daysEarlyOrLate > 7) {
      weaknesses.push(`• Significant deadline miss: Project was ${metrics.daysEarlyOrLate} days late, suggesting major planning or execution issues.`);
    }

    if (tasks.some((t: any) => !t.assignedUser)) {
      const unassignedCount = tasks.filter((t: any) => !t.assignedUser).length;
      weaknesses.push(`• Task assignment: ${unassignedCount} task(s) had no assigned user, which can lead to accountability issues and delays.`);
    }

    // Faults (systemic issues)
    if (metrics.delayedPurchasesCount > 0 && metrics.delayedTasksCount > 0) {
      faults.push(`• Supply chain impact: Late purchases directly contributed to task delays, indicating a need for better supplier relationship management and earlier procurement.`);
    }

    if (estimationVariances.length > 0) {
      const consistentlyOver = estimationVariances.filter((v: any) => v.variancePercent > 20).length;
      if (consistentlyOver > estimationVariances.length * 0.5) {
        faults.push(`• Systematic underestimation: Over 50% of tasks took significantly longer than estimated, indicating a fundamental flaw in the estimation process.`);
      }
    }

    if (metrics.criticalTasksCount > 0) {
      const criticalDelayed = tasks.filter((t: any) => t.isCritical && t.wasDelayed).length;
      if (criticalDelayed > 0) {
        faults.push(`• Critical path failures: ${criticalDelayed} critical path task(s) were delayed, which directly impacted project completion. Critical path tasks require immediate attention when at risk.`);
      }
    }

    if (metrics.totalHours > 0 && metrics.totalActualDays > 0) {
      const avgHoursPerDay = metrics.totalHours / metrics.totalActualDays;
      if (avgHoursPerDay < 4) {
        faults.push(`• Low resource utilization: Average ${avgHoursPerDay.toFixed(1)} hours per day suggests underutilization or inefficient resource allocation.`);
      }
    }

    // Mistakes (specific issues)
    if (!metrics.wasOnTime) {
      mistakes.push(`• Deadline management: Project missed the deadline by ${metrics.daysEarlyOrLate} day(s). Earlier intervention or timeline adjustment could have prevented this.`);
    }

    if (metrics.delayedTasksCount > 0) {
      const mostDelayed = tasks
        .filter((t: any) => t.wasDelayed)
        .map((t: any) => {
          const delay = t.plannedEndDateTime && t.actualEndDateTime
            ? Math.ceil((new Date(t.actualEndDateTime).getTime() - new Date(t.plannedEndDateTime).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return { title: t.title, delay };
        })
        .sort((a: any, b: any) => b.delay - a.delay)[0];
      
      if (mostDelayed) {
        mistakes.push(`• Task delay: "${mostDelayed.title}" was delayed by ${mostDelayed.delay} day(s), which may have cascaded to other dependent tasks.`);
      }
    }

    if (metrics.delayedPurchasesCount > 0) {
      const purchaseDelays = purchases
        .filter((p: any) => p.wasDelayed)
        .map((p: any) => {
          const delay = p.expectedDeliveryDate && p.actualDeliveryDate
            ? Math.ceil((new Date(p.actualDeliveryDate).getTime() - new Date(p.expectedDeliveryDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return { item: p.itemDescription, delay };
        });
      
      purchaseDelays.forEach((p: any) => {
        mistakes.push(`• Procurement delay: "${p.item}" arrived ${p.delay} day(s) late, causing downstream delays.`);
      });
    }

    if (estimationVariances.length > 0) {
      const worstEstimate = estimationVariances
        .sort((a: any, b: any) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))[0];
      
      if (Math.abs(worstEstimate.variancePercent) > 50) {
        mistakes.push(`• Estimation error: Task "${worstEstimate.task}" was estimated at ${worstEstimate.estimated} days but took ${worstEstimate.actual} days (${worstEstimate.variancePercent > 0 ? '+' : ''}${worstEstimate.variancePercent.toFixed(1)}% variance).`);
      }
    }

    // Default messages if nothing found
    if (recommendations.length === 0) {
      recommendations.push('1. Project completed successfully with good performance metrics.');
      recommendations.push('2. Continue current practices and processes.');
    }

    if (weaknesses.length === 0) {
      weaknesses.push('• No significant weaknesses identified in this project.');
    }

    if (faults.length === 0) {
      faults.push('• No systemic faults detected in project execution.');
    }

    if (mistakes.length === 0) {
      mistakes.push('• No major mistakes identified during project execution.');
    }

    return {
      summary,
      recommendations: recommendations.join('\n\n'),
      weaknesses: weaknesses.join('\n\n'),
      faults: faults.join('\n\n'),
      mistakes: mistakes.join('\n\n'),
    };
  }

  /**
   * Save analysis to database
   */
  private async saveAnalysis(
    orderId: string,
    analysis: ProjectAnalysisData,
    rawData: any
  ): Promise<ProjectAnalysisEntity> {
    const dataSource = getDataSource();
    const analysisRepository = dataSource.getRepository(ProjectAnalysisEntity);

    // Check if analysis already exists
    const existing = await analysisRepository.findOne({ where: { orderId } });
    
    const analysisEntity = existing || new ProjectAnalysisEntity();
    analysisEntity.id = existing?.id || uuidv4();
    analysisEntity.orderId = orderId;
    analysisEntity.recommendations = analysis.recommendations;
    analysisEntity.weaknesses = analysis.weaknesses;
    analysisEntity.faults = analysis.faults;
    analysisEntity.mistakes = analysis.mistakes;
    analysisEntity.summary = analysis.summary;
    analysisEntity.rawData = JSON.stringify(rawData);

    await analysisRepository.save(analysisEntity);
    return analysisEntity;
  }

  /**
   * Get existing analysis for an order
   */
  async getAnalysis(orderId: string): Promise<ProjectAnalysisEntity | null> {
    const dataSource = getDataSource();
    const analysisRepository = dataSource.getRepository(ProjectAnalysisEntity);
    return await analysisRepository.findOne({ where: { orderId } });
  }
}
