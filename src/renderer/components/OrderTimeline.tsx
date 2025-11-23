import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { TaskStatus, OrderStatus, OrderPriority } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './OrderTimeline.css';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  description?: string;
  deadline: string;
  status: OrderStatus;
  priority: OrderPriority;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  isCritical?: boolean;
  slackDays?: number;
  dependencies: string[];
  assignedUserId?: string;
  resourceIds?: string[];
}

interface TimelineData {
  orderId: string;
  deadline: string;
  projectedCompletionDate: string;
  status: 'on_track' | 'at_risk' | 'late';
  daysUntilDeadline: number;
  daysUntilProjectedCompletion: number;
  criticalPathTasks: string[];
  tasks: Task[];
}

const OrderTimeline: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { user } = useAuth();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchTimeline();
    }

    // Auto-refresh every 10 seconds
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (id) {
          fetchTimeline();
        }
      }, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [id, autoRefresh]);

  const fetchOrder = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}/timeline`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}/recalculate`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error('Failed to recalculate timeline:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'on_track':
        return '#27ae60';
      case 'at_risk':
        return '#f39c12';
      case 'late':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getTaskStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.IN_PROGRESS:
        return '#3498db';
      case TaskStatus.COMPLETED:
        return '#27ae60';
      case TaskStatus.BLOCKED:
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return <div className="order-timeline-loading">Loading timeline...</div>;
  }

  if (!order || !timeline) {
    return <div className="order-timeline-error">Order not found</div>;
  }

  const deadline = new Date(order.deadline);
  const projectedCompletion = new Date(timeline.projectedCompletionDate);
  const isOverdue = deadline < new Date() && order.status !== OrderStatus.COMPLETED;

  return (
    <div className="order-timeline">
      <div className="order-timeline-header">
        <Link to="/orders" className="back-link">← Back to Orders</Link>
        <div className="header-content">
          <div>
            <h1>{order.orderNumber}</h1>
            <p className="order-customer">{order.customerName}</p>
            {order.description && <p className="order-description">{order.description}</p>}
          </div>
          <div className="header-actions">
            <button onClick={handleRecalculate} className="btn-secondary">
              Recalculate Timeline
            </button>
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (10s)
            </label>
          </div>
        </div>
      </div>

      <div className="timeline-status-card">
        <div className="status-section">
          <div className="status-item">
            <span className="status-label">Deadline Status:</span>
            <span
              className="status-badge-large"
              style={{ backgroundColor: getStatusColor(timeline.status) }}
            >
              {timeline.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Days Until Deadline:</span>
            <span className={isOverdue ? 'overdue-large' : 'days-large'}>
              {timeline.daysUntilDeadline > 0
                ? `${timeline.daysUntilDeadline} days`
                : `${Math.abs(timeline.daysUntilDeadline)} days overdue`}
            </span>
          </div>
        </div>
        <div className="dates-section">
          <div className="date-item">
            <strong>Target Deadline:</strong>
            <span className={isOverdue ? 'overdue' : ''}>
              {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
            </span>
          </div>
          <div className="date-item">
            <strong>Projected Completion:</strong>
            <span
              className={
                projectedCompletion > deadline ? 'late-projection' : 'on-time-projection'
              }
            >
              {projectedCompletion.toLocaleDateString()}{' '}
              {projectedCompletion.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="timeline-content">
        <div className="tasks-section">
          <h2>Timeline Tasks</h2>
          <div className="tasks-list">
            {timeline.tasks.map((task) => {
              const startDate = new Date(task.startDate);
              const endDate = new Date(task.endDate);
              const isCritical = task.isCritical || timeline.criticalPathTasks.includes(task.id);

              return (
                <div
                  key={task.id}
                  className={`task-item ${isCritical ? 'critical' : ''} ${task.status === TaskStatus.COMPLETED ? 'completed' : ''}`}
                >
                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <div className="task-badges">
                      <span
                        className="task-status-badge"
                        style={{ backgroundColor: getTaskStatusColor(task.status) }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      {isCritical && <span className="critical-badge">CRITICAL PATH</span>}
                      {task.slackDays !== undefined && task.slackDays > 0 && (
                        <span className="slack-badge">{task.slackDays} days slack</span>
                      )}
                    </div>
                  </div>
                  <p className="task-description">{task.description}</p>
                  <div className="task-dates">
                    <div className="date-range">
                      <span className="date-label">Start:</span>
                      <span>{startDate.toLocaleDateString()} {startDate.toLocaleTimeString()}</span>
                    </div>
                    <div className="date-range">
                      <span className="date-label">End:</span>
                      <span>{endDate.toLocaleDateString()} {endDate.toLocaleTimeString()}</span>
                    </div>
                    <div className="duration">
                      Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                  {task.dependencies.length > 0 && (
                    <div className="task-dependencies">
                      <strong>Depends on:</strong> {task.dependencies.length} task(s)
                    </div>
                  )}
                </div>
              );
            })}
            {timeline.tasks.length === 0 && (
              <div className="empty-state">No tasks for this order yet.</div>
            )}
          </div>
        </div>

        <div className="critical-path-section">
          <h2>Critical Path Analysis</h2>
          <div className="critical-path-info">
            <p>
              <strong>{timeline.criticalPathTasks.length}</strong> task(s) on the critical path
            </p>
            <p className="info-text">
              Critical path tasks have zero slack time. Any delay in these tasks will directly
              impact the deadline.
            </p>
            {timeline.criticalPathTasks.length > 0 && (
              <ul className="critical-tasks-list">
                {timeline.tasks
                  .filter((t) => timeline.criticalPathTasks.includes(t.id))
                  .map((task) => (
                    <li key={task.id}>{task.title}</li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;








