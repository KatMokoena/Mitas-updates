import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRouteAccess } from '../hooks/useRouteAccess';
import InvitationsNotification from './InvitationsNotification';
import RequisitionsNotification from './RequisitionsNotification';
import RequisitionStatusNotification from './RequisitionStatusNotification';
import CliftonStrengthsDisplay from './CliftonStrengthsDisplay';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check if window is maximized on mount
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.isMaximized().then((maximized: boolean) => {
        setIsMaximized(maximized);
      }).catch(() => {
        // Not in Electron, ignore
      });

      // Listen for window state changes
      if ((window as any).electronAPI.onWindowMaximized) {
        (window as any).electronAPI.onWindowMaximized(() => {
          setIsMaximized(true);
        });
      }

      if ((window as any).electronAPI.onWindowUnmaximized) {
        (window as any).electronAPI.onWindowUnmaximized(() => {
          setIsMaximized(false);
        });
      }
    }
  }, []);

  const handleRestoreWindow = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.restoreWindow().then(() => {
        // Update state after a short delay to allow window to restore
        setTimeout(() => {
          (window as any).electronAPI.isMaximized().then((maximized: boolean) => {
            setIsMaximized(maximized);
          }).catch(() => {});
        }, 100);
      }).catch((err: any) => {
        console.log('Window restore not available (web mode):', err);
      });
    }
  };
  
  // Check route access for navigation items
  const canAccessDashboard = useRouteAccess('dashboard');
  const canAccessProjects = useRouteAccess('orders');
  const canAccessAllProjectsGantt = useRouteAccess('all-projects-gantt');
  const canAccessUsers = useRouteAccess('users');
  const canAccessSettings = useRouteAccess('settings');

  return (
    <div className="layout">
      {/* Window Control Button - Top Right Corner */}
      {typeof window !== 'undefined' && (window as any).electronAPI && (
        <button 
          className="window-restore-btn"
          onClick={handleRestoreWindow}
          title={isMaximized ? "Restore Window" : "Restore Window"}
          aria-label="Restore Window"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3h10v10H3V3zm1 1v8h8V4H4z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6h6v6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <nav className="sidebar">
        <div className="sidebar-header">
          <img 
            src="/Mitas logo.jpeg" 
            alt="Mitas Logo" 
            className="sidebar-logo"
            onError={(e) => {
              // Fallback if logo not found
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="sidebar-header-text">
            <h2>Mitas IPMP</h2>
            <p className="sidebar-subtitle">Internal Project Management Platform</p>
          </div>
        </div>
        <ul className="nav-menu">
          {canAccessDashboard === true && (
            <li>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
          )}
          {canAccessProjects === true && (
            <>
              <li>
                <Link to="/orders" className={location.pathname.startsWith('/orders') && !location.pathname.startsWith('/orders/tasks') ? 'active' : ''}>
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/orders/tasks" className={location.pathname.startsWith('/orders/tasks') ? 'active' : ''}>
                  Tasks
                </Link>
              </li>
            </>
          )}
          {canAccessAllProjectsGantt === true && (
            <li>
              <Link to="/all-projects-gantt" className={location.pathname === '/all-projects-gantt' ? 'active' : ''}>
                Overview Gantt Chart
              </Link>
            </li>
          )}
          {canAccessUsers === true && (
            <li>
              <Link to="/users" className={location.pathname === '/users' ? 'active' : ''}>
                Users
              </Link>
            </li>
          )}
          {canAccessSettings === true && (
            <li>
              <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
                Settings
              </Link>
            </li>
          )}
        </ul>
        
        {/* CliftonStrengths Display */}
        {user && <CliftonStrengthsDisplay userId={user.id} compact={true} />}
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.name} {user?.surname}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <InvitationsNotification />
          <RequisitionsNotification />
          <RequisitionStatusNotification />
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

