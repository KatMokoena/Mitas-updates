# Dashboard API Guide

## Overview

The IPMP system provides comprehensive APIs that can be used to build powerful dashboards and visualizations. This guide shows you what data is available and how to use it.

## Available API Endpoints

### 1. Dashboard Overview
**GET** `/api/analytics/overview`

Returns comprehensive overview statistics including:
- Order metrics (total, active, completed, on-time rate, priority distribution)
- Task metrics (total, completed, in-progress, completion rate)
- Time tracking metrics (total hours, last 30/7 days, average per day)
- Purchase metrics (total, delayed, delay rate)
- Requisition metrics (total, pending, approved, rejected)
- User metrics (total, active)
- Recent activity (last 7 days)

**Example Response:**
```json
{
  "orders": {
    "total": 45,
    "active": 12,
    "completed": 28,
    "pending": 3,
    "onHold": 2,
    "onTimeRate": 85.7,
    "priority": {
      "urgent": 5,
      "high": 12,
      "medium": 20,
      "low": 8
    }
  },
  "tasks": {
    "total": 234,
    "completed": 180,
    "inProgress": 35,
    "notStarted": 19,
    "completionRate": 76.9
  },
  "timeTracking": {
    "totalHours": 1245.5,
    "hoursLast30Days": 456.2,
    "hoursLast7Days": 98.5,
    "averageHoursPerDay": 14.1
  }
}
```

### 2. Order Status Timeline
**GET** `/api/analytics/orders/status-timeline?days=30`

Returns order status distribution over time.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Example Response:**
```json
{
  "2024-01-15": {
    "pending": 2,
    "active": 5,
    "completed": 3,
    "on_hold": 1,
    "cancelled": 0
  },
  "2024-01-16": {
    "pending": 1,
    "active": 6,
    "completed": 4,
    "on_hold": 0,
    "cancelled": 0
  }
}
```

### 3. Task Completion Trends
**GET** `/api/analytics/tasks/completion-trends?days=30`

Returns task creation and completion trends over time.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Example Response:**
```json
{
  "2024-01-15": {
    "created": 12,
    "completed": 8
  },
  "2024-01-16": {
    "created": 15,
    "completed": 10
  }
}
```

### 4. Time Tracking by User
**GET** `/api/analytics/time-tracking/by-user?days=30`

Returns time tracking statistics grouped by user.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Example Response:**
```json
[
  {
    "userId": "uuid-1",
    "userName": "John Doe",
    "totalHours": 120.5,
    "taskCount": 15
  },
  {
    "userId": "uuid-2",
    "userName": "Jane Smith",
    "totalHours": 98.2,
    "taskCount": 12
  }
]
```

### 5. Department Performance
**GET** `/api/analytics/departments/performance`

Returns performance metrics by department.

**Example Response:**
```json
[
  {
    "departmentId": "uuid-1",
    "departmentName": "Engineering",
    "totalOrders": 25,
    "completedOrders": 20,
    "onTimeOrders": 18,
    "onTimeRate": 90.0
  },
  {
    "departmentId": "uuid-2",
    "departmentName": "Operations",
    "totalOrders": 15,
    "completedOrders": 12,
    "onTimeOrders": 10,
    "onTimeRate": 83.3
  }
]
```

## Other Available APIs

### Orders
- **GET** `/api/orders` - Get all orders
- **GET** `/api/orders/:id` - Get order by ID
- **GET** `/api/orders/:id/timeline` - Get order timeline
- **GET** `/api/orders/:id/analysis` - Get project analysis

### Tasks
- **GET** `/api/tasks` - Get all tasks (supports `?orderId=` and `?projectId=` filters)
- **GET** `/api/tasks/:id` - Get task by ID

### Time Tracking
- **GET** `/api/time-tracking` - Get all time entries
- **GET** `/api/time-tracking?projectId=` - Get time entries for a project
- **GET** `/api/time-tracking?orderId=` - Get time entries for an order

### Projects
- **GET** `/api/projects` - Get all projects
- **GET** `/api/projects/:id` - Get project by ID

### Users
- **GET** `/api/users` - Get all users
- **GET** `/api/users/:id` - Get user by ID

### Resources
- **GET** `/api/resources` - Get all resources/equipment

### Departments
- **GET** `/api/departments` - Get all departments

### Requisitions
- **GET** `/api/requisitions` - Get all requisitions

### Purchases
- **GET** `/api/purchases` - Get all purchases

## Dashboard Ideas

### 1. Executive Dashboard
**Key Metrics:**
- Total orders and completion rate
- On-time delivery percentage
- Active projects count
- Total hours worked
- Department performance comparison

**Visualizations:**
- Order status pie chart
- On-time delivery trend line
- Department performance bar chart
- Priority distribution

### 2. Project Manager Dashboard
**Key Metrics:**
- Active projects
- Tasks by status
- Team workload (hours per user)
- Upcoming deadlines
- Delayed tasks

**Visualizations:**
- Task completion trends
- Time tracking by user
- Project timeline Gantt chart
- Resource utilization

### 3. Operations Dashboard
**Key Metrics:**
- Purchase delays
- Requisition status
- Resource availability
- Task bottlenecks
- Critical path analysis

**Visualizations:**
- Purchase delay rate
- Requisition approval timeline
- Resource utilization heatmap
- Task dependency network

### 4. Time & Productivity Dashboard
**Key Metrics:**
- Total hours worked
- Hours by user
- Hours by project
- Average hours per day
- Productivity trends

**Visualizations:**
- Time tracking by user (bar chart)
- Hours over time (line chart)
- Project hours distribution (pie chart)
- Daily/weekly/monthly trends

### 5. Performance Analytics Dashboard
**Key Metrics:**
- Estimation accuracy
- Task completion rates
- On-time delivery trends
- Department comparisons
- Historical performance

**Visualizations:**
- Estimation vs actual (scatter plot)
- Completion rate trends
- Department comparison charts
- Performance over time

## Example Dashboard Implementation

### Using React with Recharts

```typescript
import { useEffect, useState } from 'react';
import { LineChart, BarChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Pie, Cell } from 'recharts';

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [timeByUser, setTimeByUser] = useState([]);

  useEffect(() => {
    // Fetch overview data
    fetch('/api/analytics/overview', {
      headers: { 'x-session-id': localStorage.getItem('sessionId') || '' }
    })
      .then(res => res.json())
      .then(data => setOverview(data));

    // Fetch time by user
    fetch('/api/analytics/time-tracking/by-user?days=30', {
      headers: { 'x-session-id': localStorage.getItem('sessionId') || '' }
    })
      .then(res => res.json())
      .then(data => setTimeByUser(data));
  }, []);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Orders</h3>
          <p>{overview?.orders.total}</p>
        </div>
        <div className="metric-card">
          <h3>On-Time Rate</h3>
          <p>{overview?.orders.onTimeRate}%</p>
        </div>
        <div className="metric-card">
          <h3>Task Completion</h3>
          <p>{overview?.tasks.completionRate}%</p>
        </div>
        <div className="metric-card">
          <h3>Total Hours</h3>
          <p>{overview?.timeTracking.totalHours}</p>
        </div>
      </div>

      {/* Time Tracking by User Chart */}
      <BarChart width={600} height={300} data={timeByUser}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="userName" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="totalHours" fill="#8884d8" />
      </BarChart>
    </div>
  );
}
```

## Authentication

All API endpoints require authentication via session ID:

```javascript
fetch('/api/analytics/overview', {
  headers: {
    'x-session-id': localStorage.getItem('sessionId') || ''
  }
})
```

## Data Filtering

Most endpoints support query parameters for filtering:
- `days` - Number of days to look back
- `orderId` - Filter by order
- `projectId` - Filter by project
- `departmentId` - Filter by department

## Best Practices

1. **Cache Data**: Dashboard data doesn't change frequently, consider caching
2. **Pagination**: For large datasets, implement pagination
3. **Real-time Updates**: Use WebSockets or polling for live dashboards
4. **Error Handling**: Always handle API errors gracefully
5. **Loading States**: Show loading indicators while fetching data
6. **Responsive Design**: Make dashboards work on mobile devices

## Next Steps

1. Choose which metrics are most important for your use case
2. Design dashboard layout and visualizations
3. Implement API calls in your frontend
4. Add charts and graphs using a library like Recharts, Chart.js, or D3.js
5. Add real-time updates if needed
6. Test with real data

The system already includes Recharts in dependencies, so you can start building dashboards immediately!
