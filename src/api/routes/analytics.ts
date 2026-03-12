import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { OrderEntity, OrderStatus } from '../../database/entities/Order';
import { TaskEntity } from '../../database/entities/Task';
import { TimeEntryEntity } from '../../database/entities/TimeEntry';
import { PurchaseEntity } from '../../database/entities/Purchase';
import { RequisitionEntity, RequisitionStatus } from '../../database/entities/Requisition';
import { UserEntity } from '../../database/entities/User';
import { DepartmentEntity } from '../../database/entities/Department';
import { ProjectEntity } from '../../database/entities/Project';

const router = Router();
router.use(authMiddleware);

// Get dashboard overview statistics
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    const orderRepository = getDataSource().getRepository(OrderEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const timeEntryRepository = getDataSource().getRepository(TimeEntryEntity);
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const userRepository = getDataSource().getRepository(UserEntity);
    const projectRepository = getDataSource().getRepository(ProjectEntity);

    // Get all orders (filtered by access)
    let allOrders = await orderRepository.find();
    if (userRole !== 'ADMIN' && userRole !== 'EXECUTIVES') {
      // Filter based on access - simplified for dashboard
      allOrders = allOrders.filter(o => 
        o.createdBy === userId || 
        o.departmentId === userDepartmentId
      );
    }

    // Get all tasks
    let allTasks = await taskRepository.find();
    
    // Get all time entries
    let allTimeEntries = await timeEntryRepository.find();
    
    // Get all purchases
    let allPurchases = await purchaseRepository.find();
    
    // Get all requisitions
    let allRequisitions = await requisitionRepository.find();

    // Calculate metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Order metrics
    const totalOrders = allOrders.length;
    const activeOrders = allOrders.filter(o => o.status === OrderStatus.ACTIVE).length;
    const completedOrders = allOrders.filter(o => o.status === OrderStatus.COMPLETED).length;
    const pendingOrders = allOrders.filter(o => o.status === OrderStatus.PENDING).length;
    const onHoldOrders = allOrders.filter(o => o.status === OrderStatus.ON_HOLD).length;

    // Completed orders with deadline analysis
    const completedOrdersWithDeadline = allOrders.filter(o => 
      o.status === OrderStatus.COMPLETED && o.completedDate && o.deadline
    );
    const onTimeOrders = completedOrdersWithDeadline.filter(o => {
      const completed = new Date(o.completedDate!);
      const deadline = new Date(o.deadline);
      return completed <= deadline;
    }).length;
    const onTimeRate = completedOrdersWithDeadline.length > 0 
      ? (onTimeOrders / completedOrdersWithDeadline.length) * 100 
      : 0;

    // Task metrics
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = allTasks.filter(t => t.status === 'not_started').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Time tracking metrics
    const totalHours = allTimeEntries.reduce((sum, te) => 
      sum + parseFloat(te.durationHours.toString()), 0
    );
    const hoursLast30Days = allTimeEntries
      .filter(te => new Date(te.startTime) >= thirtyDaysAgo)
      .reduce((sum, te) => sum + parseFloat(te.durationHours.toString()), 0);
    const hoursLast7Days = allTimeEntries
      .filter(te => new Date(te.startTime) >= sevenDaysAgo)
      .reduce((sum, te) => sum + parseFloat(te.durationHours.toString()), 0);

    // Purchase metrics
    const totalPurchases = allPurchases.length;
    const delayedPurchases = allPurchases.filter(p => {
      if (p.expectedDeliveryDate && p.actualDeliveryDate) {
        return new Date(p.actualDeliveryDate) > new Date(p.expectedDeliveryDate);
      }
      return false;
    }).length;
    const purchaseDelayRate = totalPurchases > 0 ? (delayedPurchases / totalPurchases) * 100 : 0;

    // Requisition metrics
    const totalRequisitions = allRequisitions.length;
    const pendingRequisitions = allRequisitions.filter(r => r.status === RequisitionStatus.PENDING_APPROVAL).length;
    const approvedRequisitions = allRequisitions.filter(r => r.status === RequisitionStatus.APPROVED).length;
    const rejectedRequisitions = allRequisitions.filter(r => r.status === RequisitionStatus.REJECTED).length;

    // User metrics
    const totalUsers = await userRepository.count();
    const activeUsers = allTimeEntries
      .filter(te => new Date(te.startTime) >= sevenDaysAgo)
      .map(te => te.userId)
      .filter((v, i, a) => a.indexOf(v) === i).length;

    // Recent activity (last 7 days)
    const recentOrders = allOrders.filter(o => 
      new Date(o.createdAt) >= sevenDaysAgo
    ).length;
    const recentTasks = allTasks.filter(t => 
      new Date(t.createdAt) >= sevenDaysAgo
    ).length;
    const recentTimeEntries = allTimeEntries.filter(te => 
      new Date(te.startTime) >= sevenDaysAgo
    ).length;

    // Priority distribution
    const urgentOrders = allOrders.filter(o => o.priority === 'urgent').length;
    const highPriorityOrders = allOrders.filter(o => o.priority === 'high').length;
    const mediumPriorityOrders = allOrders.filter(o => o.priority === 'medium').length;
    const lowPriorityOrders = allOrders.filter(o => o.priority === 'low').length;

    res.json({
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
        pending: pendingOrders,
        onHold: onHoldOrders,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        priority: {
          urgent: urgentOrders,
          high: highPriorityOrders,
          medium: mediumPriorityOrders,
          low: lowPriorityOrders,
        },
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        notStarted: notStartedTasks,
        completionRate: Math.round(taskCompletionRate * 10) / 10,
      },
      timeTracking: {
        totalHours: Math.round(totalHours * 10) / 10,
        hoursLast30Days: Math.round(hoursLast30Days * 10) / 10,
        hoursLast7Days: Math.round(hoursLast7Days * 10) / 10,
        averageHoursPerDay: Math.round((hoursLast7Days / 7) * 10) / 10,
      },
      purchases: {
        total: totalPurchases,
        delayed: delayedPurchases,
        delayRate: Math.round(purchaseDelayRate * 10) / 10,
      },
      requisitions: {
        total: totalRequisitions,
        pending: pendingRequisitions,
        approved: approvedRequisitions,
        rejected: rejectedRequisitions,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      recentActivity: {
        orders: recentOrders,
        tasks: recentTasks,
        timeEntries: recentTimeEntries,
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// Get order status distribution over time
router.get('/orders/status-timeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allOrders = await orderRepository.find({
      order: { createdAt: 'ASC' },
    });
    const orders = allOrders.filter(o => new Date(o.createdAt) >= startDate);

    // Group by date and status
    const timeline: Record<string, Record<string, number>> = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = {
          pending: 0,
          active: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
        };
      }
      timeline[date][order.status] = (timeline[date][order.status] || 0) + 1;
    });

    res.json(timeline);
  } catch (error) {
    console.error('Failed to fetch order status timeline:', error);
    res.status(500).json({ error: 'Failed to fetch order status timeline' });
  }
});

// Get task completion trends
router.get('/tasks/completion-trends', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allTasks = await taskRepository.find();
    const tasks = allTasks.filter(t => new Date(t.createdAt) >= startDate);

    // Group by date
    const trends: Record<string, { created: number; completed: number }> = {};
    tasks.forEach(task => {
      const createdDate = new Date(task.createdAt).toISOString().split('T')[0];
      if (!trends[createdDate]) {
        trends[createdDate] = { created: 0, completed: 0 };
      }
      trends[createdDate].created++;

      if (task.status === 'completed' && task.actualEndDateTime) {
        const completedDate = new Date(task.actualEndDateTime).toISOString().split('T')[0];
        if (!trends[completedDate]) {
          trends[completedDate] = { created: 0, completed: 0 };
        }
        trends[completedDate].completed++;
      }
    });

    res.json(trends);
  } catch (error) {
    console.error('Failed to fetch task completion trends:', error);
    res.status(500).json({ error: 'Failed to fetch task completion trends' });
  }
});

// Get time tracking by user
router.get('/time-tracking/by-user', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeEntryRepository = getDataSource().getRepository(TimeEntryEntity);
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allTimeEntries = await timeEntryRepository.find();
    const timeEntries = allTimeEntries.filter(te => new Date(te.startTime) >= startDate);

    // Group by user
    const userHours: Record<string, { userId: string; userName: string; totalHours: number; taskCount: number }> = {};
    timeEntries.forEach(te => {
      const key = te.userId;
      if (!userHours[key]) {
        userHours[key] = {
          userId: key,
          userName: te.userName ? `${te.userName} ${te.userSurname || ''}`.trim() : 'Unknown',
          totalHours: 0,
          taskCount: 0,
        };
      }
      userHours[key].totalHours += parseFloat(te.durationHours.toString());
      if (te.taskId) {
        userHours[key].taskCount++;
      }
    });

    res.json(Object.values(userHours).sort((a, b) => b.totalHours - a.totalHours));
  } catch (error) {
    console.error('Failed to fetch time tracking by user:', error);
    res.status(500).json({ error: 'Failed to fetch time tracking by user' });
  }
});

// Get department performance
router.get('/departments/performance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    
    const departments = await departmentRepository.find();
    const orders = await orderRepository.find();

    const performance = departments.map(dept => {
      const deptOrders = orders.filter(o => o.departmentId === dept.id);
      const completed = deptOrders.filter(o => o.status === OrderStatus.COMPLETED);
      const onTime = completed.filter(o => {
        if (!o.completedDate || !o.deadline) return false;
        return new Date(o.completedDate) <= new Date(o.deadline);
      });

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalOrders: deptOrders.length,
        completedOrders: completed.length,
        onTimeOrders: onTime.length,
        onTimeRate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
      };
    });

    res.json(performance);
  } catch (error) {
    console.error('Failed to fetch department performance:', error);
    res.status(500).json({ error: 'Failed to fetch department performance' });
  }
});

export default router;
