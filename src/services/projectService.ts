import { getDataSource } from '../database/config';
import { ProjectEntity } from '../database/entities/Project';
import { TaskEntity } from '../database/entities/Task';
import { OrderEntity } from '../database/entities/Order';
import { TaskInvitationEntity } from '../database/entities/TaskInvitation';
import { RequisitionEntity } from '../database/entities/Requisition';
import { Project, Task } from '../shared/types';
import { UserRole } from '../shared/types';

export class ProjectService {
  async getAllProjects(): Promise<Project[]> {
    const repository = getDataSource().getRepository(ProjectEntity);
    return await repository.find();
  }

  async getProjectById(id: string): Promise<Project | null> {
    const repository = getDataSource().getRepository(ProjectEntity);
    return await repository.findOne({ where: { id } });
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const project = repository.create(projectData);
    return await repository.save(project);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const project = await repository.findOne({ where: { id } });
    if (!project) {
      throw new Error('Project not found');
    }
    Object.assign(project, updates);
    return await repository.save(project);
  }

  async deleteProject(id: string): Promise<void> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    
    // Delete associated tasks
    await taskRepository.delete({ projectId: id });
    
    // Delete project
    await repository.delete(id);
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const repository = getDataSource().getRepository(TaskEntity);
    return await repository.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });
  }

  async recalculateTimeline(projectId: string): Promise<void> {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const tasks = await taskRepository.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });

    // Simple dependency resolution - update dates based on dependencies
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();

    const updateTaskDates = (taskId: string): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      // Process dependencies first
      for (const depId of task.dependencies) {
        updateTaskDates(depId);
      }

      // Calculate start date based on dependencies
      let latestEndDate = task.startDate;
      for (const depId of task.dependencies) {
        const depTask = taskMap.get(depId);
        if (depTask && depTask.endDate > latestEndDate) {
          latestEndDate = depTask.endDate;
        }
      }

      // Update task dates if needed
      if (latestEndDate > task.startDate) {
        const daysDiff = Math.ceil((latestEndDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
        task.startDate = new Date(latestEndDate);
        task.endDate = new Date(task.startDate);
        task.endDate.setDate(task.endDate.getDate() + task.estimatedDays);
        taskRepository.save(task);
      }
    };

    // Update all tasks
    for (const task of tasks) {
      updateTaskDates(task.id);
    }
  }

  /**
   * Check if a user can access a project based on department and special access conditions
   * @param userId User ID
   * @param userRole User role
   * @param userDepartmentId User's department ID
   * @param projectId Project ID to check
   * @returns Promise<boolean> - true if user can access the project
   */
  async canUserAccessProject(
    userId: string,
    userRole: UserRole | string,
    userDepartmentId: string | undefined,
    projectId: string
  ): Promise<boolean> {
    // Admin and Executives can access all projects
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.ADMIN || roleStr === 'ADMIN' || roleStr === UserRole.EXECUTIVES || roleStr === 'EXECUTIVES') {
      return true;
    }

    // For USER and PROJECT_MANAGER roles, check restrictions
    if (roleStr !== UserRole.USER && roleStr !== 'USER' && roleStr !== UserRole.PROJECT_MANAGER && roleStr !== 'PROJECT_MANAGER') {
      // Unknown role - deny access
      return false;
    }

    const dataSource = getDataSource();
    const projectRepository = dataSource.getRepository(ProjectEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);
    const orderRepository = dataSource.getRepository(OrderEntity);

    // Get the project
    const project = await projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      return false;
    }

    // Check if project belongs to user's department
    if (project.departmentId && project.departmentId === userDepartmentId) {
      return true;
    }

    // Check if user has access through tasks (assigned, invited, or through order tasks)
    const tasks = await taskRepository.find({ where: { projectId } });
    
    // Check if user is assigned to any task in this project
    const hasAssignedTask = tasks.some(task => task.assignedUserId === userId);
    if (hasAssignedTask) {
      return true;
    }

    // Check if user has been invited to any task in this project
    const invitationRepository = dataSource.getRepository(TaskInvitationEntity);
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length > 0) {
      // Get all invitations for this user
      const allInvitations = await invitationRepository.find({
        where: { inviteeId: userId },
      });
      
      // Check if any invitation is for a task in this project
      const hasInvitation = allInvitations.some(inv => taskIds.includes(inv.taskId));
      if (hasInvitation) {
        return true;
      }
    }

    // Check if user is an approver for any requisition linked to orders that have tasks in this project
    const requisitionRepository = dataSource.getRepository(RequisitionEntity);
    
    // Get all orderIds from tasks in this project
    const orderIds = tasks
      .map(t => t.orderId)
      .filter((id): id is string => id !== undefined && id !== null);
    
    if (orderIds.length > 0) {
      // Check if user is in approverIds for any requisition linked to these orders
      const allRequisitions = await requisitionRepository.find();
      const hasRequisitionAccess = allRequisitions.some(req => {
        if (!orderIds.includes(req.orderId)) return false;
        if (!req.approverIds || req.approverIds.length === 0) return false;
        return req.approverIds.includes(userId);
      });
      
      if (hasRequisitionAccess) {
        return true;
      }
    }

    // No access conditions met
    return false;
  }

  /**
   * Check if a user can access an order based on department and special access conditions
   * @param userId User ID
   * @param userRole User role
   * @param userDepartmentId User's department ID
   * @param orderId Order ID to check
   * @returns Promise<boolean> - true if user can access the order
   */
  async canUserAccessOrder(
    userId: string,
    userRole: UserRole | string,
    userDepartmentId: string | undefined,
    orderId: string
  ): Promise<boolean> {
    // Admin and Executives can access all orders
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.ADMIN || roleStr === 'ADMIN' || roleStr === UserRole.EXECUTIVES || roleStr === 'EXECUTIVES') {
      return true;
    }

    // For USER and PROJECT_MANAGER roles, check restrictions
    if (roleStr !== UserRole.USER && roleStr !== 'USER' && roleStr !== UserRole.PROJECT_MANAGER && roleStr !== 'PROJECT_MANAGER') {
      // Unknown role - deny access
      return false;
    }

    const dataSource = getDataSource();
    const orderRepository = dataSource.getRepository(OrderEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);

    // Get the order
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return false;
    }

    // Check if order belongs to user's department
    if (order.departmentId && order.departmentId === userDepartmentId) {
      return true;
    }

    // Check if user has access through tasks (assigned, invited)
    const tasks = await taskRepository.find({ where: { orderId } });
    
    // Check if user is assigned to any task in this order
    const hasAssignedTask = tasks.some(task => task.assignedUserId === userId);
    if (hasAssignedTask) {
      return true;
    }

    // Check if user has been invited to any task in this order
    const invitationRepository = dataSource.getRepository(TaskInvitationEntity);
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length > 0) {
      // Get all invitations for this user
      const allInvitations = await invitationRepository.find({
        where: { inviteeId: userId },
      });
      
      // Check if any invitation is for a task in this order
      const hasInvitation = allInvitations.some(inv => taskIds.includes(inv.taskId));
      if (hasInvitation) {
        return true;
      }
    }

    // Check if user is an approver for any requisition linked to this order
    const requisitionRepository = dataSource.getRepository(RequisitionEntity);
    const requisitions = await requisitionRepository.find({ where: { orderId } });
    
    const hasRequisitionAccess = requisitions.some(req => {
      if (!req.approverIds || req.approverIds.length === 0) return false;
      return req.approverIds.includes(userId);
    });
    
    if (hasRequisitionAccess) {
      return true;
    }

    // No access conditions met
    return false;
  }
}

