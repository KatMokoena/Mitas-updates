import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { TaskEntity } from '../../database/entities/Task';
import { OrderEntity } from '../../database/entities/Order';
import { ProjectEntity } from '../../database/entities/Project';
import { UserEntity } from '../../database/entities/User';
import { PermissionService } from '../../auth/permissions';
import { ProjectService } from '../../services/projectService';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { EmailService } from '../../services/emailService';
import { UserRole } from '../../shared/types';
import { In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const projectService = new ProjectService();
const schedulingEngine = new SchedulingEngine();

let emailServiceInstance: EmailService | null = null;

// Allow email service to be set from server.ts
export function setTasksEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

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
    const userRepository = getDataSource().getRepository(UserEntity);
    
    // Get assigned user info if assignedUserId is provided
    let assignedUserInfo: any = {};
    if (req.body.assignedUserId) {
      try {
        const assignedUser = await userRepository.findOne({ where: { id: req.body.assignedUserId } });
        if (assignedUser) {
          assignedUserInfo = {
            assignedUserName: assignedUser.name || undefined,
            assignedUserSurname: assignedUser.surname || undefined,
            assignedUserEmail: assignedUser.email || undefined,
          };
          console.log(`[Task Creation] Populated assigned user info: ${assignedUser.name} ${assignedUser.surname} (${assignedUser.email})`);
        } else {
          console.warn(`[Task Creation] Assigned user not found for userId: ${req.body.assignedUserId}. User may have been deleted.`);
          // Still set the fields to undefined explicitly to ensure they're in the record
          assignedUserInfo = {
            assignedUserName: undefined,
            assignedUserSurname: undefined,
            assignedUserEmail: undefined,
          };
        }
      } catch (userLookupError) {
        console.error(`[Task Creation] Error looking up assigned user:`, userLookupError);
        // Set to undefined on error
        assignedUserInfo = {
          assignedUserName: undefined,
          assignedUserSurname: undefined,
          assignedUserEmail: undefined,
        };
      }
    } else {
      // No assigned user, explicitly set to undefined
      assignedUserInfo = {
        assignedUserName: undefined,
        assignedUserSurname: undefined,
        assignedUserEmail: undefined,
      };
    }
    
    // Remove any user info fields from req.body to prevent override
    const { assignedUserName: _, assignedUserSurname: __, assignedUserEmail: ___, ...taskData } = req.body;
    
    const task = taskRepository.create({
      id: uuidv4(),
      ...taskData,
      ...assignedUserInfo,
    }) as unknown as TaskEntity;
    
    console.log(`[Task Creation] Creating task:`, {
      title: task.title,
      assignedUserId: task.assignedUserId,
      assignedUserName: task.assignedUserName,
      assignedUserSurname: task.assignedUserSurname,
      assignedUserEmail: task.assignedUserEmail,
    });
    
    const savedTask = await taskRepository.save(task);
    
    // Verify the saved task has the user info
    console.log(`[Task Creation] Task saved. Verifying user info:`, {
      id: savedTask.id,
      assignedUserId: savedTask.assignedUserId,
      assignedUserName: savedTask.assignedUserName,
      assignedUserSurname: savedTask.assignedUserSurname,
      assignedUserEmail: savedTask.assignedUserEmail,
    });

    // Send email notification if task is assigned to a user
    // Check both req.body and task.assignedUserId to handle all cases
    const assignedUserId = req.body.assignedUserId || task.assignedUserId;
    
    // Check if email service is configured
    const isEmailConfigured = emailServiceInstance?.isConfigured() ?? false;
    
    if (isEmailConfigured && assignedUserId) {
      try {
        console.log(`[Task Assignment Email] Task created with assignedUserId: ${assignedUserId}`);
        const userRepository = getDataSource().getRepository(UserEntity);
        const assignee = await userRepository.findOne({ where: { id: assignedUserId } });
        const assigner = await userRepository.findOne({ where: { id: req.user!.id } });
        
        if (!assignee) {
          console.error(`[Task Assignment Email] Assignee not found for userId: ${assignedUserId}`);
        }
        if (!assigner) {
          console.error(`[Task Assignment Email] Assigner not found for userId: ${req.user!.id}`);
        }
        
        if (assignee && assignee.email && assigner && emailServiceInstance) {
          // Get project/order info
          let projectTitle: string | undefined;
          let orderNumber: string | undefined;
          
          if (task.projectId) {
            const projectRepository = getDataSource().getRepository(ProjectEntity);
            const project = await projectRepository.findOne({ where: { id: task.projectId } });
            projectTitle = project?.title;
          }
          
          if (task.orderId) {
            const orderRepository = getDataSource().getRepository(OrderEntity);
            const order = await orderRepository.findOne({ where: { id: task.orderId } });
            orderNumber = order?.orderNumber;
          }
          
          console.log(`[Task Assignment Email] Sending email to ${assignee.email} for task: ${task.title}`);
          await emailServiceInstance.sendTaskAssignmentEmail(
            assignee.email,
            `${assignee.name} ${assignee.surname}`,
            `${assigner.name} ${assigner.surname}`,
            task.title,
            projectTitle,
            orderNumber
          );
          console.log(`[Task Assignment Email] Email sent successfully to ${assignee.email}`);
        } else {
          console.error(`[Task Assignment Email] Missing required data - assignee: ${!!assignee}, assignee.email: ${assignee?.email}, assigner: ${!!assigner}`);
        }
      } catch (emailError) {
        console.error('[Task Assignment Email] Failed to send task assignment email:', emailError);
        // Don't fail the task creation if email fails
      }
    } else {
      if (!emailServiceInstance) {
        console.warn('[Task Assignment Email] Email service instance is not available');
      } else if (!isEmailConfigured) {
        console.warn('[Task Assignment Email] Email service is not configured (no transporter). Check SMTP settings.');
      }
      if (!assignedUserId) {
        console.log('[Task Assignment Email] No assignedUserId provided in task creation');
      }
    }

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

    // Track changes for email notifications
    const previousAssignedUserId = task.assignedUserId;
    const previousStatus = task.status;
    const wasCompleted = previousStatus === 'completed';
    const willBeCompleted = req.body.status === 'completed';

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
      
      // Update assigned user info if assignedUserId changed
      if (req.body.assignedUserId !== undefined && req.body.assignedUserId !== task.assignedUserId) {
        const userRepository = getDataSource().getRepository(UserEntity);
        if (req.body.assignedUserId) {
          const assignedUser = await userRepository.findOne({ where: { id: req.body.assignedUserId } });
          if (assignedUser) {
            task.assignedUserName = assignedUser.name || undefined;
            task.assignedUserSurname = assignedUser.surname || undefined;
            task.assignedUserEmail = assignedUser.email || undefined;
          }
        } else {
          // Clear assigned user info if unassigned
          task.assignedUserName = undefined;
          task.assignedUserSurname = undefined;
          task.assignedUserEmail = undefined;
        }
      }
    }

    await taskRepository.save(task);

    // Send email notifications
    // Check if email service is configured
    const isEmailConfigured = emailServiceInstance?.isConfigured() ?? false;
    
    if (isEmailConfigured) {
      try {
        const userRepository = getDataSource().getRepository(UserEntity);
        
        // Check if task was assigned to a new user
        if (task.assignedUserId && task.assignedUserId !== previousAssignedUserId) {
          const assignee = await userRepository.findOne({ where: { id: task.assignedUserId } });
          const assigner = await userRepository.findOne({ where: { id: req.user!.id } });
          
          if (assignee && assignee.email && assigner) {
            // Get project/order info
            let projectTitle: string | undefined;
            let orderNumber: string | undefined;
            
            if (task.projectId) {
              const projectRepository = getDataSource().getRepository(ProjectEntity);
              const project = await projectRepository.findOne({ where: { id: task.projectId } });
              projectTitle = project?.title;
            }
            
            if (task.orderId) {
              const orderRepository = getDataSource().getRepository(OrderEntity);
              const order = await orderRepository.findOne({ where: { id: task.orderId } });
              orderNumber = order?.orderNumber;
            }
            
            if (emailServiceInstance) {
              await emailServiceInstance.sendTaskAssignmentEmail(
                assignee.email,
                `${assignee.name} ${assignee.surname}`,
                `${assigner.name} ${assigner.surname}`,
                task.title,
                projectTitle,
                orderNumber
              );
            }
          }
        }
        
        // Check if task was just completed
        if (willBeCompleted && !wasCompleted) {
          // Get project/order info
          let projectTitle: string | undefined;
          let orderNumber: string | undefined;
          let projectOwnerId: string | undefined;
          
          if (task.projectId) {
            const projectRepository = getDataSource().getRepository(ProjectEntity);
            const project = await projectRepository.findOne({ where: { id: task.projectId } });
            projectTitle = project?.title;
            projectOwnerId = project?.ownerId;
          }
          
          if (task.orderId) {
            const orderRepository = getDataSource().getRepository(OrderEntity);
            const order = await orderRepository.findOne({ where: { id: task.orderId } });
            orderNumber = order?.orderNumber;
          }
          
          // Send email to task assignee if assigned
          if (task.assignedUserId) {
            const assignee = await userRepository.findOne({ where: { id: task.assignedUserId } });
            
            if (assignee && assignee.email && emailServiceInstance) {
              await emailServiceInstance.sendTaskCompletionEmail(
                assignee.email,
                `${assignee.name} ${assignee.surname}`,
                task.title,
                projectTitle,
                orderNumber
              );
            }
          }
          
          // Send email to project owner if task is part of a project
          if (projectOwnerId && emailServiceInstance) {
            const projectOwner = await userRepository.findOne({ where: { id: projectOwnerId } });
            
            if (projectOwner && projectOwner.email) {
              await emailServiceInstance.sendTaskCompletionEmail(
                projectOwner.email,
                `${projectOwner.name} ${projectOwner.surname}`,
                task.title,
                projectTitle,
                orderNumber
              );
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send task notification emails:', emailError);
        // Don't fail the task update if email fails
      }
    }

    // Recalculate timeline if task is linked to an order
    if (task.orderId) {
      const orderRepository = getDataSource().getRepository(OrderEntity);
      const orderBefore = await orderRepository.findOne({ where: { id: task.orderId } });
      const previousOrderStatus = orderBefore?.status;
      
      await schedulingEngine.recalculateOrderTimeline(task.orderId);
      
      // Check if order was just completed
      if (isEmailConfigured && emailServiceInstance && previousOrderStatus && previousOrderStatus !== 'completed') {
        const orderAfter = await orderRepository.findOne({ where: { id: task.orderId } });
        if (orderAfter && orderAfter.status === 'completed') {
          try {
            // Get all users associated with this order (owner, task assignees)
            const taskRepository = getDataSource().getRepository(TaskEntity);
            const orderTasks = await taskRepository.find({ where: { orderId: task.orderId } });
            const assigneeIds = new Set<string>();
            
            // Add order owner
            if (orderAfter.createdBy) {
              assigneeIds.add(orderAfter.createdBy);
            }
            
            // Add all task assignees
            orderTasks.forEach(t => {
              if (t.assignedUserId) {
                assigneeIds.add(t.assignedUserId);
              }
            });
            
            // Send completion emails to all relevant users
            const userRepository = getDataSource().getRepository(UserEntity);
            for (const userId of assigneeIds) {
              const user = await userRepository.findOne({ where: { id: userId } });
              if (user && user.email && emailServiceInstance) {
                await emailServiceInstance.sendProjectCompletionEmail(
                  user.email,
                  `${user.name} ${user.surname}`,
                  orderAfter.orderNumber,
                  'order',
                  orderAfter.orderNumber
                );
              }
            }
          } catch (emailError) {
            console.error('Failed to send order completion emails:', emailError);
            // Don't fail the task update if email fails
          }
        }
      }
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

    console.log(`[Delete Task] Starting deletion for task ${task.title} (${req.params.id})`);

    // All users can delete tasks in all orders - no restrictions
    
    const orderId = task.orderId;
    
    try {
      await taskRepository.delete(req.params.id);
      console.log(`[Delete Task] Task ${task.title} deleted successfully`);
    } catch (deleteError) {
      console.error('[Delete Task] Error deleting task:', deleteError);
      throw new Error(`Failed to delete task: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    }
    
    // Recalculate timeline if task was linked to an order (this will update order status)
    if (orderId) {
      try {
        await schedulingEngine.recalculateOrderTimeline(orderId);
        console.log(`[Delete Task] Timeline recalculated for order ${orderId}`);
      } catch (timelineError) {
        console.error('[Delete Task] Error recalculating timeline (non-fatal):', timelineError);
        // Don't fail the delete if timeline recalculation fails
      }
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete task:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Failed to delete task' 
        : `Failed to delete task: ${error.message}`;
      res.status(500).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
});

export default router;

