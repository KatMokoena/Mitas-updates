import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import Orders from './components/Orders';
import OrderTimelineEnhanced from './components/OrderTimelineEnhanced';
import CreateOrder from './components/CreateOrder';
import Tasks from './components/Tasks';
import AllProjectsGantt from './components/AllProjectsGantt';
import Settings from './components/Settings';
import TimeTracking from './components/TimeTracking';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthContext } from './context/AuthContext';
import { API_BASE_URL } from './config';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: string;
  departmentId?: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App mounting, checking session...');
    // Check for existing session
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      console.log('Found session ID, verifying...');
      // Verify session is still valid (with timeout)
      const timeoutId = setTimeout(() => {
        console.log('Session check timeout, clearing stale session');
        // Clear stale session data on timeout
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        setLoading(false);
      }, 5000); // Increased timeout to 5 seconds

      fetch(`${API_BASE_URL || ''}/api/projects`, {
        headers: { 'x-session-id': sessionId },
      })
        .then(res => {
          clearTimeout(timeoutId);
          console.log('Session check response:', res.status);
          if (res.ok) {
            // Session is valid, restore user from localStorage
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                console.log('User restored from localStorage');
              } catch (e) {
                console.error('Failed to parse user data:', e);
                // Clear corrupted data
                localStorage.removeItem('sessionId');
                localStorage.removeItem('user');
              }
            } else {
              // No user data found, clear session
              console.log('No user data found, clearing session');
              localStorage.removeItem('sessionId');
            }
          } else if (res.status === 401) {
            // Session is invalid (server restarted or session expired)
            console.log('Session invalid (401), clearing...');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('user');
          } else {
            // Other error - don't clear session, might be temporary
            console.log('Session check returned non-401 error, keeping session');
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              try {
                setUser(JSON.parse(savedUser));
              } catch (e) {
                localStorage.removeItem('user');
              }
            }
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('Session check failed:', error);
          // Network error - don't clear session, might be temporary server issue
          // But also don't restore user if server is down
          // User will need to login again when server is back
        })
        .finally(() => {
          console.log('Session check complete');
          setLoading(false);
        });
    } else {
      console.log('No session found');
      // Ensure user data is also cleared if no session
      localStorage.removeItem('user');
      setLoading(false);
    }
  }, []);

  const handleLogin = (sessionId: string, userData: User) => {
    // Clear any old/stale data first
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    
    // Store new session data
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Maximize window on login (if Electron API is available)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.maximizeWindow().catch((err: any) => {
        console.log('Window maximize not available (web mode):', err);
      });
    }
  };

  const handleLogout = useCallback(async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    // First, check for and stop any running timer
    if (sessionId) {
      try {
        // Check for running timer
        const timerResponse = await fetch(`${API_BASE_URL || ''}/api/time-tracking/timer/running`, {
          headers: { 'x-session-id': sessionId },
        });
        
        if (timerResponse.ok) {
          const runningTimer = await timerResponse.json();
          if (runningTimer && runningTimer.id) {
            // Stop the running timer before logout
            try {
              await fetch(`${API_BASE_URL || ''}/api/time-tracking/timer/stop`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-session-id': sessionId,
                },
                body: JSON.stringify({ timeEntryId: runningTimer.id }),
              });
              console.log('Running timer stopped on logout');
            } catch (timerError) {
              console.error('Failed to stop timer on logout:', timerError);
              // Continue with logout even if timer stop fails
            }
          }
        }
      } catch (error) {
        console.error('Error checking for running timer on logout:', error);
        // Continue with logout even if timer check fails
      }
    }
    
    // Now proceed with normal logout
    if (sessionId) {
      // Try to logout on server, but don't wait for it
      fetch(`${API_BASE_URL || ''}/api/auth/logout`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId },
      })
        .then(() => console.log('Logout successful on server'))
        .catch(err => console.error('Logout request failed:', err));
    }
    // Always clear local storage regardless of server response
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    // Clear any other app-specific data that might be stored
    // This ensures a clean state for next login
    setUser(null);
  }, []);

  // Periodic session validation when user is logged in
  useEffect(() => {
    if (!user) return;

    // Validate session every 5 minutes to catch server restarts
    const intervalId = setInterval(() => {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        fetch(`${API_BASE_URL || ''}/api/projects`, {
          headers: { 'x-session-id': sessionId },
        })
          .then(res => {
            if (res.status === 401) {
              // Session expired (server restarted), logout user
              console.log('Session expired during periodic check, logging out');
              handleLogout();
            }
          })
          .catch(err => {
            // Network error - don't logout, might be temporary
            console.error('Session validation failed:', err);
          });
      } else {
        // No session ID found, logout
        handleLogout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [user, handleLogout]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser: handleLogin, logout: handleLogout }}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<ProtectedRoute route="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="orders" element={<ProtectedRoute route="orders"><Orders /></ProtectedRoute>} />
            <Route path="orders/new" element={<ProtectedRoute route="orders"><CreateOrder /></ProtectedRoute>} />
            <Route path="orders/tasks" element={<ProtectedRoute route="tasks"><Tasks /></ProtectedRoute>} />
            <Route path="orders/:id" element={<ProtectedRoute route="orders"><OrderTimelineEnhanced /></ProtectedRoute>} />
            <Route path="all-projects-gantt" element={<ProtectedRoute route="all-projects-gantt"><AllProjectsGantt /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute route="users"><Users /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute route="settings"><Settings /></ProtectedRoute>} />
            <Route path="projects/:projectId/time-tracking" element={<ProtectedRoute route="orders"><TimeTracking /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

// Electron API declarations removed for web app

export default App;

