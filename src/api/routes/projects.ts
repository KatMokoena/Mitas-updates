import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { ProjectEntity } from '../../database/entities/Project';
import { TaskEntity } from '../../database/entities/Task';
import { PermissionService } from '../../auth/permissions';
import { ProjectService } from '../../services/projectService';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const projectService = new ProjectService();

router.use(authMiddleware);

// Get all projects
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    
    // Admin and Executives can see all projects
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.ADMIN || roleStr === 'ADMIN' || roleStr === UserRole.EXECUTIVES || roleStr === 'EXECUTIVES') {
      const projects = await projectRepository.find({
        order: { createdAt: 'DESC' },
      });
      return res.json(projects);
    }
    
    // For USER and PROJECT_MANAGER roles, filter projects based on access rules
    const allProjects = await projectRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    // Filter projects based on access control
    const accessibleProjects = [];
    for (const project of allProjects) {
      const canAccess = await projectService.canUserAccessProject(
        userId,
        userRole,
        userDepartmentId,
        project.id
      );
      if (canAccess) {
        accessibleProjects.push(project);
      }
    }
    
    res.json(accessibleProjects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access control
    const canAccess = await projectService.canUserAccessProject(
      userId,
      userRole,
      userDepartmentId,
      projectId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view this project.' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    // Automatically set departmentId from the logged-in user's department
    const { departmentId: _, ...projectData } = req.body; // Remove any departmentId from body
    const project = projectRepository.create({
      id: uuidv4(),
      ...projectData,
      departmentId: req.user!.departmentId, // Always use the logged-in user's department
    });
    await projectRepository.save(project);
    res.status(201).json(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: req.params.id } });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    Object.assign(project, req.body);
    await projectRepository.save(project);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    
    // Delete associated tasks
    await taskRepository.delete({ projectId: req.params.id });
    
    // Delete project
    await projectRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get project tasks
router.get('/:id/tasks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const tasks = await taskRepository.find({
      where: { projectId: req.params.id },
      order: { startDate: 'ASC' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;

