import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRouteAccess } from '../hooks/useRouteAccess';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  route: string;
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ route, children }) => {
  const { user } = useAuth();
  const hasAccess = useRouteAccess(route);

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // While checking access, show loading
  if (hasAccess === null) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Checking permissions...
      </div>
    );
  }

  // If no access, handle redirect appropriately
  if (hasAccess === false) {
    // If trying to access dashboard and denied, redirect to login
    if (route === 'dashboard') {
      console.warn('Access denied to dashboard, redirecting to login');
      return <Navigate to="/login" replace />;
    }
    // For other routes, try to redirect to dashboard
    // If user doesn't have dashboard access, they'll be redirected to login by the dashboard ProtectedRoute
    return <Navigate to="/" replace />;
  }

  // User has access, render the protected content
  return children;
};

export default ProtectedRoute;


