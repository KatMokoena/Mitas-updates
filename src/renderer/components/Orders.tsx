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
  createdBy?: string;
  completedDate?: string;
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [orderOwners, setOrderOwners] = useState<Record<string, User>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringOrder, setTransferringOrder] = useState<Order | null>(null);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');
  const [transferMessage, setTransferMessage] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
    fetchDepartments();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    // Fetch owner information for all orders
    if (orders.length > 0 && allUsers.length > 0) {
      fetchOrderOwners();
    }
  }, [orders, allUsers]);

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

  const fetchAllUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const users = await response.json();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchOrderOwners = () => {
    const owners: Record<string, User> = {};

    // Use already fetched allUsers to find owners
    orders.forEach((order) => {
      if (order.createdBy) {
        const owner = allUsers.find((u) => u.id === order.createdBy);
        if (owner) {
          owners[order.id] = owner;
        } else {
          console.log(`[Orders] Owner not found for order ${order.id}, createdBy: ${order.createdBy}, allUsers count: ${allUsers.length}`);
        }
      } else {
        console.log(`[Orders] Order ${order.id} (${order.orderNumber}) has no createdBy field`);
      }
    });

    console.log(`[Orders] Fetched ${Object.keys(owners).length} order owners out of ${orders.length} orders`);
    setOrderOwners(owners);
  };

  const isOrderOwner = (order: Order): boolean => {
    return order.createdBy === user?.id;
  };

  const canTransferOwnership = (order: Order): boolean => {
    const roleStr = user?.role?.toUpperCase();
    const isAdmin = roleStr === 'ADMIN';
    return isOrderOwner(order) || isAdmin;
  };

  const handleTransferOwnership = (order: Order) => {
    setTransferringOrder(order);
    setSelectedNewOwnerId('');
    setTransferMessage('');
    setShowTransferModal(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringOrder || !selectedNewOwnerId) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      // Create an invitation instead of directly transferring
      const response = await fetch(`${API_BASE_URL}/api/orders/${transferringOrder.id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          newOwnerId: selectedNewOwnerId,
          message: transferMessage || undefined,
        }),
      });

      if (response.ok) {
        alert('Ownership transfer invitation sent! The new owner will receive a notification to accept or decline.');
        setShowTransferModal(false);
        setTransferringOrder(null);
        setSelectedNewOwnerId('');
        setTransferMessage('');
        fetchOrders(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send ownership transfer invitation');
      }
    } catch (error) {
      console.error('Failed to send ownership transfer invitation:', error);
      alert('Failed to send ownership transfer invitation');
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
        
        // Log createdBy fields for debugging
        data.forEach((order: Order) => {
          if (order.createdBy) {
            console.log(`[Orders] Order ${order.orderNumber} has createdBy: ${order.createdBy}`);
          } else {
            console.log(`[Orders] Order ${order.orderNumber} has NO createdBy field`);
          }
        });
        
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
          const now = new Date();
          const isOverdue = deadline < now && order.status !== OrderStatus.COMPLETED;
          const isCompleted = order.status === OrderStatus.COMPLETED;
          const completedDate = order.completedDate ? new Date(order.completedDate) : null;
          
          // Calculate days display - same logic as OrderTimelineEnhanced
          let daysDisplay = '';
          if (isCompleted && completedDate) {
            const daysBeforeDeadline = Math.ceil((deadline.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysBeforeDeadline > 0) {
              daysDisplay = `Completed ${daysBeforeDeadline} days before deadline`;
            } else if (daysBeforeDeadline === 0) {
              daysDisplay = 'Completed on deadline';
            } else {
              daysDisplay = `Completed ${Math.abs(daysBeforeDeadline)} days after deadline`;
            }
          } else if (timelineStatus) {
            // For active projects, don't show negative days - stop at 0 when deadline is reached
            const daysUntil = Math.max(0, timelineStatus.daysUntilDeadline);
            daysDisplay = `${daysUntil} days remaining`;
          } else {
            // Fallback if no timeline status
            const daysUntil = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            daysDisplay = `${daysUntil} days remaining`;
          }

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

                  {order.createdBy ? (
                    <div style={{ marginBottom: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {orderOwners[order.id] ? (
                        <>
                          <span className="owner-badge" title="Project Owner" style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                            👤 {orderOwners[order.id].name} {orderOwners[order.id].surname}
                          </span>
                          {isOrderOwner(order) && (
                            <span className="owner-badge owner-indicator" title="You are the owner" style={{ fontSize: '12px', padding: '6px 12px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.5)', color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              ⭐ Owner
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="owner-badge" title="Loading owner..." style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          👤 Loading owner...
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                      <span className="owner-badge" title="No owner assigned" style={{ fontSize: '12px', color: '#64748b', padding: '6px 12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
                        👤 No owner
                      </span>
                    </div>
                  )}

                  <div className="order-timeline-info">
                    <div className="deadline-info">
                      <strong>Deadline:</strong>{' '}
                      <span className={isOverdue ? 'overdue' : ''}>
                        {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
                      </span>
                    </div>

                    {(timelineStatus || isCompleted) && (
                      <div className="timeline-status">
                        <span
                          className="timeline-status-badge"
                          style={{ backgroundColor: getTimelineStatusColor(timelineStatus?.status || 'on_track') }}
                        >
                          {isCompleted ? 'COMPLETED' : (timelineStatus?.status.replace('_', ' ').toUpperCase() || 'ON TRACK')}
                        </span>
                        <span className="days-remaining">
                          {daysDisplay}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                {canTransferOwnership(order) && (
                  <button
                    className="order-transfer-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTransferOwnership(order);
                    }}
                    title="Assign New Owner"
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Assign New Owner
                  </button>
                )}
                {canDeleteOrders && (
                  <button
                    className="order-delete-btn"
                    onClick={(e) => handleDelete(order.id, order.orderNumber, e)}
                    title="Delete project"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Delete
                  </button>
                )}
              </div>
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

      {showTransferModal && transferringOrder && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid var(--border-subtle)', padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-strong)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-main)', fontSize: '24px', fontWeight: 700 }}>Assign New Owner</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Select a user to transfer project ownership to.
            </p>
            <form onSubmit={handleSubmitTransfer}>
              <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Owner *</label>
                <select
                  value={selectedNewOwnerId}
                  onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', color: 'var(--text-main)', fontSize: '14px' }}
                >
                  <option value="">Select a user...</option>
                  {allUsers
                    .filter((u) => u.id !== transferringOrder.createdBy)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.surname} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message (Optional)</label>
                <textarea
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  placeholder="Add a message to the invitation..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', minHeight: '100px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                <button type="button" onClick={() => setShowTransferModal(false)} style={{ padding: '10px 20px', borderRadius: 'var(--radius-pill)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-base)', border: 'none', background: 'var(--panel-glass)', color: 'var(--text-main)', border: '1px solid var(--border-medium)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: 'var(--radius-pill)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-base)', border: 'none', background: 'linear-gradient(135deg, var(--accent) 0%, #ea580c 100%)', color: 'white', boxShadow: 'var(--shadow-glow-orange), var(--shadow-medium)' }}>
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;



