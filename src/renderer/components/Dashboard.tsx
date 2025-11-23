import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { OrderStatus, OrderPriority, TaskStatus, ProjectStatus } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import './Dashboard.css';

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

interface Task {
  id: string;
  projectId: string;
  orderId?: string;
  title: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  estimatedDays: number;
  milestone: boolean;
}

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
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

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  title: string;
  onOrderClick: (orderId: string) => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, orders, title, onOrderClick }) => {
  if (!isOpen) return null;

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal-header">
          <h2>{title}</h2>
          <button className="order-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="order-modal-list">
          {orders.length === 0 ? (
            <p className="order-modal-empty">No projects found</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="order-modal-item"
                onClick={() => {
                  onOrderClick(order.id);
                  onClose();
                }}
              >
                <div className="order-modal-item-info">
                  <h3>{order.orderNumber}</h3>
                  <p>{order.customerName}</p>
                </div>
                <div className="order-modal-item-meta">
                  <span className="order-modal-priority">{order.priority}</span>
                  <span className="order-modal-deadline">
                    {new Date(order.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineStatuses, setTimelineStatuses] = useState<Map<string, TimelineStatus>>(new Map());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrders, setModalOrders] = useState<Order[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
    fetchTasks();
    fetchProjects();
    fetchDepartments();
  }, []);

  useEffect(() => {
    orders.forEach((order) => {
      fetchTimelineStatus(order.id);
    });
  }, [orders]);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, riskFilter, customerFilter, priorityFilter, timelineStatuses]);

  const fetchOrders = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const fetchProjects = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
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

  const applyFilters = () => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter((o) => {
        const status = timelineStatuses.get(o.id);
        return status?.status === riskFilter;
      });
    }

    // Customer filter
    if (customerFilter) {
      filtered = filtered.filter((o) =>
        o.customerName.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((o) => o.priority === priorityFilter);
    }

    setFilteredOrders(filtered);
  };

  const handleStatusCardClick = (status: string) => {
    let filtered: Order[] = [];
    let title = '';

    if (status === 'on_track' || status === 'at_risk' || status === 'late') {
      filtered = orders.filter((o) => {
        const timelineStatus = timelineStatuses.get(o.id);
        return timelineStatus?.status === status;
      });
      title = `${status.replace('_', ' ').toUpperCase()} Projects (${filtered.length})`;
    } else {
      filtered = orders.filter((o) => o.status === status);
      title = `${status.replace('_', ' ').toUpperCase()} Projects (${filtered.length})`;
    }

    setModalOrders(filtered);
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  // Calculate order stats
  const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED);
  const activeOrders = orders.filter((o) => o.status === OrderStatus.ACTIVE);
  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
  const onHoldOrders = orders.filter((o) => o.status === OrderStatus.ON_HOLD);
  const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED);
  const onTrackOrders = orders.filter((o) => {
    const status = timelineStatuses.get(o.id);
    return status?.status === 'on_track';
  });
  const atRiskOrders = orders.filter((o) => {
    const status = timelineStatuses.get(o.id);
    return status?.status === 'at_risk';
  });
  const lateOrders = orders.filter((o) => {
    const status = timelineStatuses.get(o.id);
    return status?.status === 'late';
  });

  // Calculate KPI stats
  const totalOrders = orders.length; // Total orders regardless of status
  const tasksCompletedToday = tasks.filter((t) => {
    if (t.status !== TaskStatus.COMPLETED) return false;
    const completedDate = new Date(t.endDate);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  }).length;
  
  // Calculate project health score based on orders, tasks, due dates, risks, and completion dates
  const calculateProjectHealthScore = () => {
    if (orders.length === 0) return 0;
    
    const now = new Date();
    let healthScore = 0;
    let totalWeight = 0;
    
    orders.forEach((order) => {
      const orderTasks = tasks.filter((t) => t.orderId === order.id);
      if (orderTasks.length === 0) {
        // Order with no tasks - neutral weight
        totalWeight += 1;
        return;
      }
      
      const deadline = new Date(order.deadline);
      const isOverdue = deadline < now && order.status !== OrderStatus.COMPLETED;
      const isCompleted = order.status === OrderStatus.COMPLETED;
      const timelineStatus = timelineStatuses.get(order.id);
      
      // Calculate task completion rate
      const completedTasks = orderTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
      const completionRate = orderTasks.length > 0 ? completedTasks / orderTasks.length : 0;
      
      // Calculate on-time rate (tasks completed before or on deadline)
      const onTimeTasks = orderTasks.filter((t) => {
        if (t.status !== TaskStatus.COMPLETED) return false;
        const taskEndDate = new Date(t.endDate);
        return taskEndDate <= deadline;
      }).length;
      const onTimeRate = orderTasks.length > 0 ? onTimeTasks / orderTasks.length : 0;
      
      // Calculate risk factor
      let riskFactor = 0;
      if (timelineStatus) {
        if (timelineStatus.status === 'late') riskFactor = 0;
        else if (timelineStatus.status === 'at_risk') riskFactor = 0.5;
        else if (timelineStatus.status === 'on_track') riskFactor = 1;
      }
      
      // Calculate order score
      let orderScore = 0;
      if (isCompleted) {
        orderScore = 1.0; // Completed orders get full score
      } else if (isOverdue) {
        orderScore = 0.2; // Overdue orders get low score
      } else {
        // Weighted combination: completion rate (40%), on-time rate (30%), risk factor (30%)
        orderScore = (completionRate * 0.4) + (onTimeRate * 0.3) + (riskFactor * 0.3);
      }
      
      healthScore += orderScore;
      totalWeight += 1;
    });
    
    return totalWeight > 0 ? Math.round((healthScore / totalWeight) * 100) : 0;
  };

  const projectHealthScore = calculateProjectHealthScore();

  // Calculate task stats for charts
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED);
  const lateTasks = tasks.filter((t) => {
    if (t.status === TaskStatus.COMPLETED) return false;
    const endDate = new Date(t.endDate);
    return endDate < new Date();
  });
  const onTrackTasks = tasks.filter((t) => {
    if (t.status === TaskStatus.COMPLETED) return false;
    const endDate = new Date(t.endDate);
    const daysUntilDeadline = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline > 0 && daysUntilDeadline > t.estimatedDays * 0.2;
  });
  const atRiskTasks = tasks.filter((t) => {
    if (t.status === TaskStatus.COMPLETED) return false;
    const endDate = new Date(t.endDate);
    const daysUntilDeadline = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline > 0 && daysUntilDeadline <= t.estimatedDays * 0.2;
  });
  const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED);

  // Burndown chart data - shows actively worked on tasks (in progress) over last 7 days
  const getBurndownData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Count tasks that are actively being worked on (IN_PROGRESS status)
      const activeTasks = tasks.filter((t) => {
        return t.status === TaskStatus.IN_PROGRESS;
      }).length;
      
      // Count tasks completed on this date
      const completed = tasks.filter((t) => {
        if (t.status !== TaskStatus.COMPLETED) return false;
        const completedDate = new Date(t.endDate);
        return completedDate.toDateString() === date.toDateString();
      }).length;
      
      data.push({ date: dateStr, active: activeTasks, completed });
    }
    
    return data;
  };

  // Department workload data - shows total projects per department
  const getDepartmentWorkloadData = () => {
    const departmentProjects = new Map<string, number>();
    
    // Count total projects per department
    orders.forEach((order) => {
      if (order.departmentId) {
        const current = departmentProjects.get(order.departmentId) || 0;
        departmentProjects.set(order.departmentId, current + 1);
      }
    });
    
    // Return data with total projects
    return Array.from(departmentProjects.entries())
      .map(([deptId, total]) => {
        const dept = departments.find((d) => d.id === deptId);
        return {
          name: dept?.name || 'Unknown',
          total: total,
        };
      })
      .filter((item) => item.total > 0) // Only show departments with projects
      .sort((a, b) => b.total - a.total); // Sort by total projects
  };

  // Chart data with modern gradient colors
  const completedVsLateData = [
    { name: 'Completed', value: completedTasks.length, color: '#10b981' }, // Emerald green
    { name: 'Late', value: lateTasks.length, color: '#ef4444' }, // Bright red
  ];

  // On Track vs At Risk - using projects
  const onTrackVsAtRiskData = [
    { name: 'On Track', value: onTrackOrders.length, color: '#10b981' }, // Emerald green
    { name: 'At Risk', value: atRiskOrders.length, color: '#f59e0b' }, // Amber
  ];

  // Project Status Distribution (changed from Task Status)
  const orderStatusDonutData = [
    { name: 'Pending', value: pendingOrders.length, color: '#64748b' }, // Slate gray
    { name: 'Active', value: activeOrders.length, color: '#3b82f6' }, // Bright blue
    { name: 'Completed', value: completedOrders.length, color: '#10b981' }, // Emerald green
    { name: 'On Hold', value: onHoldOrders.length, color: '#f59e0b' }, // Amber
    { name: 'Cancelled', value: cancelledOrders.length, color: '#ef4444' }, // Bright red
  ];

  const burndownData = getBurndownData();
  const departmentWorkloadData = getDepartmentWorkloadData();

  // Modern gradient color palette
  const COLORS = [
    '#3b82f6', // Bright blue
    '#10b981', // Emerald green
    '#f59e0b', // Amber
    '#ef4444', // Bright red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
  ];

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  const displayName = user?.name && user?.surname ? `${user.name} ${user.surname}` : user?.name || user?.email || 'User';
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard-modern">
      {/* Top Bar - Simplified */}
      <div className="dashboard-topbar">
        <div className="topbar-date">{currentDate}</div>
        <div className="topbar-user">
          <div className="topbar-user-info">
            <div className="topbar-user-name">{displayName}</div>
            <div className="topbar-user-role">{user?.role || 'User'}</div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="dashboard-main">
        {/* KPI Cards */}
        <div className="kpi-section">
          <div className="kpi-card">
            <div className="kpi-icon">●</div>
            <div className="kpi-content">
              <div className="kpi-label">Total Projects</div>
              <div className="kpi-value">{totalOrders}</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">✓</div>
            <div className="kpi-content">
              <div className="kpi-label">Tasks Completed Today</div>
              <div className="kpi-value">{tasksCompletedToday}</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">♥</div>
            <div className="kpi-content">
              <div className="kpi-label">Overall Project Health Efficiency</div>
              <div className="kpi-value">{projectHealthScore}%</div>
            </div>
          </div>
        </div>

        {/* Status Cards - 4x4 Grid */}
        <div className="status-cards-section">
          <h2 className="section-heading">Project Status Overview</h2>
          <div className="status-cards-grid">
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick('on_track')}
              >
                <div className="status-indicator on-track"></div>
                <div className="status-label">ON TRACK</div>
                <div className="status-value">{onTrackOrders.length}</div>
              </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick('at_risk')}
              >
                <div className="status-indicator at-risk"></div>
                <div className="status-label">AT RISK</div>
                <div className="status-value">{atRiskOrders.length}</div>
        </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick('late')}
              >
                <div className="status-indicator late"></div>
                <div className="status-label">LATE</div>
                <div className="status-value">{lateOrders.length}</div>
        </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick(OrderStatus.COMPLETED)}
              >
                <div className="status-indicator completed"></div>
                <div className="status-label">COMPLETED</div>
                <div className="status-value">{completedOrders.length}</div>
              </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick(OrderStatus.ACTIVE)}
              >
                <div className="status-indicator active"></div>
                <div className="status-label">ACTIVE</div>
                <div className="status-value">{activeOrders.length}</div>
              </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick(OrderStatus.PENDING)}
              >
                <div className="status-indicator pending"></div>
                <div className="status-label">PENDING</div>
                <div className="status-value">{pendingOrders.length}</div>
              </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick(OrderStatus.ON_HOLD)}
              >
                <div className="status-indicator on-hold"></div>
                <div className="status-label">ON HOLD</div>
                <div className="status-value">{onHoldOrders.length}</div>
              </div>
              <div 
                className="status-card"
                onClick={() => handleStatusCardClick(OrderStatus.CANCELLED)}
              >
                <div className="status-indicator cancelled"></div>
                <div className="status-label">CANCELLED</div>
                <div className="status-value">{cancelledOrders.length}</div>
              </div>
            </div>
          </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Project Status Distribution */}
          <div className="chart-card">
            <h3 className="chart-title">Project Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <defs>
                  <linearGradient id="pendingGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="activeGradientPie" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="completedGradientPie" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="onHoldGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="cancelledGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <Pie
                  data={orderStatusDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusDonutData.map((entry, index) => {
                    const gradientMap: Record<string, string> = {
                      'Pending': 'url(#pendingGradient)',
                      'Active': 'url(#activeGradientPie)',
                      'Completed': 'url(#completedGradientPie)',
                      'On Hold': 'url(#onHoldGradient)',
                      'Cancelled': 'url(#cancelledGradient)',
                    };
                    return (
                      <Cell key={`cell-${index}`} fill={gradientMap[entry.name] || entry.color} />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1B2A41', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Task Activity Chart - Shows actively worked on tasks */}
          <div className="chart-card">
            <h3 className="chart-title">Task Activity (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1B2A41', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="active" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="url(#activeGradient)" 
                  fillOpacity={0.7} 
                  strokeWidth={2}
                  name="Active Tasks" 
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="url(#completedGradient)" 
                  fillOpacity={0.7} 
                  strokeWidth={2}
                  name="Completed" 
                />
                <defs>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Completed vs Late Tasks */}
          <div className="chart-card">
            <h3 className="chart-title">Completed vs Late Tasks</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={completedVsLateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1B2A41', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }} 
                />
                <defs>
                  <linearGradient id="completedBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="lateBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {completedVsLateData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Completed' ? 'url(#completedBarGradient)' : 'url(#lateBarGradient)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* On Track vs At Risk and Department Workload - Side by Side */}
          <div className="chart-card">
            <h3 className="chart-title">On Track vs At Risk</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <defs>
                  <linearGradient id="onTrackGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="atRiskGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <Pie
                  data={onTrackVsAtRiskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {onTrackVsAtRiskData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'On Track' ? 'url(#onTrackGradient)' : 'url(#atRiskGradient)'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1B2A41', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Department Workload - Total Projects per Department */}
          <div className="chart-card">
            <h3 className="chart-title">Department Projects</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentWorkloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1B2A41', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  formatter={(value: any) => [`${value} projects`, 'Total Projects']}
                />
                <defs>
                  <linearGradient id="departmentBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#2563eb" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <Bar dataKey="total" fill="url(#departmentBarGradient)" radius={[0, 8, 8, 0]}>
                  {departmentWorkloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        orders={modalOrders}
        title={modalTitle}
        onOrderClick={handleOrderClick}
      />
    </div>
  );
};

export default Dashboard;
