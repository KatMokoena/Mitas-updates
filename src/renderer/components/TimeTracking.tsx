import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import Timer from './Timer';
import ManualTimeEntry from './ManualTimeEntry';
import ProjectTimeSummary from './ProjectTimeSummary';
import './TimeTracking.css';

interface Project {
  id: string;
  title: string;
  description?: string;
}

const TimeTracking: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return <div className="time-tracking-loading">Loading...</div>;
  }

  if (!projectId || !project) {
    return <div className="time-tracking-error">Project not found</div>;
  }

  // Get orderId from project to navigate back
  const getOrderIdFromProject = async () => {
    // First, try to get orderId from sessionStorage (stored when navigating to time tracking)
    const storedOrderId = sessionStorage.getItem(`timeTracking_orderId_${projectId}`);
    if (storedOrderId) {
      // Verify the order still exists and is accessible
      try {
        const sessionId = localStorage.getItem('sessionId');
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${storedOrderId}`, {
          headers: { 'x-session-id': sessionId || '' },
        });
        if (orderResponse.ok) {
          return storedOrderId;
        } else {
          // Order no longer exists or not accessible, remove from storage
          sessionStorage.removeItem(`timeTracking_orderId_${projectId}`);
        }
      } catch (error) {
        console.error('Failed to verify stored order ID:', error);
        sessionStorage.removeItem(`timeTracking_orderId_${projectId}`);
      }
    }

    // Fallback: try to find orderId from tasks
    try {
      const sessionId = localStorage.getItem('sessionId');
      const tasksResponse = await fetch(`${API_BASE_URL}/api/tasks?projectId=${projectId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        if (tasks.length > 0 && tasks[0].orderId) {
          const orderId = tasks[0].orderId;
          // Verify the order exists and is accessible before navigating
          const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: { 'x-session-id': sessionId || '' },
          });
          if (orderResponse.ok) {
            // Store it for future use
            sessionStorage.setItem(`timeTracking_orderId_${projectId}`, orderId);
            return orderId;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch order ID from tasks:', error);
    }
    return null;
  };

  const handleBack = async () => {
    try {
      const orderId = await getOrderIdFromProject();
      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        // If no valid order found, navigate to orders list
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error navigating back:', error);
      // Fallback to orders list on error
      navigate('/orders');
    }
  };

  return (
    <div className="time-tracking-page">
      <div className="time-tracking-header">
        <button onClick={handleBack} className="back-button">
          ← Back to Project Overview
        </button>
        <h1>Time Tracking - {project.title}</h1>
      </div>

      <div className="time-tracking-content">
        <div className="time-tracking-left">
          <Timer
            key={`timer-${refreshKey}`}
            projectId={projectId}
            onTimerUpdate={handleUpdate}
          />
          <ManualTimeEntry
            key={`manual-${refreshKey}`}
            projectId={projectId}
            onEntryCreated={handleUpdate}
          />
        </div>

        <div className="time-tracking-right">
          <ProjectTimeSummary
            key={`summary-${refreshKey}`}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeTracking;

