import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { OrderStatus, OrderPriority, TaskStatus } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './AllProjectsGantt.css';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  deadline: string;
  status: OrderStatus;
  priority: OrderPriority;
}

interface Task {
  id: string;
  orderId?: string;
  title: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  isCritical?: boolean;
}

interface TimelineData {
  orderId: string;
  deadline: string;
  projectedCompletionDate: string;
  status: 'on_track' | 'at_risk' | 'late';
  tasks: Task[];
}

const AllProjectsGantt: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [timelines, setTimelines] = useState<Map<string, TimelineData>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Fetch timeline for each order
    orders.forEach((order) => {
      fetchTimeline(order.id);
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
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (orderId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/timeline`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const timeline = await response.json();
        setTimelines((prev) => {
          const newMap = new Map(prev);
          newMap.set(orderId, timeline);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    }
  };

  // Apply filters
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && order.priority !== priorityFilter) return false;
    if (customerFilter && !order.customerName.toLowerCase().includes(customerFilter.toLowerCase())) return false;
    if (riskFilter !== 'all') {
      const timeline = timelines.get(order.id);
      if (!timeline || timeline.status !== riskFilter) return false;
    }
    return true;
  });

  // Get all tasks from filtered orders
  const allTasks: Array<Task & { orderNumber: string; customerName: string }> = [];
  filteredOrders.forEach((order) => {
    const timeline = timelines.get(order.id);
    if (timeline && timeline.tasks) {
      timeline.tasks.forEach((task) => {
        allTasks.push({
          ...task,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
        });
      });
    }
  });

  // Calculate date range for Gantt chart
  const allDates = allTasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)]);
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

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

  const getTaskRiskColor = (task: Task, timeline?: TimelineData): string => {
    if (task.status === TaskStatus.COMPLETED) return '#27ae60';
    if (task.isCritical) return '#e74c3c';
    if (timeline && timeline.status === 'at_risk') return '#f39c12';
    return '#3498db';
  };

  if (loading) {
    return <div className="all-projects-gantt-loading">Loading...</div>;
  }

  return (
    <div className="all-projects-gantt">
      <div className="gantt-header">
        <h1>Overview Gantt Chart</h1>
        <p className="gantt-subtitle">View all project timelines in one consolidated Gantt chart</p>
      </div>

      <div className="gantt-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value={OrderStatus.PENDING}>Pending</option>
            <option value={OrderStatus.ACTIVE}>Active</option>
            <option value={OrderStatus.ON_HOLD}>On Hold</option>
            <option value={OrderStatus.COMPLETED}>Completed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority:</label>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All</option>
            <option value={OrderPriority.LOW}>Low</option>
            <option value={OrderPriority.MEDIUM}>Medium</option>
            <option value={OrderPriority.HIGH}>High</option>
            <option value={OrderPriority.URGENT}>Urgent</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Customer:</label>
          <input
            type="text"
            placeholder="Filter by customer..."
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Risk Level:</label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="late">Late</option>
          </select>
        </div>
      </div>

      <div className="gantt-container">
        {allTasks.length > 0 ? (
          <div className="gantt-chart-all">
            {/* Date axis */}
            <div className="gantt-date-axis">
              <div className="gantt-date-axis-label" style={{ width: '300px', flexShrink: 0 }}></div>
              <div className="gantt-date-axis-container">
                {(() => {
                  const dateLabels: JSX.Element[] = [];
                  const numLabels = Math.min(12, Math.max(5, Math.ceil(totalDays / 7)));
                  for (let i = 0; i <= numLabels; i++) {
                    const date = new Date(minDate);
                    date.setDate(date.getDate() + Math.floor((totalDays / numLabels) * i));
                    const leftPercent = ((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
                    dateLabels.push(
                      <div
                        key={i}
                        className="gantt-date-marker"
                        style={{ left: `${leftPercent}%` }}
                      >
                        <div className="gantt-date-line"></div>
                        <div className="gantt-date-text">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  }
                  return dateLabels;
                })()}
              </div>
            </div>
            {/* Group tasks by order */}
            {Array.from(new Set(allTasks.map((t) => t.orderNumber))).map((orderNumber, orderIndex) => {
              const orderTasks = allTasks.filter((t) => t.orderNumber === orderNumber);
              const order = filteredOrders.find((o) => o.orderNumber === orderNumber);
              const timeline = order ? timelines.get(order.id) : undefined;

              return (
                <div key={orderNumber} className="gantt-order-group" data-order-index={orderIndex}>
                  <div className="gantt-order-header">
                    <div className="order-label">
                      <strong>{orderNumber}</strong>
                      <span className="order-customer">{order?.customerName}</span>
                      {timeline && (
                        <span
                          className="order-risk-badge"
                          style={{ backgroundColor: getStatusColor(timeline.status) }}
                        >
                          {timeline.status.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  {orderTasks.map((task) => {
                    const startDate = new Date(task.startDate);
                    const endDate = new Date(task.endDate);
                    const daysFromStart = Math.ceil((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                    const taskDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                    const leftPercent = (daysFromStart / totalDays) * 100;
                    const widthPercent = (taskDuration / totalDays) * 100;
                    const riskColor = getTaskRiskColor(task, timeline);

                    return (
                      <div key={task.id} className="gantt-task-row">
                        <div className="gantt-task-label">
                          <span className="task-name">{task.title}</span>
                          <span
                            className="task-status-badge"
                            style={{ backgroundColor: getTaskStatusColor(task.status) }}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.isCritical && <span className="critical-flag">CRITICAL</span>}
                        </div>
                        <div className="gantt-bar-container">
                          <div
                            className={`gantt-bar ${task.isCritical ? 'critical' : ''} ${
                              task.status === TaskStatus.COMPLETED ? 'completed' : ''
                            }`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(2, widthPercent)}%`,
                              backgroundColor: riskColor,
                            }}
                            title={`${task.title}\n${orderNumber} - ${order?.customerName}\n${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\nStatus: ${task.status}`}
                          >
                            <span className="gantt-bar-text">{task.title}</span>
                            <span className="gantt-bar-dates">
                              {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No tasks to display. Create projects and add tasks to see them in the timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProjectsGantt;



