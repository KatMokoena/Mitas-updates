# Mitas Internal Project Management Platform (IPMP) - User Guide

## Table of Contents
1. [Overview](#overview)
2. [What is IPMP?](#what-is-ipmp)
3. [Core Concepts](#core-concepts)
4. [How the System Works](#how-the-system-works)
5. [Key Features](#key-features)
6. [User Roles and Permissions](#user-roles-and-permissions)
7. [Getting Started](#getting-started)
8. [Common Workflows](#common-workflows)
9. [Training Time Estimates](#training-time-estimates)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Overview

The **Mitas Internal Project Management Platform (IPMP)** is a comprehensive order and project management system designed to help teams track customer orders, manage workflows, monitor deadlines, and ensure timely delivery of projects. The system automatically calculates timelines, identifies critical paths, and alerts users to potential delays.

---

## What is IPMP?

IPMP is a **deadline-driven order management system** that:

- **Tracks customer orders** from creation to completion
- **Automatically calculates timelines** based on task dependencies, resource availability, and purchase deliveries
- **Identifies critical paths** - tasks that directly impact the deadline
- **Monitors risk levels** - shows which orders are on-track, at-risk, or late
- **Manages resources** - tracks staff assignments and equipment allocation
- **Integrates purchases** - links supplier deliveries to workflow steps
- **Provides real-time updates** - automatically recalculates when changes occur

---

## Core Concepts

### Orders
An **Order** represents a customer order with a fixed deadline. Each order contains:
- **Order Number**: Unique identifier (e.g., "ORD-2024-001")
- **Customer Name**: The client placing the order
- **Deadline**: Target delivery date and time
- **Priority**: Low, Medium, High, or Urgent
- **Status**: Pending, Active, On Hold, Completed, or Cancelled
- **Description**: Additional details about the order

### Tasks/Steps
**Tasks** (also called "Steps" or "Workflow Steps") are the individual work items that must be completed to fulfill an order. Each task has:
- **Title and Description**: What needs to be done
- **Estimated Duration**: How many days it will take
- **Status**: Not Started, In Progress, Completed, or Blocked
- **Dependencies**: Other tasks that must complete first
- **Assigned Resources**: Staff members and equipment assigned to the task
- **Start/End Dates**: Calculated automatically by the system

### Critical Path
The **Critical Path** is the sequence of tasks that directly determines whether an order will meet its deadline. Tasks on the critical path have zero "slack" (buffer time) - any delay in these tasks will delay the entire order.

### Risk Levels
The system automatically categorizes orders into three risk levels:
- **On Track** (Green): Projected completion is before the deadline with buffer time
- **At Risk** (Amber): Projected completion is close to the deadline (< 7 days buffer)
- **Late** (Red): Projected completion is after the deadline

### Purchases
**Purchases** track procurement and supplier deliveries. They can be linked to orders and specific tasks. When a purchase delivery date changes, the system automatically adjusts dependent task dates.

---

## How the System Works

### Automatic Timeline Calculation

The system uses a sophisticated **scheduling engine** that automatically calculates when tasks should start and end. Here's how it works:

1. **Forward Pass**: The system calculates the earliest possible start date for each task by:
   - Looking at task dependencies (waiting for predecessor tasks to complete)
   - Checking purchase delivery dates (tasks can't start without materials)
   - Considering resource availability

2. **Backward Pass**: The system calculates the latest acceptable start date by:
   - Working backwards from the order deadline
   - Identifying which tasks have buffer time (slack)
   - Determining which tasks are on the critical path (zero slack)

3. **Automatic Recalculation**: The timeline automatically updates when:
   - Tasks are added, modified, or completed
   - Purchase delivery dates change
   - Dependencies are updated
   - Resources are reassigned
   - Task statuses change

### Real-Time Status Updates

- The system continuously monitors order progress
- Risk levels update automatically as tasks progress
- Dashboard shows current status of all orders
- Timeline view refreshes every 10 seconds (can be toggled)

### Color Coding System

Throughout the application, colors indicate status:
- **Green**: On track, completed, good status
- **Amber/Yellow**: At risk, warning
- **Red**: Critical path, late, overdue, urgent

---

## Key Features

### 1. Dashboard
- **Overview of all orders** with key metrics
- **Quick filters** by status, risk level, customer, and priority
- **Visual indicators** showing on-track, at-risk, and late orders
- **Statistics** including total projects, tasks completed today, and project health
- **Charts and graphs** for visual analysis

### 2. Order Management
- **Create new orders** with customer details and deadlines
- **View order details** including timeline, tasks, and purchases
- **Edit orders** to update information
- **Mark orders as complete** when finished
- **Filter and search** orders by various criteria

### 3. Task/Step Management
- **Add workflow steps** to orders
- **Set dependencies** between tasks
- **Assign staff and equipment** to tasks
- **Update task status** as work progresses
- **Track actual vs. planned dates**
- **Edit task details** including duration and assignments

### 4. Timeline Visualization
- **Gantt chart view** showing all tasks on a timeline
- **Critical path highlighting** in red
- **Color-coded tasks** by risk level
- **Interactive timeline** with hover details
- **Resource display** showing assigned staff

### 5. Purchase Management
- **Create purchase orders** linked to orders and tasks
- **Track supplier deliveries** with expected and actual dates
- **Automatic timeline adjustment** when deliveries are delayed
- **Cost tracking** for purchases

### 6. Resource Management
- **Assign staff members** to tasks
- **Assign equipment** to tasks
- **Track resource availability**
- **View resource assignments** in timeline view

### 7. Automated Reporting
- **Daily email reports** (sent at 6:45 PM Johannesburg time)
- **PDF reports** for each order
- **Timeline summaries** with critical path information

### 8. User Management
- **Role-based access control** (Admin, Project Manager, User, Executives)
- **Department-based filtering** (users see orders from their department)
- **Task invitations** to assign work to team members
- **Permission management** via settings

---

## User Roles and Permissions

### Admin
- **Full access** to all features
- Can manage users, orders, tasks, and settings
- Can view and edit all orders regardless of department
- Can configure system settings and permissions

### Project Manager
- Can create and manage orders
- Can assign tasks and resources
- Can view orders from their department
- Can edit tasks and timelines
- Limited access to user management

### User
- Can view assigned tasks and orders
- Can update task status
- Can view timeline information
- Cannot create or delete orders
- Limited editing capabilities

### Executives
- Typically read-only access
- Can view reports and dashboards
- Can view all orders for oversight
- Limited editing capabilities (configurable)

**Note**: Permissions can be customized per role through the Settings page.

---

## Getting Started

### Logging In
1. Open the application in your web browser
2. Enter your email and password
3. Click "Login"
4. You'll be redirected to the Dashboard

### First Steps
1. **Explore the Dashboard**: Familiarize yourself with the overview
2. **View an Existing Order**: Click on an order card to see the timeline
3. **Navigate the Tabs**: Explore Overview, Workflow, Purchases, and Timeline tabs
4. **Try Filtering**: Use the filters on the Dashboard to find specific orders

### Creating Your First Order
1. Click "Orders" in the sidebar
2. Click "+ New Order" button
3. Fill in the required fields:
   - Order Number (must be unique)
   - Customer Name
   - Deadline (date and time)
   - Priority
4. Optionally add a description
5. Click "Create Order"
6. You'll be redirected to the order timeline

---

## Common Workflows

### Workflow 1: Creating and Setting Up a New Order

1. **Create the Order**
   - Navigate to Orders → Click "+ New Order"
   - Enter order details and deadline
   - Click "Create Order"

2. **Add Workflow Steps**
   - Go to the "Workflow" tab
   - Click "Add Step"
   - Enter step name, description, and estimated duration
   - Set dependencies (which steps must complete first)
   - Assign staff and equipment if needed
   - Click "Create Step"
   - Repeat for all workflow steps

3. **Add Purchases (if needed)**
   - Go to the "Purchases" tab
   - Click "Add Purchase"
   - Enter supplier, item description, and delivery dates
   - Link to relevant tasks if applicable
   - Click "Create Purchase"

4. **Review Timeline**
   - Go to the "Timeline" tab
   - Review the Gantt chart
   - Check that the projected completion date is before the deadline
   - Identify critical path tasks (highlighted in red)

### Workflow 2: Daily Order Monitoring

1. **Morning Review**
   - Open the Dashboard
   - Filter by "At Risk" and "Late" to see problematic orders
   - Click on each order to review details

2. **Update Task Status**
   - Navigate to an order's timeline
   - Go to the "Workflow" tab
   - Find tasks you're working on
   - Change status from "Not Started" to "In Progress"
   - Update status to "Completed" when finished

3. **Handle Delays**
   - If a purchase is delayed, update the delivery date in the "Purchases" tab
   - The system will automatically recalculate the timeline
   - Check if the order is still on track

4. **End of Day Review**
   - Review all active orders
   - Check for new risks or issues
   - Plan next day's priorities based on critical path

### Workflow 3: Managing Delays and Changes

1. **When a Task is Delayed**
   - Update the task's estimated duration if needed
   - Or update the actual start/end dates
   - The system automatically recalculates dependent tasks

2. **When a Purchase is Late**
   - Go to the "Purchases" tab
   - Edit the purchase and update the expected delivery date
   - The system automatically delays dependent tasks

3. **When Resources Change**
   - Edit the task in the "Workflow" tab
   - Reassign staff or equipment
   - The system recalculates if resource availability affects timing

4. **Check Impact**
   - Review the timeline to see if the order is still on track
   - Check the critical path to see which tasks are now critical
   - Take action if the order is at risk

### Workflow 4: Completing an Order

1. **Verify All Tasks Complete**
   - Go to the "Workflow" tab
   - Ensure all tasks are marked as "Completed"
   - Review any blocked tasks

2. **Mark Order as Complete**
   - Click the "Mark Complete" button on the order timeline
   - Confirm the action
   - The order status changes to "Completed"

3. **Review Metrics**
   - Check actual vs. planned completion date
   - Review timeline performance
   - Note any lessons learned

---

## Training Time Estimates

### Basic User (Can view and update assigned tasks)
**Estimated Training Time: 1-2 hours**

**What they need to learn:**
- How to log in
- How to view the dashboard
- How to find and view assigned tasks
- How to update task status (Not Started → In Progress → Completed)
- How to view order timelines
- Basic understanding of color coding (green/amber/red)

**Training Format:**
- 30 minutes: Guided walkthrough of the interface
- 30 minutes: Hands-on practice with sample orders
- 30 minutes: Q&A and troubleshooting
- 30 minutes: Independent practice

**Proficiency Level:**
- Can navigate the system independently
- Can update task statuses correctly
- Understands basic risk indicators

---

### Standard User (Can create orders and manage workflows)
**Estimated Training Time: 3-4 hours**

**What they need to learn:**
- Everything from Basic User training
- How to create new orders
- How to add workflow steps/tasks
- How to set task dependencies
- How to assign resources (staff and equipment)
- How to add purchases
- How to interpret the Gantt chart and timeline
- Understanding of critical path concept
- How to handle delays and changes

**Training Format:**
- 1 hour: Review of basic features
- 1.5 hours: Creating orders and setting up workflows
- 1 hour: Managing purchases and resources
- 30 minutes: Understanding timeline calculations and critical path
- 1 hour: Hands-on practice with real scenarios
- 30 minutes: Q&A and advanced tips

**Proficiency Level:**
- Can create and fully configure new orders
- Understands how dependencies affect timelines
- Can manage purchases and resources
- Can interpret and act on risk indicators
- Knows how to handle common issues

---

### Project Manager (Full order management capabilities)
**Estimated Training Time: 5-6 hours**

**What they need to learn:**
- Everything from Standard User training
- Advanced timeline management
- Resource optimization strategies
- Critical path analysis and management
- How to use filters and search effectively
- How to interpret dashboard metrics
- Best practices for order setup
- How to handle complex dependencies
- Department management (if applicable)
- Task invitation system

**Training Format:**
- 1 hour: Review of standard features
- 2 hours: Advanced workflow management and optimization
- 1 hour: Critical path analysis and risk management
- 1 hour: Dashboard analytics and reporting
- 1 hour: Best practices and troubleshooting
- 30 minutes: Q&A and case studies

**Proficiency Level:**
- Can efficiently manage multiple orders
- Understands advanced scheduling concepts
- Can optimize workflows and resources
- Can proactively identify and resolve risks
- Can train other users

---

### Administrator (Full system access)
**Estimated Training Time: 6-8 hours**

**What they need to learn:**
- Everything from Project Manager training
- User management (create, edit, delete users)
- Role and permission configuration
- System settings and configuration
- Department management
- Email configuration (for daily reports)
- Database and system maintenance
- Troubleshooting common issues
- Security and access control

**Training Format:**
- 1 hour: Review of all user features
- 2 hours: User and role management
- 1.5 hours: System configuration and settings
- 1 hour: Email and reporting setup
- 1 hour: Maintenance and troubleshooting
- 1.5 hours: Security and best practices
- 30 minutes: Q&A and advanced topics

**Proficiency Level:**
- Can manage all aspects of the system
- Can configure and customize the platform
- Can troubleshoot and resolve issues
- Understands system architecture
- Can provide support to other users

---

### Training Recommendations

**For New Teams:**
- Start with a group training session (2-3 hours) covering basics
- Follow up with role-specific training
- Provide hands-on practice with real or sample orders
- Schedule follow-up sessions after 1 week of use

**For Individual Users:**
- Provide a training manual (this document)
- Schedule 1-on-1 training sessions
- Allow time for practice between sessions
- Provide ongoing support for the first month

**Training Materials:**
- This user guide
- Video tutorials (if available)
- Sample orders for practice
- Quick reference cards
- FAQ document

**Ongoing Support:**
- Weekly check-ins for the first month
- Monthly refresher sessions
- Access to help documentation
- Designated system administrator for questions

---

## Tips and Best Practices

### Order Setup
- **Be thorough with dependencies**: Correctly setting dependencies ensures accurate timeline calculations
- **Estimate durations realistically**: Overly optimistic estimates lead to missed deadlines
- **Set priorities appropriately**: Use Urgent sparingly, only for truly critical orders
- **Add detailed descriptions**: Helpful for team members who join later

### Daily Operations
- **Check the dashboard first thing**: Identify at-risk and late orders immediately
- **Update task statuses promptly**: Keep the system current for accurate risk assessment
- **Review critical path regularly**: Focus efforts on tasks that impact the deadline
- **Communicate delays early**: Update the system when issues arise, don't wait

### Timeline Management
- **Trust the automatic calculations**: The system is designed to handle complex scheduling
- **Review after major changes**: Always check the timeline after adding tasks or changing dates
- **Use the manual recalculation button**: If something seems off, force a recalculation
- **Monitor slack time**: Tasks with low slack are at risk if delayed

### Resource Management
- **Assign resources early**: Helps identify resource conflicts
- **Update assignments when needed**: Keep resource assignments current
- **Consider equipment availability**: Some tasks require specific equipment

### Risk Management
- **Act on amber warnings**: Don't wait until orders are late
- **Focus on critical path tasks**: These directly impact deadlines
- **Review purchases regularly**: Late deliveries can cascade through the timeline
- **Use filters effectively**: Quickly find orders that need attention

### Best Practices
- **Keep data current**: Update statuses and dates regularly
- **Use consistent naming**: Makes searching and filtering easier
- **Document issues**: Use descriptions and notes to track problems
- **Review completed orders**: Learn from past performance to improve estimates
- **Collaborate with the team**: Ensure everyone updates their assigned tasks

---

## Additional Resources

### System Features Reference
- **Dashboard**: Overview of all orders and key metrics
- **Orders List**: View and filter all orders
- **Order Timeline**: Detailed view of a single order with tabs:
  - Overview: Summary and critical path
  - Workflow: Manage tasks/steps
  - Purchases: Manage procurement
  - Timeline: Gantt chart visualization
- **Settings**: Configure users, roles, and system settings
- **Users**: Manage user accounts (Admin only)

### Keyboard Shortcuts
- Currently, the system is primarily mouse-driven
- Use browser shortcuts (Ctrl+F for search, etc.)

### Getting Help
- Review this user guide
- Contact your system administrator
- Check the FAQ document (if available)
- Review the dashboard for system status

---

## Conclusion

The Mitas IPMP is designed to make order and project management easier through automation, real-time updates, and intelligent scheduling. With proper training and regular use, teams can significantly improve their ability to meet deadlines and manage complex workflows.

**Remember**: The system works best when everyone keeps it updated. Regular status updates ensure accurate risk assessment and timeline calculations.

---

*Last Updated: 2024*
*Version: 1.0*






