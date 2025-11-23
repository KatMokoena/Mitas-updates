import { UserRole } from '../shared/types';
import { getDataSource } from '../database/config';
import { ConfigurationEntity } from '../database/entities/Configuration';

export class PermissionService {
  canManageUsers(role: UserRole | string): boolean {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    return roleStr === UserRole.ADMIN;
  }

  canManageProjects(role: UserRole | string): boolean {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    return roleStr === UserRole.ADMIN || roleStr === UserRole.PROJECT_MANAGER;
  }

  canEditTasks(role: UserRole | string): boolean {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    return roleStr === UserRole.ADMIN || roleStr === UserRole.PROJECT_MANAGER;
  }

  canViewDashboard(role: UserRole): boolean {
    return true; // All roles can view dashboard
  }

  canUpdateTaskStatus(role: UserRole | string, isAssigned: boolean): boolean {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    // Admins and PMs can always update, users can only update if assigned
    return roleStr === UserRole.ADMIN || roleStr === UserRole.PROJECT_MANAGER || isAssigned;
  }

  canManageResources(role: UserRole | string): boolean {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    return roleStr === UserRole.ADMIN || roleStr === UserRole.PROJECT_MANAGER;
  }

  /**
   * Check if a user can create projects based on their role configuration
   * @param role The user's role
   * @returns Promise<boolean> - true if user can create projects, false otherwise
   */
  async canCreateProjects(role: UserRole | string): Promise<boolean> {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    const roleEnum = typeof role === 'string' ? (roleStr as UserRole) : role;
    
    // Admin always has permission to create projects
    if (roleEnum === UserRole.ADMIN || roleStr === UserRole.ADMIN) {
      return true;
    }

    // For non-admin roles, check configuration
    try {
      const configRepository = getDataSource().getRepository(ConfigurationEntity);
      let config = await configRepository.findOne({
        where: { role: roleEnum },
      });
      
      // If not found and we have a string, try finding by string value
      if (!config && typeof role === 'string') {
        const possibleRoles = Object.values(UserRole).filter(r => r.toUpperCase() === roleStr);
        if (possibleRoles.length > 0) {
          config = await configRepository.findOne({
            where: { role: possibleRoles[0] as UserRole },
          });
        }
      }
      
      if (!config) {
        // No configuration found - deny by default (strict security)
        return false;
      }
      
      // If no permissions set, default to false
      if (!config.permissions) {
        return false;
      }
      
      // Parse permissions JSON
      try {
        const permissions = typeof config.permissions === 'string' 
          ? JSON.parse(config.permissions) 
          : config.permissions;
        return permissions.canCreateProjects === true;
      } catch (parseError) {
        // Invalid JSON - deny access
        return false;
      }
    } catch (error) {
      // On error, deny access to be safe
      return false;
    }
  }

  /**
   * Check if a user can delete projects based on their role configuration
   * @param role The user's role
   * @returns Promise<boolean> - true if user can delete projects, false otherwise
   */
  async canDeleteProjects(role: UserRole | string): Promise<boolean> {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    const roleEnum = typeof role === 'string' ? (roleStr as UserRole) : role;
    
    // Admin always has permission to delete projects
    if (roleEnum === UserRole.ADMIN || roleStr === UserRole.ADMIN) {
      return true;
    }

    // For non-admin roles, check configuration
    try {
      const configRepository = getDataSource().getRepository(ConfigurationEntity);
      let config = await configRepository.findOne({
        where: { role: roleEnum },
      });
      
      // If not found and we have a string, try finding by string value
      if (!config && typeof role === 'string') {
        const possibleRoles = Object.values(UserRole).filter(r => r.toUpperCase() === roleStr);
        if (possibleRoles.length > 0) {
          config = await configRepository.findOne({
            where: { role: possibleRoles[0] as UserRole },
          });
        }
      }
      
      if (!config) {
        // No configuration found - deny by default (strict security)
        return false;
      }
      
      // If no permissions set, default to false
      if (!config.permissions) {
        return false;
      }
      
      // Parse permissions JSON
      try {
        const permissions = typeof config.permissions === 'string' 
          ? JSON.parse(config.permissions) 
          : config.permissions;
        return permissions.canDeleteProjects === true;
      } catch (parseError) {
        // Invalid JSON - deny access
        return false;
      }
    } catch (error) {
      // On error, deny access to be safe
      return false;
    }
  }

  // Legacy method names for backward compatibility (deprecated)
  async canCreateOrders(role: UserRole | string): Promise<boolean> {
    return this.canCreateProjects(role);
  }

  async canDeleteOrders(role: UserRole | string): Promise<boolean> {
    return this.canDeleteProjects(role);
  }

  /**
   * Check if a user has access to a specific route based on their role configuration
   * @param role The user's role
   * @param route The route to check (e.g., 'settings', 'users', 'projects')
   * @returns Promise<boolean> - true if user has access, false otherwise
   */
  async hasRouteAccess(role: UserRole | string, route: string): Promise<boolean> {
    // Handle both enum and string values (case-insensitive)
    const roleStr = typeof role === 'string' ? role.toUpperCase() : role;
    const roleEnum = typeof role === 'string' ? (roleStr as UserRole) : role;
    
    // Admin always has full access by default, regardless of configuration
    if (roleEnum === UserRole.ADMIN || roleStr === UserRole.ADMIN) {
      return true;
    }

    // For non-admin roles, check configuration
    try {
      const configRepository = getDataSource().getRepository(ConfigurationEntity);
      // Try to find config with the enum value first, then try string if needed
      let config = await configRepository.findOne({
        where: { role: roleEnum },
      });
      
      // If not found and we have a string, try finding by string value
      if (!config && typeof role === 'string') {
        // Try all possible enum values that match the string
        const possibleRoles = Object.values(UserRole).filter(r => r.toUpperCase() === roleStr);
        if (possibleRoles.length > 0) {
          config = await configRepository.findOne({
            where: { role: possibleRoles[0] as UserRole },
          });
        }
      }
      
      if (!config) {
        // No configuration found - deny access (strict security)
        return false;
      }
      
      // Check if route is in allowedRoutes
      return config.allowedRoutes.includes(route);
    } catch (error) {
      // On error, deny access to be safe
      return false;
    }
  }
}


