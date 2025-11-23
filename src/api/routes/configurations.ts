import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { ConfigurationEntity } from '../../database/entities/Configuration';
import { PermissionService } from '../../auth/permissions';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();

router.use(authMiddleware);

// Get all configurations
// Allow users with settings access to view configurations (for the Settings page)
// Modifications (POST/PUT/DELETE) still require admin permissions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  // Allow any authenticated user to view configurations
  // The frontend ProtectedRoute will handle route-level permissions
  try {
    const configRepository = getDataSource().getRepository(ConfigurationEntity);
    const configurations = await configRepository.find({
      order: { createdAt: 'ASC' },
    });
    // Ensure all configurations have permissions field initialized
    // Roles should already be normalized by migration, but ensure consistency
    const configurationsWithPermissions = configurations.map(config => {
      // Ensure role matches canonical enum value
      let normalizedRole = config.role;
      if (typeof config.role === 'string') {
        const roleUpper = config.role.toUpperCase();
        if (roleUpper === 'PROJECT_MANAGER') {
          normalizedRole = UserRole.PROJECT_MANAGER;
        } else if (roleUpper === 'ADMIN') {
          normalizedRole = UserRole.ADMIN;
        } else if (roleUpper === 'USER') {
          normalizedRole = UserRole.USER;
        } else if (roleUpper === 'EXECUTIVES') {
          normalizedRole = UserRole.EXECUTIVES;
        }
      }
      
      // Ensure permissions include all fields with defaults
      let permissionsObj: Record<string, boolean> = {
        canDeleteProjects: false,
        canCreateProjects: false,
        canEditProjects: false,
        canEditTasks: false,
        canDeleteTasks: false,
      };
      
      if (config.permissions) {
        try {
          const parsed = typeof config.permissions === 'string' 
            ? JSON.parse(config.permissions) 
            : config.permissions;
          permissionsObj = { ...permissionsObj, ...parsed };
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
      
      return {
        ...config,
        role: normalizedRole,
        permissions: JSON.stringify(permissionsObj),
      };
    });
    res.json(configurationsWithPermissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get configuration by role
// Allow any authenticated user to view configurations (for checking their own permissions)
router.get('/role/:role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configRepository = getDataSource().getRepository(ConfigurationEntity);
    // Normalize role to canonical enum value
    const roleParam = req.params.role.toUpperCase();
    let requestedRole: UserRole;
    if (roleParam === 'PROJECT_MANAGER') {
      requestedRole = UserRole.PROJECT_MANAGER;
    } else if (roleParam === 'ADMIN') {
      requestedRole = UserRole.ADMIN;
    } else if (roleParam === 'USER') {
      requestedRole = UserRole.USER;
    } else if (roleParam === 'EXECUTIVES') {
      requestedRole = UserRole.EXECUTIVES;
    } else {
      res.status(400).json({ error: `Invalid role: ${req.params.role}. Must be one of: ADMIN, PROJECT_MANAGER, USER, EXECUTIVES` });
      return;
    }
    
    // Find configuration
    const configuration = await configRepository.findOne({
      where: { role: requestedRole },
    });
    
    if (!configuration) {
      console.log(`Configuration not found for role: ${req.params.role} (searched as: ${requestedRole})`);
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    // Normalize allowedRoutes to always be an array
    // TypeORM's simple-array might return as string or array depending on the driver
    let normalizedAllowedRoutes: string[] = [];
    if (Array.isArray(configuration.allowedRoutes)) {
      normalizedAllowedRoutes = configuration.allowedRoutes;
    } else if (typeof configuration.allowedRoutes === 'string') {
      const routesString = configuration.allowedRoutes as string;
      if (routesString.trim() === '') {
        normalizedAllowedRoutes = [];
      } else {
        // Parse comma-separated string
        normalizedAllowedRoutes = routesString.split(',').filter((r: string) => r.trim());
      }
    }

    console.log(`Configuration for role ${requestedRole}:`, {
      allowedRoutes: normalizedAllowedRoutes,
      rawAllowedRoutes: configuration.allowedRoutes,
    });

    // Return normalized configuration
    res.json({
      ...configuration,
      allowedRoutes: normalizedAllowedRoutes,
    });
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Create or update configuration (requires settings access or admin)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  // Admin always has access, otherwise check route access
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'admin';
  const hasAccess = isAdmin || await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions. Only admins or users with settings access can modify configurations.' });
    return;
  }

  try {
    const configRepository = getDataSource().getRepository(ConfigurationEntity);
    const { role, allowedRoutes, permissions } = req.body;

    if (!role) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    // Normalize role - ensure it matches the canonical enum value
    let normalizedRole: UserRole;
    const roleUpper = typeof role === 'string' ? role.toUpperCase() : role;
    if (roleUpper === 'PROJECT_MANAGER') {
      normalizedRole = UserRole.PROJECT_MANAGER;
    } else if (roleUpper === 'ADMIN') {
      normalizedRole = UserRole.ADMIN;
    } else if (roleUpper === 'USER') {
      normalizedRole = UserRole.USER;
    } else if (roleUpper === 'EXECUTIVES') {
      normalizedRole = UserRole.EXECUTIVES;
    } else {
      res.status(400).json({ error: `Invalid role: ${role}. Must be one of: ADMIN, PROJECT_MANAGER, USER, EXECUTIVES` });
      return;
    }

    // Check if configuration exists for this role
    const existing = await configRepository.findOne({
      where: { role: normalizedRole },
    });

    // Handle permissions - merge with existing permissions to preserve all fields
    let permissionsString: string;
    let existingPermissions: Record<string, boolean> = {};
    
    // Parse existing permissions if they exist
    if (existing?.permissions) {
      try {
        existingPermissions = typeof existing.permissions === 'string' 
          ? JSON.parse(existing.permissions) 
          : existing.permissions;
      } catch (e) {
        existingPermissions = {};
      }
    }
    
      // Default permissions structure
      const defaultPermissions = {
        canDeleteProjects: false,
        canCreateProjects: false,
        canEditProjects: false,
        canEditTasks: false,
        canDeleteTasks: false,
      };
    
    if (permissions !== undefined && permissions !== null) {
      if (typeof permissions === 'string') {
        // Already a string, validate it's valid JSON and merge
        try {
          const parsedPermissions = JSON.parse(permissions);
          // Merge with existing permissions, then with defaults
          const mergedPermissions = { ...defaultPermissions, ...existingPermissions, ...parsedPermissions };
          permissionsString = JSON.stringify(mergedPermissions);
        } catch {
          // Invalid JSON, merge existing with defaults
          const mergedPermissions = { ...defaultPermissions, ...existingPermissions };
          permissionsString = JSON.stringify(mergedPermissions);
        }
      } else {
        // It's an object, merge with existing permissions
        const mergedPermissions = { ...defaultPermissions, ...existingPermissions, ...permissions };
        permissionsString = JSON.stringify(mergedPermissions);
      }
    } else if (existing?.permissions) {
      // Keep existing permissions, but ensure all default fields exist
      const mergedPermissions = { ...defaultPermissions, ...existingPermissions };
      permissionsString = JSON.stringify(mergedPermissions);
    } else {
      // Default permissions
      permissionsString = JSON.stringify(defaultPermissions);
    }

    if (existing) {
      // Update existing
      existing.allowedRoutes = Array.isArray(allowedRoutes) ? allowedRoutes : [];
      existing.permissions = permissionsString;
      await configRepository.save(existing);
      res.json(existing);
    } else {
      // Create new
      const configuration = configRepository.create({
        id: uuidv4(),
        role: normalizedRole,
        allowedRoutes: Array.isArray(allowedRoutes) ? allowedRoutes : [],
        permissions: permissionsString,
      });
      await configRepository.save(configuration);
      res.status(201).json(configuration);
    }
  } catch (error) {
    console.error('Failed to save configuration:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Update configuration (requires settings access)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const configRepository = getDataSource().getRepository(ConfigurationEntity);
    const configuration = await configRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!configuration) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    configuration.allowedRoutes = req.body.allowedRoutes || [];
    if (req.body.permissions !== undefined) {
      configuration.permissions = typeof req.body.permissions === 'string' 
        ? req.body.permissions 
        : JSON.stringify(req.body.permissions || {});
    }
    await configRepository.save(configuration);
    res.json(configuration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete configuration (requires settings access)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const hasAccess = await permissionService.hasRouteAccess(req.user!.role, 'settings');
  if (!hasAccess) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const configRepository = getDataSource().getRepository(ConfigurationEntity);
    await configRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

export default router;

