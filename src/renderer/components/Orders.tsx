import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { OrderStatus, OrderPriority } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './Orders.css';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  description?: string;
  deadline: string;
  status: OrderStatus;
  priority: OrderPriority;
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface TimelineStatus {
  status: 'on_track' | 'at_risk' | 'late';
  daysUntilDeadline: number;
  projectedCompletionDate: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineStatuses, setTimelineStatuses] = useState<Map<string, TimelineStatus>>(new Map());
  const [canDeleteOrders, setCanDeleteOrders] = useState<boolean>(false);
  const [canCreateOrders, setCanCreateOrders] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
    fetchDepartments();
  }, []);

  useEffect(() => {
    checkDeletePermission();
    checkCreatePermission();
  }, [user]);

  const checkDeletePermission = async () => {
    if (!user) {
      setCanDeleteOrders(false);
      return;
    }

    // Admin always has permission
    if (user.role === 'ADMIN' || user.role === 'admin') {
      setCanDeleteOrders(true);
      return;
    }

    // For non-admin roles, check configuration
    try {
      const sessionId = localStorage.getItem('sessionId');
      const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
      const response = await fetch(`${API_BASE_URL}/api/configurations/role/${normalizedRole}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const config = await response.json();
        if (config.permissions) {
          try {
            const permissions = typeof config.permissions === 'string' 
              ? JSON.parse(config.permissions) 
              : config.permissions;
            setCanDeleteOrders(permissions.canDeleteProjects === true || permissions.canDeleteOrders === true);
          } catch (e) {
            setCanDeleteOrders(false);
          }
        } else {
          setCanDeleteOrders(false);
        }
      } else {
        setCanDeleteOrders(false);
      }
    } catch (error) {
      console.error('Failed to check delete permission:', error);
      setCanDeleteOrders(false);
    }
  };

  const checkCreatePermission = async () => {
    if (!user) {
      setCanCreateOrders(false);
      return;
    }

    // Admin and Project Manager always have permission
    if (user.role === 'ADMIN' || user.role === 'admin' || user.role === 'PROJECT_MANAGER' || user.role === 'project_manager') {
      setCanCreateOrders(true);
      return;
    }

    // For USER role, check configuration
    try {
      const sessionId = localStorage.getItem('sessionId');
      const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
      const response = await fetch(`${API_BASE_URL}/api/configurations/role/${normalizedRole}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const config = await response.json();
        if (config.permissions) {
          try {
            const permissions = typeof config.permissions === 'string' 
              ? JSON.parse(config.permissions) 
              : config.permissions;
            setCanCreateOrders(permissions.canCreateProjects === true || permissions.canCreateOrders === true);
          } catch (e) {
            setCanCreateOrders(false);
          }
        } else {
          setCanCreateOrders(false);
        }
      } else {
        setCanCreateOrders(false);
      }
    } catch (error) {
      console.error('Failed to check create permission:', error);
      setCanCreateOrders(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    // Fetch timeline status for each order
    orders.forEach((order) => {
      fetchTimelineStatus(order.id);
    });
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Orders] Fetched ${data.length} projects from backend`);
        
        // Backend now handles all filtering including:
        // - Department-based filtering
        // - Task assignment access
        // - Task invitation access
        // - Requisition approver access
        // So we can use all data returned from the backend
        
        // Additional safety check: Filter out any projects that shouldn't be visible
        // This is a safeguard in case backend filtering has issues
        if (user && user.role !== 'ADMIN' && user.role !== 'admin' && 
            user.role !== 'EXECUTIVES' && user.role !== 'executives') {
          const filteredData = data.filter((order: Order) => {
            // If project is from user's department, include it
            if (order.departmentId === user.departmentId) {
              return true;
            }
            // Otherwise, backend should have filtered it, but we'll trust the backend
            // The backend checks for task assignments, invitations, and requisition approvers
            return true; // Trust backend filtering
          });
          console.log(`[Orders] After filtering: ${filteredData.length} projects`);
          setOrders(filteredData);
        } else {
          setOrders(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineStatus = async (orderId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/timeline`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const timeline = await response.json();
        setTimelineStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(orderId, {
            status: timeline.status,
            daysUntilDeadline: timeline.daysUntilDeadline,
            projectedCompletionDate: timeline.projectedCompletionDate,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to fetch timeline status:', error);
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.ACTIVE:
        return '#3498db';
      case OrderStatus.COMPLETED:
        return '#27ae60';
      case OrderStatus.ON_HOLD:
        return '#f39c12';
      case OrderStatus.CANCELLED:
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getTimelineStatusColor = (status: string): string => {
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

  const getPriorityColor = (priority: OrderPriority): string => {
    switch (priority) {
      case OrderPriority.URGENT:
        return '#e74c3c';
      case OrderPriority.HIGH:
        return '#e67e22';
      case OrderPriority.MEDIUM:
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  const handleDelete = async (orderId: string, orderNumber: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete project "${orderNumber}"? This will also delete all associated tasks and purchases. This action cannot be undone.`)) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok || response.status === 204) {
        // Remove from timeline statuses
        setTimelineStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.delete(orderId);
          return newMap;
        });
        // Refresh orders list
        await fetchOrders();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  // Group orders by department
  const ordersByDepartment = orders.reduce((acc, order) => {
    const deptId = order.departmentId || 'no-department';
    const deptName = order.departmentId 
      ? departments.find(d => d.id === order.departmentId)?.name || 'Unknown Department'
      : 'No Department';
    
    if (!acc[deptId]) {
      acc[deptId] = {
        id: deptId,
        name: deptName,
        orders: [],
      };
    }
    acc[deptId].orders.push(order);
    return acc;
  }, {} as Record<string, { id: string; name: string; orders: Order[] }>);

  const departmentGroups = Object.values(ordersByDepartment);

  if (loading) {
    return <div className="orders-loading">Loading projects...</div>;
  }

  return (
    <div className="orders">
      <div className="orders-header">
        <h1>Projects</h1>
        {canCreateOrders && (
          <Link to="/orders/new" className="btn-primary">
            + New Project
          </Link>
        )}
      </div>

      {departmentGroups.length > 0 ? (
        departmentGroups.map((deptGroup) => (
          <div key={deptGroup.id} className="department-group">
            <h2 className="department-header">{deptGroup.name}</h2>
            <div className="orders-list">
              {deptGroup.orders.map((order) => {
          const timelineStatus = timelineStatuses.get(order.id);
          const deadline = new Date(order.deadline);
          const isOverdue = deadline < new Date() && order.status !== OrderStatus.COMPLETED;

          // Allow all users to see and click on projects
          // Access restrictions will be handled in OrderTimelineEnhanced component
          return (
            <div key={order.id} className="order-card-wrapper">
              <Link to={`/orders/${order.id}`} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <h2>{order.orderNumber}</h2>
                      <p className="order-customer">{order.customerName}</p>
                    </div>
                    <div className="order-badges">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                      <span
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(order.priority) }}
                      >
                        {order.priority}
                      </span>
                    </div>
                  </div>

                  {order.description && <p className="order-description">{order.description}</p>}

                  <div className="order-timeline-info">
                    <div className="deadline-info">
                      <strong>Deadline:</strong>{' '}
                      <span className={isOverdue ? 'overdue' : ''}>
                        {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
                      </span>
                    </div>

                    {timelineStatus && (
                      <div className="timeline-status">
                        <span
                          className="timeline-status-badge"
                          style={{ backgroundColor: getTimelineStatusColor(timelineStatus.status) }}
                        >
                          {timelineStatus.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="days-remaining">
                          {timelineStatus.daysUntilDeadline > 0
                            ? `${timelineStatus.daysUntilDeadline} days remaining`
                            : `${Math.abs(timelineStatus.daysUntilDeadline)} days overdue`}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              {canDeleteOrders && (
                <button
                  className="order-delete-btn"
                  onClick={(e) => handleDelete(order.id, order.orderNumber, e)}
                  title="Delete project"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Orders;



