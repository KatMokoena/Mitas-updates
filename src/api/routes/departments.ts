import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { DepartmentEntity } from '../../database/entities/Department';
import { PermissionService } from '../../auth/permissions';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();

router.use(authMiddleware);

// Get all departments
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    const departments = await departmentRepository.find({
      order: { name: 'ASC' },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    const department = await departmentRepository.findOne({ where: { id: req.params.id } });
    
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department (requires settings access)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    const department = departmentRepository.create({
      id: uuidv4(),
      ...req.body,
    });
    await departmentRepository.save(department);
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department (requires settings access)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    const department = await departmentRepository.findOne({ where: { id: req.params.id } });
    
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    Object.assign(department, req.body);
    await departmentRepository.save(department);
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (requires settings access)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const departmentRepository = getDataSource().getRepository(DepartmentEntity);
    await departmentRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;


