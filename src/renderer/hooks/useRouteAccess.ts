import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export const useRouteAccess = (route: string): boolean | null => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    // Admin always has full access by default, regardless of configuration
    // Handle both uppercase (enum) and lowercase (string) role values
    if (user.role === 'ADMIN' || user.role === 'admin') {
      setHasAccess(true);
      return;
    }

    // Check configuration for non-admin roles
    const checkAccess = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        // Normalize role to uppercase for API call
        const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
        console.log(`Checking route access for role: ${normalizedRole}, route: ${route}`);
        
        const response = await fetch(`${API_BASE_URL}/api/configurations/role/${normalizedRole}`, {
          headers: { 'x-session-id': sessionId || '' },
        });

        if (response.ok) {
          const config = await response.json();
          // Handle allowedRoutes - it might be a string (from simple-array) or array
          let allowedRoutes: string[] = [];
          if (Array.isArray(config.allowedRoutes)) {
            allowedRoutes = config.allowedRoutes;
          } else if (typeof config.allowedRoutes === 'string' && config.allowedRoutes) {
            // Parse simple-array format (comma-separated)
            allowedRoutes = config.allowedRoutes.split(',').filter(r => r.trim());
          }
          
          console.log(`Route access check for "${route}":`, {
            role: user.role,
            allowedRoutes,
            hasAccess: allowedRoutes.includes(route)
          });
          
          // STRICT CHECK: Only allow access if route is explicitly in allowedRoutes
          setHasAccess(allowedRoutes.includes(route));
        } else if (response.status === 404) {
          // No configuration found - deny access (strict security)
          setHasAccess(false);
        } else {
          // Error - deny access to be safe
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Failed to check route access:', error);
        // On error, deny access to be safe
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [user, route]);

  return hasAccess;
};

