import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { TaskStatus, OrderPriority } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './Tasks.css';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  estimatedDays: number;
  assignedUserId?: string;
  orderId?: string;
  projectId?: string;
  priority?: OrderPriority;
  milestone?: boolean;
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [orders, setOrders] = useState<Map<string, Order>>(new Map());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchOrders();
  }, []);

  const fetchTasks = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        const userMap = new Map<string, User>();
        data.forEach((u: User) => {
          userMap.set(u.id, u);
        });
        setUsers(userMap);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        const orderMap = new Map<string, Order>();
        data.forEach((o: Order) => {
          orderMap.set(o.id, o);
        });
        setOrders(orderMap);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '#2ECC71'; // Green
      case TaskStatus.IN_PROGRESS:
        return '#F39C12'; // Orange
      case TaskStatus.BLOCKED:
        return '#E74C3C'; // Red
      case TaskStatus.NOT_STARTED:
        return '#95A5A6'; // Gray
      default:
        return '#95A5A6';
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'Done';
      case TaskStatus.IN_PROGRESS:
        return 'Working on it';
      case TaskStatus.BLOCKED:
        return 'Stuck';
      case TaskStatus.NOT_STARTED:
        return 'Not started';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority?: OrderPriority): string => {
    switch (priority) {
      case OrderPriority.HIGH:
      case OrderPriority.URGENT:
        return '#9B59B6'; // Purple
      case OrderPriority.MEDIUM:
        return '#3498DB'; // Blue
      case OrderPriority.LOW:
        return '#1ABC9C'; // Light blue
      default:
        return '#95A5A6'; // Gray
    }
  };

  const getPriorityLabel = (priority?: OrderPriority): string => {
    if (!priority) return 'Low';
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getAssignedUser = (task: Task): User | null => {
    if (!task.assignedUserId) return null;
    return users.get(task.assignedUserId) || null;
  };

  const getOrderInfo = (task: Task): Order | null => {
    if (!task.orderId) return null;
    return orders.get(task.orderId) || null;
  };

  const getInitials = (user: User | null): string => {
    if (!user) return '';
    const first = user.name?.charAt(0).toUpperCase() || '';
    const last = user.surname?.charAt(0).toUpperCase() || '';
    return first + last;
  };

  const isOverdue = (task: Task): boolean => {
    if (task.status === TaskStatus.COMPLETED) return false;
    const endDate = new Date(task.endDate);
    return endDate < new Date();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return <div className="tasks-loading">Loading tasks...</div>;
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>Tasks</h1>
        <div className="tasks-count">{tasks.length} tasks</div>
      </div>

      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input type="checkbox" />
              </th>
              <th>Task</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Due date</th>
              <th>Priority</th>
              <th>Notes</th>
              <th>Project Company</th>
              <th>Timeline</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-state">
                  <p>No tasks found. Tasks will appear here when added to projects.</p>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const assignedUser = getAssignedUser(task);
                const order = getOrderInfo(task);
                const overdue = isOverdue(task);

                return (
                  <tr key={task.id} className="task-row">
                    <td className="checkbox-col">
                      <input type="checkbox" />
                    </td>
                    <td className="task-name-col">
                      <div className="task-name-wrapper">
                        <span className="task-title">{task.title}</span>
                        {task.milestone && <span className="milestone-icon">★</span>}
                        {order && (
                          <Link to={`/orders/${task.orderId}`} className="order-link">
                            {order.orderNumber}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="owner-col">
                      {assignedUser ? (
                        <div className="owner-name-wrapper">
                          <div className="user-avatar" title={`${assignedUser.name} ${assignedUser.surname}`}>
                            {getInitials(assignedUser)}
                          </div>
                          <span className="owner-name">{assignedUser.name} {assignedUser.surname}</span>
                        </div>
                      ) : (
                        <div className="user-avatar empty" title="Unassigned">
                          +
                        </div>
                      )}
                    </td>
                    <td className="status-col">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      >
                        {getStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="due-date-col">
                      {task.status === TaskStatus.COMPLETED ? (
                        <span className="due-date completed">✓ {formatDate(task.endDate)}</span>
                      ) : overdue ? (
                        <span className="due-date overdue">⚠ {formatDate(task.endDate)}</span>
                      ) : (
                        <span className="due-date pending">⏰ {formatDate(task.endDate)}</span>
                      )}
                    </td>
                    <td className="priority-col">
                      <span
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="notes-col">
                      {task.description ? (
                        <span className="notes-text" title={task.description}>
                          {task.description.length > 30 ? task.description.substring(0, 30) + '...' : task.description}
                        </span>
                      ) : (
                        <span className="notes-empty">-</span>
                      )}
                    </td>
                    <td className="order-company-col">
                      {order ? (
                        <Link to={`/orders/${task.orderId}`} className="order-company-link">
                          {order.customerName}
                        </Link>
                      ) : (
                        <span className="order-company-empty">-</span>
                      )}
                    </td>
                    <td className="timeline-col">
                      <span className="timeline-badge">
                        {formatDateRange(task.startDate, task.endDate)}
                      </span>
                    </td>
                    <td className="last-updated-col">
                      <div className="last-updated-wrapper">
                        {assignedUser && (
                          <div className="user-avatar small" title={`${assignedUser.name} ${assignedUser.surname}`}>
                            {getInitials(assignedUser)}
                          </div>
                        )}
                        <span className="last-updated-text">Recently</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tasks;

