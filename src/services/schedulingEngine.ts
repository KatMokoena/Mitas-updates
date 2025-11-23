import { getDataSource } from '../database/config';
import { TaskEntity } from '../database/entities/Task';
import { OrderEntity, OrderStatus } from '../database/entities/Order';
import { PurchaseEntity, PurchaseStatus } from '../database/entities/Purchase';
import { ResourceEntity } from '../database/entities/Resource';

export interface TimelineResult {
  orderId: string;
  deadline: Date;
  projectedCompletionDate: Date;
  status: 'on_track' | 'at_risk' | 'late';
  daysUntilDeadline: number;
  daysUntilProjectedCompletion: number;
  criticalPathTasks: string[];
  tasks: Array<{
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    isCritical: boolean;
    slackDays: number;
    status: string;
  }>;
}

export class SchedulingEngine {
  /**
   * Recalculates the timeline for an order based on:
   * - Task dependencies
   * - Resource availability
   * - Purchase delivery dates
   * - Actual completion dates
   */
  async recalculateOrderTimeline(orderId: string): Promise<TimelineResult> {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const resourceRepository = getDataSource().getRepository(ResourceEntity);

    // Get order
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error('Order not found');
    }

    // Get all tasks for this order
    const tasks = await taskRepository.find({
      where: { orderId },
      order: { startDate: 'ASC' },
    });

    // Update order status even when no tasks exist
    await this.updateOrderStatus(order, [], orderRepository);

    if (tasks.length === 0) {
      return {
        orderId,
        deadline: order.deadline,
        projectedCompletionDate: order.deadline,
        status: 'on_track',
        daysUntilDeadline: this.daysBetween(new Date(), order.deadline),
        daysUntilProjectedCompletion: 0,
        criticalPathTasks: [],
        tasks: [],
      };
    }

    // Get purchases for this order
    const purchases = await purchaseRepository.find({
      where: { orderId },
    });

    // Get resources
    const resources = await resourceRepository.find();

    // Build task dependency graph
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const dependencyGraph = this.buildDependencyGraph(tasks);

    // Calculate earliest start and latest end dates for each task
    const calculatedDates = this.calculateTaskDates(
      tasks,
      dependencyGraph,
      purchases,
      resources
    );

    // Update tasks with calculated dates
    for (const [taskId, dates] of calculatedDates.entries()) {
      const task = taskMap.get(taskId);
      if (task) {
        task.startDate = dates.startDate;
        task.endDate = dates.endDate;
        task.plannedStartDateTime = dates.startDate;
        task.plannedEndDateTime = dates.endDate;
        task.isCritical = dates.isCritical;
        task.slackDays = dates.slackDays;
        await taskRepository.save(task);
      }
    }

    // Find critical path (tasks with zero slack)
    const criticalPathTasks = Array.from(calculatedDates.entries())
      .filter(([_, dates]) => dates.isCritical)
      .map(([taskId]) => taskId);

    // Calculate projected completion date (latest end date of all tasks)
    const projectedCompletionDate = new Date(
      Math.max(...Array.from(calculatedDates.values()).map((d) => d.endDate.getTime()))
    );

    // Determine order status
    const now = new Date();
    const daysUntilDeadline = this.daysBetween(now, order.deadline);
    const daysUntilProjectedCompletion = this.daysBetween(now, projectedCompletionDate);

    let status: 'on_track' | 'at_risk' | 'late' = 'on_track';
    // Calculate the difference between projected completion and deadline
    const daysDifference = this.daysBetween(projectedCompletionDate, order.deadline);
    
    if (projectedCompletionDate > order.deadline) {
      // Projected completion is after deadline - definitely late
      status = 'late';
    } else if (daysDifference < 7 && daysDifference >= 0) {
      // Less than 7 days buffer but still on time - at risk
      status = 'at_risk';
    } else if (daysUntilDeadline < 0) {
      // Deadline has already passed
      status = 'late';
    } else {
      // More than 7 days buffer - on track
      status = 'on_track';
    }

    // Automatically update order status based on tasks and deadline
    await this.updateOrderStatus(order, tasks, orderRepository);

    return {
      orderId,
      deadline: order.deadline,
      projectedCompletionDate,
      status,
      daysUntilDeadline,
      daysUntilProjectedCompletion,
      criticalPathTasks,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        startDate: task.startDate,
        endDate: task.endDate,
        isCritical: task.isCritical || false,
        slackDays: task.slackDays || 0,
        status: task.status,
        dependencies: task.dependencies || [],
        assignedUserId: task.assignedUserId,
        resourceIds: task.resourceIds || [],
      })),
    };
  }

  /**
   * Builds a dependency graph from tasks
   */
  private buildDependencyGraph(tasks: TaskEntity[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const task of tasks) {
      graph.set(task.id, task.dependencies || []);
    }
    return graph;
  }

  /**
   * Calculates start/end dates for all tasks considering:
   * - Dependencies
   * - Purchase delivery dates
   * - Resource availability
   */
  private calculateTaskDates(
    tasks: TaskEntity[],
    dependencyGraph: Map<string, string[]>,
    purchases: PurchaseEntity[],
    resources: ResourceEntity[]
  ): Map<string, { startDate: Date; endDate: Date; isCritical: boolean; slackDays: number }> {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const purchaseMap = new Map(
      purchases
        .filter((p) => p.taskId)
        .map((p) => [p.taskId!, p])
    );

    // Forward pass: Calculate earliest start dates
    const earliestStart = new Map<string, Date>();
    const earliestEnd = new Map<string, Date>();
    const visited = new Set<string>();

    const calculateEarliestStart = (taskId: string): Date => {
      if (visited.has(taskId)) {
        return earliestStart.get(taskId) || new Date();
      }
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) {
        return new Date();
      }

      // Start with task's current start date or now
      let earliest = task.startDate || new Date();

      // Check dependencies
      const dependencies = dependencyGraph.get(taskId) || [];
      for (const depId of dependencies) {
        const depEnd = calculateEarliestStart(depId);
        const depTask = taskMap.get(depId);
        if (depTask) {
          const depEndDate = earliestEnd.get(depId) || depTask.endDate;
          if (depEndDate > earliest) {
            earliest = new Date(depEndDate);
            // Add 1 day buffer between tasks
            earliest.setDate(earliest.getDate() + 1);
          }
        }
      }

      // Check purchase delivery dates
      const purchase = purchaseMap.get(taskId);
      if (purchase) {
        const deliveryDate =
          purchase.actualDeliveryDate ||
          purchase.expectedDeliveryDate ||
          new Date();
        if (deliveryDate > earliest) {
          earliest = new Date(deliveryDate);
        }
      }

      earliestStart.set(taskId, earliest);

      // Calculate end date
      const duration = task.estimatedDays || 1;
      const endDate = new Date(earliest);
      endDate.setDate(endDate.getDate() + duration);
      earliestEnd.set(taskId, endDate);

      return earliest;
    };

    // Calculate earliest dates for all tasks
    for (const task of tasks) {
      calculateEarliestStart(task.id);
    }

    // Backward pass: Calculate latest start dates and slack
    const latestStart = new Map<string, Date>();
    const latestEnd = new Map<string, Date>();
    const slackDays = new Map<string, number>();
    const isCritical = new Map<string, boolean>();

    // Find the deadline (latest end date from forward pass)
    const projectEndDate = new Date(
      Math.max(...Array.from(earliestEnd.values()).map((d) => d.getTime()))
    );

    // Calculate latest dates working backwards
    const calculateLatestEnd = (taskId: string): Date => {
      const task = taskMap.get(taskId);
      if (!task) {
        return projectEndDate;
      }

      // Find tasks that depend on this task
      const dependentTasks = Array.from(dependencyGraph.entries())
        .filter(([_, deps]) => deps.includes(taskId))
        .map(([tid]) => tid);

      if (dependentTasks.length === 0) {
        // No dependencies, can end at project end
        latestEnd.set(taskId, projectEndDate);
        latestStart.set(
          taskId,
          new Date(projectEndDate.getTime() - (task.estimatedDays || 1) * 24 * 60 * 60 * 1000)
        );
      } else {
        // Must end before earliest dependent task starts
        const minDependentStart = Math.min(
          ...dependentTasks.map((tid) => {
            const depStart = earliestStart.get(tid);
            return depStart ? depStart.getTime() : projectEndDate.getTime();
          })
        );
        latestEnd.set(taskId, new Date(minDependentStart - 24 * 60 * 60 * 1000)); // 1 day buffer
        latestStart.set(
          taskId,
          new Date(minDependentStart - (task.estimatedDays || 1) * 24 * 60 * 60 * 1000)
        );
      }

      // Calculate slack
      const earliest = earliestStart.get(taskId) || new Date();
      const latest = latestStart.get(taskId) || new Date();
      const slack = Math.max(0, Math.floor((latest.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)));
      slackDays.set(taskId, slack);
      isCritical.set(taskId, slack === 0);

      return latestEnd.get(taskId) || projectEndDate;
    };

    // Calculate latest dates for all tasks
    for (const task of tasks) {
      calculateLatestEnd(task.id);
    }

    // Build result map
    const result = new Map<
      string,
      { startDate: Date; endDate: Date; isCritical: boolean; slackDays: number }
    >();

    for (const task of tasks) {
      result.set(task.id, {
        startDate: earliestStart.get(task.id) || task.startDate,
        endDate: earliestEnd.get(task.id) || task.endDate,
        isCritical: isCritical.get(task.id) || false,
        slackDays: slackDays.get(task.id) || 0,
      });
    }

    return result;
  }

  /**
   * Automatically updates order status based on:
   * - PENDING if no tasks have been added
   * - ACTIVE if tasks are added
   * - COMPLETED if the deadline has passed
   */
  private async updateOrderStatus(
    order: OrderEntity,
    tasks: TaskEntity[],
    orderRepository: any
  ): Promise<void> {
    const now = new Date();
    const deadline = new Date(order.deadline);
    
    // Don't auto-update if order is manually set to ON_HOLD or CANCELLED
    if (order.status === OrderStatus.ON_HOLD || order.status === OrderStatus.CANCELLED) {
      return;
    }

    let newStatus: OrderStatus = order.status;

    // Check if all tasks are completed
    const allTasksCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');
    
    // If deadline has passed OR all tasks are completed, mark as COMPLETED
    if (deadline < now || allTasksCompleted) {
      newStatus = OrderStatus.COMPLETED;
    }
    // If deadline is in the future and order was COMPLETED, change back to appropriate status
    else if (deadline >= now && order.status === OrderStatus.COMPLETED) {
      // If tasks exist, mark as ACTIVE
      if (tasks.length > 0) {
        newStatus = OrderStatus.ACTIVE;
      } else {
        // If no tasks, mark as PENDING
        newStatus = OrderStatus.PENDING;
      }
    }
    // If tasks exist, mark as ACTIVE (unless already COMPLETED)
    else if (tasks.length > 0 && order.status !== OrderStatus.COMPLETED) {
      newStatus = OrderStatus.ACTIVE;
    }
    // If no tasks, mark as PENDING (unless already COMPLETED)
    else if (tasks.length === 0 && order.status !== OrderStatus.COMPLETED) {
      newStatus = OrderStatus.PENDING;
    }

    // Only update if status changed
    if (newStatus !== order.status) {
      order.status = newStatus;
      await orderRepository.save(order);
    }
  }

  /**
   * Calculates days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const diff = date2.getTime() - date1.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if order can meet deadline given current constraints
   */
  async canMeetDeadline(orderId: string): Promise<{ canMeet: boolean; reason?: string }> {
    const timeline = await this.recalculateOrderTimeline(orderId);
    
    if (timeline.projectedCompletionDate > timeline.deadline) {
      return {
        canMeet: false,
        reason: `Projected completion (${timeline.projectedCompletionDate.toLocaleDateString()}) exceeds deadline (${timeline.deadline.toLocaleDateString()})`,
      };
    }

    return { canMeet: true };
  }
}



