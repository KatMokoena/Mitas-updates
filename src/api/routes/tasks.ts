import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { TaskEntity } from '../../database/entities/Task';
import { OrderEntity } from '../../database/entities/Order';
import { PermissionService } from '../../auth/permissions';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const schedulingEngine = new SchedulingEngine();

router.use(authMiddleware);

// Helper function to check if user can access order (for task operations)
const canUserAccessOrderForTask = async (
  userId: string, 
  userRole: string, 
  userDepartmentId: string | undefined, 
  orderId: string | undefined
): Promise<boolean> => {
  if (!orderId) return true; // Tasks without orders are accessible
  
  // Admin, Project Manager, and Executives always have access
  if (userRole === 'ADMIN' || userRole === 'admin' || 
      userRole === 'PROJECT_MANAGER' || userRole === 'project_manager' ||
      userRole === 'EXECUTIVES' || userRole === 'executives') {
    return true;
  }

  const orderRepository = getDataSource().getRepository(OrderEntity);
  const order = await orderRepository.findOne({ where: { id: orderId } });
  
  if (!order) return false;

  // Check if order belongs to user's department
  if (order.departmentId === userDepartmentId) {
    return true;
  }

  // Check if user is assigned to any task in this order
  const taskRepository = getDataSource().getRepository(TaskEntity);
  const tasks = await taskRepository.find({ where: { orderId } });
  const isAssignedToTask = tasks.some(task => task.assignedUserId === userId);
  
  if (isAssignedToTask) {
    return true;
  }

  // Check if user has accepted an invitation for any task in this order
  const { TaskInvitationEntity, InvitationStatus } = await import('../../database/entities/TaskInvitation');
  const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
  const taskIds = tasks.map(t => t.id);
  if (taskIds.length > 0) {
    // Check for accepted invitations - handle both enum and string values for robustness
    const acceptedInvitations = await invitationRepository.find({
      where: {
        inviteeId: userId,
      },
    });
    // Filter for accepted status (handle both enum value and string)
    const hasAcceptedInvitation = acceptedInvitations.some(inv => {
      const statusStr = String(inv.status).toLowerCase();
      return taskIds.includes(inv.taskId) && 
             (inv.status === InvitationStatus.ACCEPTED || statusStr === 'accepted');
    });
    if (hasAcceptedInvitation) {
      return true;
    }
  }

  return false;
};

// Get all tasks
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const orderId = req.query.orderId as string;
    const projectId = req.query.projectId as string;
    
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const tasks = await taskRepository.find({
      where,
      order: { startDate: 'ASC' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: req.params.id } });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task - Department-based access control
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user can access the order for this task
    const hasAccess = await canUserAccessOrderForTask(
      req.user!.id,
      req.user!.role,
      req.user!.departmentId,
      req.body.orderId
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied. You can only add tasks to orders from your own department or orders where you are assigned to a task.' 
      });
      return;
    }

    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = taskRepository.create({
      id: uuidv4(),
      ...req.body,
    }) as unknown as TaskEntity;
    await taskRepository.save(task);

    // Recalculate timeline if task is linked to an order (this will update order status)
    if (task.orderId) {
      await schedulingEngine.recalculateOrderTimeline(task.orderId);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: req.params.id } });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user can access the order for this task
    const hasAccess = await canUserAccessOrderForTask(
      req.user!.id,
      req.user!.role,
      req.user!.departmentId,
      task.orderId || undefined
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied. You can only edit tasks in orders from your own department or orders where you are assigned to a task.' 
      });
      return;
    }

    // Check permissions
    const canEdit = permissionService.canEditTasks(req.user!.role);
    const canUpdateStatus = permissionService.canUpdateTaskStatus(
      req.user!.role,
      task.assignedUserId === req.user!.id
    );

    if (!canEdit && !canUpdateStatus) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // If user can only update status, restrict changes
    if (!canEdit && canUpdateStatus) {
      const allowedFields = ['status', 'actualDays'];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      Object.assign(task, updateData);
    } else {
      Object.assign(task, req.body);
    }

    await taskRepository.save(task);

    // Recalculate timeline if task is linked to an order
    if (task.orderId) {
      await schedulingEngine.recalculateOrderTimeline(task.orderId);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
// Delete task - Department-based access control
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canEditTasks(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: req.params.id } });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user can access the order for this task
    const hasAccess = await canUserAccessOrderForTask(
      req.user!.id,
      req.user!.role,
      req.user!.departmentId,
      task.orderId || undefined
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied. You can only delete tasks in orders from your own department or orders where you are assigned to a task.' 
      });
      return;
    }
    
    const orderId = task.orderId;
    await taskRepository.delete(req.params.id);
    
    // Recalculate timeline if task was linked to an order (this will update order status)
    if (orderId) {
      await schedulingEngine.recalculateOrderTimeline(orderId);
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

