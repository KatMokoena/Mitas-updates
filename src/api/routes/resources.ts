import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { ResourceEntity } from '../../database/entities/Resource';
import { PermissionService } from '../../auth/permissions';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();

router.use(authMiddleware);

// Get all resources
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resourceRepository = getDataSource().getRepository(ResourceEntity);
    const resources = await resourceRepository.find({
      order: { createdAt: 'DESC' },
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Create resource (requires settings access for equipment management)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  // Check if it's equipment type - if so, require settings access
  if (req.body.type === 'equipment') {
    const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
    if (!hasAccess) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
  } else {
    // For other resource types, use existing permission check
    if (!permissionService.canManageResources(req.user!.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
  }

  try {
    const resourceRepository = getDataSource().getRepository(ResourceEntity);
    const resource = resourceRepository.create({
      id: uuidv4(),
      ...req.body,
    });
    await resourceRepository.save(resource);
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// Update resource
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resourceRepository = getDataSource().getRepository(ResourceEntity);
    const resource = await resourceRepository.findOne({ where: { id: req.params.id } });
    
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    // Check if it's equipment type - if so, require settings access
    if (resource.type === 'equipment' || req.body.type === 'equipment') {
      const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
      if (!hasAccess) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
    } else {
      // For other resource types, use existing permission check
      if (!permissionService.canManageResources(req.user!.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
    }

    Object.assign(resource, req.body);
    await resourceRepository.save(resource);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete resource
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resourceRepository = getDataSource().getRepository(ResourceEntity);
    const resource = await resourceRepository.findOne({ where: { id: req.params.id } });
    
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    // Check if it's equipment type - if so, require settings access
    if (resource.type === 'equipment') {
      const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
      if (!hasAccess) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
    } else {
      // For other resource types, use existing permission check
      if (!permissionService.canManageResources(req.user!.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
    }

    await resourceRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;

