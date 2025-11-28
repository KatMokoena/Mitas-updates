import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { TaskEntity } from '../../database/entities/Task';
import { OrderEntity } from '../../database/entities/Order';
import { ProjectEntity } from '../../database/entities/Project';
import { PermissionService } from '../../auth/permissions';
import { ProjectService } from '../../services/projectService';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { UserRole } from '../../shared/types';
import { In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const projectService = new ProjectService();
const schedulingEngine = new SchedulingEngine();

router.use(authMiddleware);

// Helper function to check if user can access order (for task operations)
const canUserAccessOrderForTask = async (
  userId: string, 
  userRole: string, 
  userDepartmentId: string | undefined, 
  orderId: string | undefined
): Promise<boolean> => {
  if (!orderId) return true; // No order restriction
  return projectService.canUserAccessOrder(userId, userRole, userDepartmentId, orderId);
};

// Get all tasks
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
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

    let tasks = await taskRepository.find({
      where,
      order: { startDate: 'ASC' },
    });

    // Filter tasks based on order/project access for USER and PROJECT_MANAGER roles
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.USER || roleStr === 'USER' || roleStr === UserRole.PROJECT_MANAGER || roleStr === 'PROJECT_MANAGER') {
      const accessibleTasks = [];
      for (const task of tasks) {
        let canAccess = false;
        
        // If task has orderId, check order access
        if (task.orderId) {
          canAccess = await projectService.canUserAccessOrder(userId, userRole, userDepartmentId, task.orderId);
        }
        // If task has projectId, check project access
        else if (task.projectId) {
          canAccess = await projectService.canUserAccessProject(userId, userRole, userDepartmentId, task.projectId);
        }
        // If task has neither, allow access (shouldn't happen, but be safe)
        else {
          canAccess = true;
        }
        
        if (canAccess) {
          accessibleTasks.push(task);
        }
      }
      tasks = accessibleTasks;
    }

    res.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: req.params.id } });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check access control for USER and PROJECT_MANAGER roles
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.USER || roleStr === 'USER' || roleStr === UserRole.PROJECT_MANAGER || roleStr === 'PROJECT_MANAGER') {
      let canAccess = false;
      
      // If task has orderId, check order access
      if (task.orderId) {
        canAccess = await projectService.canUserAccessOrder(userId, userRole, userDepartmentId, task.orderId);
      }
      // If task has projectId, check project access
      else if (task.projectId) {
        canAccess = await projectService.canUserAccessProject(userId, userRole, userDepartmentId, task.projectId);
      }
      // If task has neither, allow access (shouldn't happen, but be safe)
      else {
        canAccess = true;
      }
      
      if (!canAccess) {
        res.status(403).json({ error: 'Access denied. You do not have permission to view this task.' });
        return;
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task - Department-based access control
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // All users can create tasks in all orders - no restrictions

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

    // All users can edit all tasks - no restrictions

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

    // Check if trying to mark task as completed
    if (req.body.status === 'completed' || (req.body.status === undefined && task.status === 'completed')) {
      // Validate that all dependencies are completed
      if (task.dependencies && task.dependencies.length > 0) {
        const dependencyTasks = await taskRepository.find({
          where: { id: In(task.dependencies) },
        });

        const incompleteDependencies = dependencyTasks.filter(
          (depTask) => depTask.status !== 'completed'
        );

        if (incompleteDependencies.length > 0) {
          const incompleteNames = incompleteDependencies.map((t) => t.title).join(', ');
          return res.status(400).json({
            error: `Cannot complete this task. The following dependent tasks must be completed first: ${incompleteNames}`,
          });
        }
      }
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

    // All users can delete tasks in all orders - no restrictions
    
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

