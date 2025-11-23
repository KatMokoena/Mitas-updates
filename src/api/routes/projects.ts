import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { ProjectEntity } from '../../database/entities/Project';
import { TaskEntity } from '../../database/entities/Task';
import { PermissionService } from '../../auth/permissions';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();

router.use(authMiddleware);

// Get all projects
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const projects = await projectRepository.find({
      order: { createdAt: 'DESC' },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: req.params.id } });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
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
    const project = projectRepository.create({
      id: uuidv4(),
      ...req.body,
    });
    await projectRepository.save(project);
    res.status(201).json(project);
  } catch (error) {
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

