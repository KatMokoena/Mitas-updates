import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

import { API_BASE_URL } from '../config';

interface DashboardData {
  orders: {
    total: number;
    active: number;
    completed: number;
    pending: number;
    onHold: number;
    onTimeRate: number;
    priority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionRate: number;
  };
  timeTracking: {
    totalHours: number;
    hoursLast30Days: number;
    hoursLast7Days: number;
    averageHoursPerDay: number;
  };
  purchases: {
    total: number;
    delayed: number;
    delayRate: number;
  };
  requisitions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
  };
  recentActivity: {
    orders: number;
    tasks: number;
    timeEntries: number;
  };
}

interface TimeByUser {
  userId: string;
  userName: string;
  totalHours: number;
  taskCount: number;
}

interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  totalOrders: number;
  completedOrders: number;
  onTimeOrders: number;
  onTimeRate: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [timeByUser, setTimeByUser] = useState<TimeByUser[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');

      // Fetch overview
      const overviewResponse = await fetch(`${API_BASE_URL}/api/analytics/overview`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (!overviewResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const overviewData = await overviewResponse.json();
      setDashboardData(overviewData);

      // Fetch time by user
      const timeResponse = await fetch(
        `${API_BASE_URL}/api/analytics/time-tracking/by-user?days=${selectedPeriod}`,
        {
          headers: { 'x-session-id': sessionId || '' },
        }
      );

      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        setTimeByUser(timeData.slice(0, 10)); // Top 10 users
      }

      // Fetch department performance
      const deptResponse = await fetch(`${API_BASE_URL}/api/analytics/departments/performance`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartmentPerformance(deptData);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <p>{error || 'Failed to load dashboard data'}</p>
          <button onClick={fetchDashboardData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const orderStatusData = [
    { name: 'Active', value: dashboardData.orders.active, color: '#3b82f6' },
    { name: 'Completed', value: dashboardData.orders.completed, color: '#10b981' },
    { name: 'Pending', value: dashboardData.orders.pending, color: '#f59e0b' },
    { name: 'On Hold', value: dashboardData.orders.onHold, color: '#ef4444' },
  ];

  const priorityData = [
    { name: 'Urgent', value: dashboardData.orders.priority.urgent, color: '#dc2626' },
    { name: 'High', value: dashboardData.orders.priority.high, color: '#f59e0b' },
    { name: 'Medium', value: dashboardData.orders.priority.medium, color: '#3b82f6' },
    { name: 'Low', value: dashboardData.orders.priority.low, color: '#10b981' },
  ];

  const taskStatusData = [
    { name: 'Completed', value: dashboardData.tasks.completed, color: '#10b981' },
    { name: 'In Progress', value: dashboardData.tasks.inProgress, color: '#3b82f6' },
    { name: 'Not Started', value: dashboardData.tasks.notStarted, color: '#64748b' },
  ];

  const requisitionStatusData = [
    { name: 'Approved', value: dashboardData.requisitions.approved, color: '#10b981' },
    { name: 'Pending', value: dashboardData.requisitions.pending, color: '#f59e0b' },
    { name: 'Rejected', value: dashboardData.requisitions.rejected, color: '#ef4444' },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <div className="dashboard-controls">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="period-selector"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchDashboardData} className="btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h3>Total Orders</h3>
            <p className="metric-value">{dashboardData.orders.total}</p>
            <p className="metric-detail">
              {dashboardData.orders.active} active, {dashboardData.orders.completed} completed
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>On-Time Rate</h3>
            <p className="metric-value">{dashboardData.orders.onTimeRate}%</p>
            <p className="metric-detail">
              {dashboardData.orders.completed} completed orders
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📋</div>
          <div className="metric-content">
            <h3>Task Completion</h3>
            <p className="metric-value">{dashboardData.tasks.completionRate}%</p>
            <p className="metric-detail">
              {dashboardData.tasks.completed} of {dashboardData.tasks.total} tasks
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Total Hours</h3>
            <p className="metric-value">{dashboardData.timeTracking.totalHours.toFixed(1)}</p>
            <p className="metric-detail">
              {dashboardData.timeTracking.averageHoursPerDay.toFixed(1)} hrs/day avg
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Active Users</h3>
            <p className="metric-value">{dashboardData.users.active}</p>
            <p className="metric-detail">
              of {dashboardData.users.total} total users
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <h3>Recent Activity</h3>
            <p className="metric-value">{dashboardData.recentActivity.orders + dashboardData.recentActivity.tasks}</p>
            <p className="metric-detail">
              {dashboardData.recentActivity.orders} orders, {dashboardData.recentActivity.tasks} tasks
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Order Status Pie Chart */}
        <div className="chart-card">
          <h3>Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status Pie Chart */}
        <div className="chart-card">
          <h3>Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution Bar Chart */}
        <div className="chart-card">
          <h3>Order Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Tracking by User */}
        {timeByUser.length > 0 && (
          <div className="chart-card">
            <h3>Time Tracking by User (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeByUser} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="userName" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="totalHours" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Department Performance */}
        {departmentPerformance.length > 0 && (
          <div className="chart-card">
            <h3>Department Performance (On-Time Rate)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="departmentName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="onTimeRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Requisition Status */}
        {dashboardData.requisitions.total > 0 && (
          <div className="chart-card">
            <h3>Requisition Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requisitionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {requisitionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => navigate('/orders')} className="btn-primary">
            View All Orders
          </button>
          <button onClick={() => navigate('/projects')} className="btn-primary">
            View All Projects
          </button>
          <button onClick={() => navigate('/tasks')} className="btn-primary">
            View All Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
