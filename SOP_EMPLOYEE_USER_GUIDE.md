# Standard Operating Procedure (SOP)
## MITAS Internal Project Management Platform (IPMP)
## Employee User Guide

**Document Version:** 1.0  
**Last Updated:** 2024  
**Purpose:** Comprehensive guide for all employees on how to use the IPMP system

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Getting Started](#3-getting-started)
4. [Navigation & Interface](#4-navigation--interface)
5. [Core Features](#5-core-features)
6. [Daily Workflows](#6-daily-workflows)
7. [Advanced Features](#7-advanced-features)
8. [User Roles & Permissions](#8-user-roles--permissions)
9. [Best Practices](#9-best-practices)
10. [Troubleshooting](#10-troubleshooting)
11. [Support & Resources](#11-support--resources)

---

## 1. Introduction

### 1.1 What is IPMP?

The **MITAS Internal Project Management Platform (IPMP)** is a comprehensive order and project management system designed to:

- **Track customer orders** from creation to completion
- **Automatically calculate timelines** based on task dependencies, resources, and purchases
- **Monitor deadlines** and identify at-risk projects
- **Manage resources** including staff and equipment
- **Track time** spent on projects and tasks
- **Handle requisitions** for equipment and materials
- **Facilitate collaboration** through task assignments and ownership transfers

### 1.2 Why Use IPMP?

- ✅ **Automated Scheduling**: System automatically calculates when tasks should start and end
- ✅ **Real-Time Updates**: See project status changes instantly
- ✅ **Risk Management**: Automatically identifies projects at risk of missing deadlines
- ✅ **Resource Tracking**: Know who's working on what and when
- ✅ **Time Tracking**: Track actual time spent vs. estimated time
- ✅ **Centralized Information**: All project information in one place
- ✅ **Email Notifications**: Stay informed about assignments, completions, and approvals

---

## 2. System Overview

### 2.1 How the System Works

#### Core Concepts

**Orders/Projects:**
- Represent customer orders with fixed deadlines
- Contain multiple tasks/steps that must be completed
- Have statuses: Pending, Active, On Hold, Completed, Cancelled
- Have priorities: Low, Medium, High, Urgent
- Have risk levels: On Track (Green), At Risk (Amber), Late (Red)

**Tasks/Steps:**
- Individual work items within an order
- Have dependencies (some tasks must complete before others start)
- Have assigned resources (staff and equipment)
- Have statuses: Not Started, In Progress, Completed, Blocked
- Have estimated and actual durations

**Critical Path:**
- Sequence of tasks that directly determines if the order meets its deadline
- Tasks on the critical path have zero buffer time
- Any delay in critical path tasks delays the entire order

**Automatic Timeline Calculation:**
- System uses a scheduling engine to calculate when tasks should start/end
- Considers: task dependencies, purchase delivery dates, resource availability, order deadline
- Automatically recalculates when anything changes

### 2.2 System Architecture

The system consists of:

- **Frontend**: Web-based interface (React)
- **Backend**: Server API (Node.js/Express)
- **Database**: Stores all orders, tasks, users, time entries, etc.
- **Email Service**: Sends notifications for assignments, completions, approvals
- **Scheduling Engine**: Calculates timelines automatically

---

## 3. Getting Started

### 3.1 Logging In

1. **Open the Application**
   - Navigate to the IPMP URL in your web browser
   - Or launch the desktop application if installed

2. **Enter Credentials**
   - **Email**: Your registered email address
   - **Password**: Your assigned password
   - Click **"Login"**

3. **First Login**
   - You may be prompted to change your password
   - Review and accept any terms of service
   - Complete your profile if required

4. **Session Management**
   - Your session remains active while you use the system
   - Session expires after inactivity (typically 8 hours)
   - You'll be automatically logged out if the server restarts

### 3.2 First Steps After Login

1. **Explore the Dashboard**
   - View all active orders
   - Check statistics and metrics
   - Review at-risk and late orders

2. **Navigate the Interface**
   - Familiarize yourself with the sidebar navigation
   - Click on different menu items to explore
   - Review the layout and available features

3. **View an Existing Order**
   - Click on an order card from the Dashboard
   - Explore the different tabs: Overview, Workflow, Purchases, Timeline
   - Understand how information is organized

4. **Check Your Profile**
   - Click on your name in the header
   - Review your role and permissions
   - Verify your department assignment

### 3.3 Logging Out

1. **Click Logout**
   - Click on your name in the header
   - Select "Logout" from the dropdown menu
   - Or click the logout button in the sidebar

2. **Automatic Logout**
   - System automatically stops any running timers before logout
   - Session is cleared from the server
   - You'll need to log in again to access the system

---

## 4. Navigation & Interface

### 4.1 Main Navigation

The sidebar contains the following menu items:

- **Dashboard** (`/`): Overview of all orders and key metrics
- **Projects** (`/projects`): View all projects with ownership information
- **Orders** (`/orders`): View and manage all orders
- **All Projects Gantt** (`/all-projects-gantt`): Combined Gantt chart view of all projects
- **Users** (`/users`): User management (Admin only)
- **Settings** (`/settings`): System configuration (Admin/Project Manager)

### 4.2 Header Bar

The top header contains:

- **User Information**: Your name and role
- **Notification Bell**: Shows pending invitations and requisitions
- **Logout**: Option to log out of the system

### 4.3 Color Coding System

Throughout the application, colors indicate status:

- **🟢 Green**: On track, completed, good status
- **🟡 Amber/Yellow**: At risk, warning, needs attention
- **🔴 Red**: Critical path, late, overdue, urgent action needed

### 4.4 Common UI Elements

- **Cards**: Clickable containers showing order/project information
- **Tabs**: Switch between different views (Overview, Workflow, Purchases, Timeline)
- **Modals**: Pop-up windows for creating/editing items
- **Dropdowns**: Select options (status, priority, resources)
- **Buttons**: Actions (Create, Edit, Delete, Save, Cancel)
- **Badges**: Small indicators showing status, priority, ownership

---

## 5. Core Features

### 5.1 Dashboard

**Purpose**: Central hub showing overview of all orders and key metrics

**Features**:
- **Order Cards**: Display all orders with key information
- **Statistics**: Total projects, tasks completed today, project health
- **Filters**: Filter by status, risk level, customer, priority
- **Quick Actions**: Create new order, view details

**How to Use**:

1. **View All Orders**
   - Orders are displayed as cards
   - Each card shows: Order Number, Customer, Deadline, Status, Risk Level

2. **Filter Orders**
   - Use filter dropdowns at the top
   - Filter by: Status (Pending, Active, On Hold, Completed)
   - Filter by: Risk Level (On Track, At Risk, Late)
   - Filter by: Customer Name
   - Filter by: Priority (Low, Medium, High, Urgent)

3. **View Order Details**
   - Click on any order card to open the order timeline

4. **Create New Order**
   - Click "+ New Order" button
   - Fill in the form (see Section 5.2)

**Key Metrics Displayed**:
- **Total Projects**: Number of active orders
- **Tasks Completed Today**: Daily progress indicator
- **Project Health Efficiency**: Overall performance percentage
- **On Track / At Risk / Late**: Distribution of order risk levels

### 5.2 Creating Orders

**Purpose**: Create a new customer order with deadline and priority

**Steps**:

1. **Navigate to Create Order**
   - Click "Orders" in sidebar
   - Click "+ New Order" button
   - Or click "Create Order" from Dashboard

2. **Fill in Order Details**
   - **Order Number** (Required): Unique identifier (e.g., "ORD-2024-001")
   - **Customer Name** (Required): Name of the client
   - **Deadline** (Required): Target delivery date and time
   - **Priority** (Required): Low, Medium, High, or Urgent
   - **Description** (Optional): Additional details about the order

3. **Submit Order**
   - Click "Create Order" button
   - You'll be redirected to the order timeline page

**Important Notes**:
- Order Number must be unique
- Deadline should be realistic based on order complexity
- Priority helps prioritize work (use Urgent sparingly)
- You become the order owner automatically

### 5.3 Order Timeline View

**Purpose**: Detailed view of a single order with all its information

**Tabs Available**:

#### **Overview Tab**
- Order information (number, customer, deadline, status, priority)
- Timeline summary (total steps, completed, in progress, critical path)
- Purchase summary
- Critical path visualization
- Risk indicators

#### **Workflow Tab**
- List of all tasks/steps in the order
- Add new steps
- Edit existing steps
- Update task status
- View task details (dependencies, resources, dates)

#### **Purchases Tab**
- List of all purchase orders
- Add new purchases
- Edit purchase details
- Track delivery dates
- Link purchases to tasks

#### **Timeline Tab**
- Gantt chart visualization
- Visual timeline showing all tasks
- Critical path highlighting (red)
- Color-coded by risk level
- Interactive hover details

**How to Navigate**:
- Click on any tab to switch views
- Use "Add Step" or "Add Purchase" buttons to create new items
- Click on task/purchase cards to edit them
- Use status dropdowns for quick updates

### 5.4 Task/Step Management

**Purpose**: Create and manage workflow steps (tasks) within an order

**Creating a Task**:

1. **Open Order Timeline**
   - Navigate to an order
   - Go to "Workflow" tab

2. **Click "Add Step" Button**
   - Modal window opens

3. **Fill in Task Details**
   - **Title** (Required): Name of the task
   - **Description** (Required): What needs to be done
   - **Estimated Duration** (Required): Number of days to complete
   - **Status** (Required): Not Started, In Progress, Completed, Blocked
   - **Dependencies** (Optional): Select tasks that must complete first
   - **Assigned User** (Optional): Assign to a team member
   - **Resources** (Optional): Select equipment/resources needed
   - **Is Critical** (Optional): Mark if this is a critical task
   - **Is Milestone** (Optional): Mark if this is a milestone

4. **Save Task**
   - Click "Create Step" or "Update Step"
   - System automatically recalculates timeline

**Editing a Task**:

1. **Find the Task**
   - Go to "Workflow" tab
   - Locate the task card

2. **Click Edit Button**
   - Or click on the task card
   - Modal opens with current values

3. **Update Information**
   - Modify any fields
   - Update status if work has progressed
   - Adjust duration if estimate was wrong
   - Add/remove dependencies
   - Reassign resources

4. **Save Changes**
   - Click "Update Step"
   - Timeline recalculates automatically

**Quick Status Update**:

1. **Find the Task**
   - In "Workflow" tab

2. **Use Status Dropdown**
   - Click the status dropdown on the task card
   - Select new status: Not Started → In Progress → Completed

3. **Status Updates Automatically**
   - No need to save
   - Timeline recalculates

**Task Information Displayed**:
- Title and description
- Status (color-coded)
- Estimated duration
- Assigned user(s)
- Resources/equipment
- Dependencies
- Calculated start/end dates
- Risk level (color-coded: green/amber/red)
- Critical path indicator

### 5.5 Purchase Management

**Purpose**: Track procurement and supplier deliveries

**Creating a Purchase**:

1. **Open Order Timeline**
   - Navigate to an order
   - Go to "Purchases" tab

2. **Click "Add Purchase" Button**
   - Modal window opens

3. **Fill in Purchase Details**
   - **Item Description** (Required): What is being purchased
   - **Supplier Name** (Required): Name of the supplier
   - **Purchase Order Number** (Optional): PO number
   - **Order Date** (Required): When PO was placed
   - **Expected Delivery Date** (Required): When item should arrive
   - **Lead Time Days** (Optional): Number of days for delivery
   - **Cost** (Optional): Purchase cost
   - **Link to Task** (Optional): Link to a specific task

4. **Save Purchase**
   - Click "Create Purchase"
   - System updates timeline if delivery date affects tasks

**Editing a Purchase**:

1. **Find the Purchase**
   - Go to "Purchases" tab
   - Locate the purchase card

2. **Click Edit Button**
   - Modal opens with current values

3. **Update Information**
   - Update delivery date if supplier is delayed
   - Update status (Pending, Ordered, In Transit, Delivered, Delayed)
   - Add actual delivery date when received
   - Update cost if different

4. **Save Changes**
   - Click "Update Purchase"
   - Timeline automatically adjusts if delivery date changed

**Important Notes**:
- Late purchase deliveries automatically delay dependent tasks
- Always update delivery dates when suppliers inform you of delays
- Link purchases to tasks if a task cannot start without the purchase

### 5.6 Timeline/Gantt View

**Purpose**: Visual representation of the order timeline

**Features**:
- **Gantt Chart**: Horizontal bars showing task durations
- **Color Coding**: Green (on track), Amber (at risk), Red (critical/late)
- **Critical Path**: Highlighted in red
- **Interactive**: Hover for details, click to navigate
- **Resource Display**: Shows assigned staff on task labels

**How to Use**:

1. **Navigate to Timeline Tab**
   - Open an order
   - Click "Timeline" tab

2. **Interpret the Chart**
   - **X-Axis**: Time (dates)
   - **Y-Axis**: Tasks (listed vertically)
   - **Bars**: Task duration (start to end date)
   - **Colors**: Risk level and status

3. **Identify Critical Path**
   - Tasks highlighted in red are on the critical path
   - These tasks directly impact the deadline
   - Any delay in these tasks delays the entire order

4. **Check Projected Completion**
   - Look at the rightmost end of the timeline
   - Compare to the deadline (shown at top)
   - If projected completion is after deadline, order is at risk or late

5. **Auto-Refresh**
   - Timeline auto-refreshes every 10 seconds (can be toggled)
   - Or click "Recalculate Timeline" button for manual refresh

### 5.7 Time Tracking

**Purpose**: Track actual time spent on projects and tasks

**Features**:
- **Timer**: Real-time tracking with start/stop functionality
- **Manual Entry**: Log time retroactively
- **Project Summary**: View total time logged per project
- **Task-Level Tracking**: Track time for specific tasks

**Using the Timer**:

1. **Navigate to Time Tracking**
   - Go to a project's time tracking page
   - Or access from project menu

2. **Start Timer**
   - Select project (if not already on project page)
   - Optionally select a task
   - Click "Start Timer" button
   - Timer begins counting

3. **Stop Timer**
   - Click "Stop Timer" button
   - Time entry is automatically saved
   - You can add description/notes

4. **View Running Timer**
   - Timer displays elapsed time
   - Can be stopped from any page (timer persists)

**Manual Time Entry**:

1. **Navigate to Manual Entry**
   - Go to Time Tracking page
   - Click "Manual Entry" tab

2. **Fill in Details**
   - **Project** (Required): Select the project
   - **Task** (Optional): Select specific task
   - **Date** (Required): Date when work was performed
   - **Start Time** (Required): When work started
   - **End Time** (Required): When work ended
   - **Duration** (Auto-calculated): Hours worked
   - **Description** (Optional): What work was done
   - **Notes** (Optional): Additional information

3. **Save Entry**
   - Click "Save Entry"
   - Entry is recorded in the system

**Viewing Time Summary**:

1. **Go to Project Time Summary**
   - Navigate to project's time tracking page
   - View "Summary" tab

2. **Review Statistics**
   - Total hours logged
   - Hours by task
   - Hours by user (if multiple users)
   - Time period breakdown

### 5.8 Requisitions

**Purpose**: Request equipment and materials for orders

**Creating a Requisition**:

1. **Navigate to Order**
   - Open an order timeline
   - Go to "Workflow" tab or find requisition option

2. **Click "Create Requisition"**
   - Modal opens

3. **Select Equipment Items**
   - Choose from available equipment/resources
   - Specify quantities needed
   - Check availability status

4. **Select Approvers**
   - Choose one or more approvers
   - These users will receive notification emails

5. **Add Notes** (Optional)
   - Provide context or special instructions

6. **Submit Requisition**
   - Click "Create Requisition"
   - Approvers receive email notifications
   - Requisition status: Pending Approval

**Approving/Rejecting a Requisition**:

1. **Receive Notification**
   - Email notification sent to approvers
   - Notification bell shows pending requisitions

2. **View Requisition**
   - Click on notification
   - Or navigate to requisitions section

3. **Review Details**
   - Check equipment items and quantities
   - Review notes and order information

4. **Take Action**
   - **Approve**: Click "Approve" button
   - **Reject**: Click "Reject" button (provide reason if required)

5. **Status Updates**
   - Requester receives notification of approval/rejection
   - If approved, requisition moves to procurement stage

**Generating Procurement Documents**:

1. **After Approval**
   - If enabled, generate procurement document

2. **Fill in Procurement Details**
   - Item name, code, description
   - Quantity
   - Customer number
   - Additional criteria
   - Tag users for notification

3. **Generate PDF**
   - System generates procurement document
   - PDF can be downloaded or sent

### 5.9 Invitations & Assignments

**Purpose**: Assign tasks to team members and transfer ownership

**Task Invitations**:

1. **Assign Task to User**
   - When creating/editing a task
   - Select "Assigned User" from dropdown
   - User receives email notification

2. **User Receives Invitation**
   - Email notification sent
   - Notification bell shows pending invitation

3. **Accept/Decline**
   - User clicks notification
   - Options: Accept or Decline
   - If accepted, user is assigned to task
   - If declined, assigner is notified

**Project/Ownership Transfer**:

1. **Initiate Transfer**
   - Go to Projects page
   - Find project you own
   - Click "Assign New Owner" button

2. **Select New Owner**
   - Modal opens with list of all users
   - Select the new owner
   - Optionally add a message

3. **Send Invitation**
   - Click "Send Invitation"
   - New owner receives email notification
   - Notification bell shows pending invitation

4. **New Owner Accepts/Declines**
   - New owner clicks notification
   - Options: Accept or Decline
   - If accepted: Ownership transfers, old owner retains access but loses ownership rights
   - If declined: Original owner is notified to choose someone else

**Order Ownership Transfer**:
- Similar process to project ownership transfer
- Available from Orders page
- Same accept/decline workflow

### 5.10 Notifications

**Purpose**: Stay informed about assignments, approvals, and updates

**Notification Types**:
- **Task Invitations**: When assigned to a task
- **Ownership Transfer Invitations**: When invited to take ownership
- **Requisition Approvals**: When your requisition needs approval
- **Requisition Status Updates**: When requisition is approved/rejected

**Accessing Notifications**:

1. **Notification Bell**
   - Click bell icon in header
   - Shows count of pending notifications

2. **View Notifications**
   - Modal opens showing all pending items
   - Grouped by type (Tasks, Projects, Orders, Requisitions)

3. **Take Action**
   - Click "Accept" or "Decline" buttons
   - Or click links to view related items

4. **Email Notifications**
   - All notifications also sent via email
   - Check your registered email address

---

## 6. Daily Workflows

### 6.1 Morning Routine (5-10 minutes)

**For All Users**:

1. **Log In**
   - Open IPMP
   - Enter credentials

2. **Check Dashboard**
   - Review at-risk and late orders
   - Check your assigned tasks
   - Review notifications

3. **Plan Your Day**
   - Identify priority tasks
   - Check deadlines
   - Review critical path tasks

**For Project Managers**:

1. **Filter Dashboard**
   - Filter by "At Risk" and "Late"
   - Review problematic orders

2. **Check Critical Path**
   - Open each at-risk order
   - Review critical path tasks
   - Identify bottlenecks

3. **Resource Planning**
   - Check resource assignments
   - Identify conflicts or overallocation

### 6.2 During the Day

**Updating Task Status**:

1. **When Starting Work**
   - Open order → Workflow tab
   - Find your task
   - Change status: "Not Started" → "In Progress"
   - Start timer if tracking time

2. **While Working**
   - Keep timer running
   - Update task if duration estimate was wrong
   - Add notes if issues arise

3. **When Completing Work**
   - Change status: "In Progress" → "Completed"
   - Stop timer
   - Update actual end date if different from planned
   - Add completion notes

**Handling Delays**:

1. **Task Delays**
   - Update task duration if estimate was wrong
   - Or update actual start/end dates
   - System automatically recalculates dependent tasks

2. **Purchase Delays**
   - Go to Purchases tab
   - Edit purchase
   - Update expected delivery date
   - System automatically delays dependent tasks

3. **Resource Changes**
   - Edit task
   - Reassign staff or equipment
   - System recalculates if needed

4. **Check Impact**
   - Review timeline after changes
   - Check if order is still on track
   - Review critical path

### 6.3 End of Day Routine (5-10 minutes)

**For All Users**:

1. **Update Task Statuses**
   - Mark completed tasks as "Completed"
   - Stop any running timers
   - Update progress on in-progress tasks

2. **Review Your Work**
   - Check what you accomplished
   - Verify all updates are saved

3. **Plan Tomorrow**
   - Review tomorrow's tasks
   - Check deadlines
   - Identify priorities

**For Project Managers**:

1. **Review All Active Orders**
   - Check status of all orders
   - Identify new risks

2. **Update Delayed Items**
   - Update any delayed tasks or purchases
   - Check timeline impact

3. **Plan Next Day**
   - Prioritize based on critical path
   - Assign resources if needed
   - Communicate with team

4. **Log Out**
   - Ensure all timers are stopped
   - Log out properly

---

## 7. Advanced Features

### 7.1 Projects Management

**Purpose**: Manage standalone projects (separate from orders)

**Viewing Projects**:

1. **Navigate to Projects**
   - Click "Projects" in sidebar
   - View all projects with ownership badges

2. **Project Information**
   - Project title and description
   - Owner badge (shows owner name)
   - Ownership indicator (⭐ Owner) if you're the owner
   - Status and priority

3. **Filtering**
   - Filter by status, priority, owner
   - Search by project name

**Transferring Ownership**:

1. **As Project Owner**
   - Find your project
   - Click "Assign New Owner" button
   - Select new owner from list
   - Add optional message
   - Click "Send Invitation"

2. **As New Owner**
   - Receive email notification
   - Click notification bell
   - Accept or decline invitation
   - If accepted, you become owner

### 7.2 All Projects Gantt View

**Purpose**: View all projects/orders on a single Gantt chart

**How to Use**:

1. **Navigate to All Projects Gantt**
   - Click "All Projects Gantt" in sidebar

2. **View Combined Timeline**
   - See all projects/orders on one timeline
   - Identify overlaps and conflicts
   - Plan resource allocation

3. **Interact with Chart**
   - Hover for details
   - Click to navigate to specific order
   - Zoom in/out for different time ranges

### 7.3 User Management (Admin Only)

**Purpose**: Create and manage user accounts

**Creating a User**:

1. **Navigate to Users**
   - Click "Users" in sidebar (Admin only)

2. **Click "Add User"**
   - Modal opens

3. **Fill in User Details**
   - **Name** (Required): First name
   - **Surname** (Required): Last name
   - **Email** (Required): Email address (must be unique)
   - **Password** (Required): Initial password
   - **Role** (Required): Admin, Project Manager, User, or Executives
   - **Department** (Optional): Assign to department

4. **Save User**
   - Click "Create User"
   - User can now log in

**Editing a User**:

1. **Find User**
   - Go to Users page
   - Locate user in list

2. **Click Edit**
   - Modal opens with current values

3. **Update Information**
   - Change name, email, role, department
   - Reset password if needed

4. **Save Changes**
   - Click "Update User"

**Deleting a User**:
- Only Admins can delete users
- Use with caution (consider deactivating instead)

### 7.4 Settings (Admin/Project Manager)

**Purpose**: Configure system settings and permissions

**Accessing Settings**:

1. **Navigate to Settings**
   - Click "Settings" in sidebar
   - Requires Admin or Project Manager role

2. **Available Settings**:

   **Route Access Configuration**:
   - Configure which routes each role can access
   - Select routes for: Admin, Project Manager, User, Executives

   **Role Permissions**:
   - Configure specific permissions per role
   - Examples: Can delete orders, can manage users, etc.

   **Email Configuration**:
   - Configure email service settings
   - Set up SMTP for notifications
   - Test email functionality

   **System Configuration**:
   - General system settings
   - Default values
   - Feature toggles

3. **Save Settings**
   - Click "Save" after making changes
   - Changes take effect immediately

---

## 8. User Roles & Permissions

### 8.1 Role Overview

**Admin**:
- ✅ Full access to all features
- ✅ Can manage users
- ✅ Can manage all orders/projects
- ✅ Can configure system settings
- ✅ Can view all departments
- ✅ Can delete orders and projects

**Project Manager**:
- ✅ Can create and manage orders/projects
- ✅ Can assign tasks and resources
- ✅ Can view orders from their department
- ✅ Can edit tasks and timelines
- ✅ Can transfer ownership
- ⚠️ Limited user management
- ❌ Cannot delete orders (unless configured)

**User**:
- ✅ Can view assigned tasks and orders
- ✅ Can update task status
- ✅ Can view timeline information
- ✅ Can track time
- ✅ Can accept/decline invitations
- ❌ Cannot create or delete orders
- ❌ Limited editing capabilities

**Executives**:
- ✅ Can view reports and dashboards
- ✅ Can view all orders for oversight
- ⚠️ Typically read-only access
- ⚠️ Limited editing (configurable)

### 8.2 Permission Details

**Viewing Orders**:
- All users can view orders they're assigned to
- Project Managers can view orders in their department
- Admins can view all orders

**Creating Orders**:
- Project Managers and Admins can create orders
- Users cannot create orders (unless configured)

**Editing Orders**:
- Project Managers and Admins can edit orders
- Users can only edit tasks they're assigned to

**Deleting Orders**:
- Only Admins can delete orders (by default)
- Can be configured per role in Settings

**User Management**:
- Only Admins can create, edit, delete users
- Other roles cannot access Users page

**Settings**:
- Only Admins and Project Managers can access Settings
- Configuration varies by role

**Note**: Actual permissions may vary based on role configuration in Settings.

---

## 9. Best Practices

### 9.1 Order Setup

**Be Thorough with Dependencies**:
- ✅ Correctly set task dependencies
- ✅ Ensures accurate timeline calculations
- ❌ Don't skip dependencies to "save time"

**Realistic Duration Estimates**:
- ✅ Base estimates on past experience
- ✅ Add buffer for unexpected issues
- ❌ Don't be overly optimistic

**Set Priorities Appropriately**:
- ✅ Use Urgent only for truly critical orders
- ✅ Medium for most orders
- ❌ Don't mark everything as Urgent

**Add Detailed Descriptions**:
- ✅ Include context and requirements
- ✅ Helpful for team members who join later
- ❌ Don't leave descriptions blank

### 9.2 Daily Operations

**Check Dashboard First Thing**:
- ✅ Identify at-risk and late orders immediately
- ✅ Plan day's priorities
- ❌ Don't ignore warning indicators

**Update Task Statuses Promptly**:
- ✅ Keep system current for accurate risk assessment
- ✅ Update when starting/completing work
- ❌ Don't wait until end of day to update

**Review Critical Path Regularly**:
- ✅ Focus efforts on tasks that impact deadline
- ✅ Identify bottlenecks early
- ❌ Don't ignore critical path warnings

**Communicate Delays Early**:
- ✅ Update system when issues arise
- ✅ Don't wait until deadline is missed
- ❌ Don't hide problems

### 9.3 Timeline Management

**Trust Automatic Calculations**:
- ✅ System is designed to handle complex scheduling
- ✅ Let it calculate for you
- ❌ Don't manually override unless necessary

**Review After Major Changes**:
- ✅ Always check timeline after adding tasks
- ✅ Verify after changing dates or dependencies
- ❌ Don't assume timeline is correct without checking

**Use Manual Recalculation**:
- ✅ Click "Recalculate Timeline" if something seems off
- ✅ Useful after bulk changes
- ❌ Don't ignore calculation errors

**Monitor Slack Time**:
- ✅ Tasks with low slack are at risk if delayed
- ✅ Focus on tasks with zero slack (critical path)
- ❌ Don't ignore slack warnings

### 9.4 Resource Management

**Assign Resources Early**:
- ✅ Helps identify resource conflicts
- ✅ Better planning and scheduling
- ❌ Don't wait until last minute

**Update Assignments When Needed**:
- ✅ Keep resource assignments current
- ✅ Reassign if staff unavailable
- ❌ Don't leave outdated assignments

**Consider Equipment Availability**:
- ✅ Some tasks require specific equipment
- ✅ Check availability before scheduling
- ❌ Don't assume equipment is always available

### 9.5 Risk Management

**Act on Amber Warnings**:
- ✅ Don't wait until orders are late
- ✅ Take action when order is at risk
- ❌ Don't ignore warning indicators

**Focus on Critical Path Tasks**:
- ✅ These directly impact deadlines
- ✅ Prioritize critical path work
- ❌ Don't work on non-critical tasks when critical ones are delayed

**Review Purchases Regularly**:
- ✅ Late deliveries can cascade through timeline
- ✅ Update delivery dates promptly
- ❌ Don't ignore purchase delays

**Use Filters Effectively**:
- ✅ Quickly find orders that need attention
- ✅ Filter by risk level, status, priority
- ❌ Don't scroll through all orders manually

### 9.6 Time Tracking

**Track Time Accurately**:
- ✅ Use timer for real-time work
- ✅ Log manual entries for past work
- ❌ Don't estimate time retroactively

**Add Descriptions**:
- ✅ Describe what work was performed
- ✅ Helpful for project analysis
- ❌ Don't leave descriptions blank

**Track at Task Level**:
- ✅ More granular tracking is better
- ✅ Helps identify which tasks take longer
- ❌ Don't only track at project level

### 9.7 Collaboration

**Respond to Invitations Promptly**:
- ✅ Accept or decline task assignments quickly
- ✅ Don't leave invitations pending
- ❌ Don't ignore notifications

**Communicate Through System**:
- ✅ Use notes and descriptions
- ✅ Update status to communicate progress
- ❌ Don't rely only on external communication

**Keep Information Current**:
- ✅ Update statuses and dates regularly
- ✅ System works best with current data
- ❌ Don't let information become stale

---

## 10. Troubleshooting

### 10.1 Common Issues

**Problem: Can't Log In**

**Possible Causes**:
- Incorrect email or password
- Account is locked or disabled
- Server is down

**Solutions**:
1. Double-check email and password (case-sensitive)
2. Contact Admin to reset password
3. Check if server is running
4. Clear browser cache and cookies
5. Try different browser

**Problem: Timeline Seems Wrong**

**Possible Causes**:
- Timeline not recalculated after changes
- Incorrect dependencies
- Purchase delivery dates not updated

**Solutions**:
1. Click "Recalculate Timeline" button
2. Check task dependencies are correct
3. Verify purchase delivery dates
4. Refresh the page
5. Check if all tasks have valid dates

**Problem: Order Shows as Late But Shouldn't**

**Possible Causes**:
- Task durations are unrealistic
- Dependencies are incorrect
- Purchase delivery dates are wrong
- Deadline is too tight

**Solutions**:
1. Review task durations (are they realistic?)
2. Verify dependencies are correct
3. Check purchase delivery dates
4. Review deadline (is it achievable?)
5. Adjust durations or dependencies if needed

**Problem: Can't See an Order**

**Possible Causes**:
- Filters are applied
- Department access restrictions
- Order status is filtered out
- Order was deleted

**Solutions**:
1. Clear all filters on Dashboard
2. Check department assignment
3. Verify order status (may be filtered)
4. Contact Admin if order should be visible

**Problem: Task Won't Update**

**Possible Causes**:
- No edit permissions
- Task is locked
- Browser cache issue
- Server error

**Solutions**:
1. Refresh the page
2. Check you have edit permissions
3. Verify task isn't locked
4. Clear browser cache
5. Try again in a few minutes

**Problem: Timer Won't Start/Stop**

**Possible Causes**:
- Another timer is running
- Server connection issue
- Browser issue

**Solutions**:
1. Check if another timer is running (stop it first)
2. Refresh the page
3. Check server connection
4. Try different browser
5. Contact support if persists

**Problem: Email Notifications Not Received**

**Possible Causes**:
- Email service not configured
- Email in spam folder
- Incorrect email address
- Email service error

**Solutions**:
1. Check spam/junk folder
2. Verify email address in profile
3. Contact Admin to check email configuration
4. Check email service logs

**Problem: Can't Assign Task to User**

**Possible Causes**:
- User doesn't exist
- No permissions to assign
- User is inactive

**Solutions**:
1. Verify user exists in system
2. Check you have assignment permissions
3. Verify user account is active
4. Contact Admin if needed

### 10.2 Error Messages

**"Session Expired"**:
- Your session has timed out
- Solution: Log in again

**"Unauthorized"**:
- You don't have permission for this action
- Solution: Contact Admin to check permissions

**"Not Found"**:
- The item you're looking for doesn't exist
- Solution: Verify the ID or check if it was deleted

**"Validation Error"**:
- Required fields are missing or invalid
- Solution: Check the form and fill in all required fields

**"Server Error"**:
- Something went wrong on the server
- Solution: Try again in a few minutes, contact support if persists

### 10.3 Getting Help

**Self-Help**:
1. Review this SOP document
2. Check the User Guide
3. Review FAQ if available
4. Search for similar issues

**Contact Support**:
1. **System Administrator**: For technical issues
2. **Project Manager**: For workflow questions
3. **Training Coordinator**: For training needs
4. **IT Support**: For access or login issues

**When Reporting Issues**:
- Describe what you were trying to do
- Include error messages (if any)
- Note what you've already tried
- Provide screenshots if helpful

---

## 11. Support & Resources

### 11.1 Documentation

- **This SOP**: Comprehensive employee guide
- **User Guide**: Detailed feature documentation
- **Training Quick Reference**: Quick tips and shortcuts
- **FAQ**: Frequently asked questions

### 11.2 Training

**Initial Training**:
- New users receive training on first day
- Role-specific training sessions
- Hands-on practice with sample orders

**Ongoing Training**:
- Monthly refresher sessions
- Advanced feature workshops
- Best practices sharing

**Training Materials**:
- Video tutorials (if available)
- Step-by-step guides
- Sample orders for practice
- Quick reference cards

### 11.3 Contact Information

**System Administrator**:
- Email: [Admin Email]
- Phone: [Admin Phone]
- For: Technical issues, user management, system configuration

**Project Manager**:
- Email: [PM Email]
- Phone: [PM Phone]
- For: Workflow questions, order management, training

**IT Support**:
- Email: [IT Email]
- Phone: [IT Phone]
- For: Access issues, login problems, browser issues

### 11.4 System Status

**Check System Status**:
- Dashboard shows system health
- Contact Admin if system appears down
- Check email for system maintenance notifications

**Maintenance Windows**:
- Scheduled maintenance announced in advance
- System may be unavailable during maintenance
- Plan work accordingly

---

## Appendix A: Quick Reference

### Keyboard Shortcuts
- Currently, system is primarily mouse-driven
- Use browser shortcuts (Ctrl+F for search, etc.)

### Status Definitions

**Order Status**:
- **Pending**: Order created but not started
- **Active**: Order is in progress
- **On Hold**: Order temporarily paused
- **Completed**: Order finished
- **Cancelled**: Order cancelled

**Task Status**:
- **Not Started**: Task not yet begun
- **In Progress**: Task currently being worked on
- **Completed**: Task finished
- **Blocked**: Task cannot proceed (waiting on something)

**Risk Levels**:
- **On Track (Green)**: Will finish before deadline with buffer
- **At Risk (Amber)**: Close to deadline (< 7 days buffer)
- **Late (Red)**: Will miss deadline

### Common Actions

**Create Order**: Orders → + New Order → Fill form → Create

**Add Task**: Order → Workflow Tab → Add Step → Fill form → Create

**Update Status**: Order → Workflow Tab → Status Dropdown → Select Status

**Add Purchase**: Order → Purchases Tab → Add Purchase → Fill form → Create

**Track Time**: Project → Time Tracking → Start Timer / Manual Entry

**Create Requisition**: Order → Create Requisition → Select items → Submit

**Transfer Ownership**: Projects → Find Project → Assign New Owner → Select User → Send

---

## Appendix B: Glossary

**Order**: Customer order with deadline and priority

**Project**: Standalone project (separate from orders)

**Task/Step**: Individual work item within an order/project

**Critical Path**: Sequence of tasks that determines if deadline is met

**Dependency**: Relationship where one task must complete before another starts

**Slack**: Buffer time available for a task (zero slack = critical path)

**Gantt Chart**: Visual timeline showing tasks as horizontal bars

**Resource**: Staff member or equipment assigned to tasks

**Requisition**: Request for equipment or materials

**Invitation**: Request to assign task or transfer ownership

**Timeline**: Calculated schedule showing when tasks should start/end

**Risk Level**: Indicator of whether order will meet deadline (On Track/At Risk/Late)

---

## Document Control

**Version History**:
- **v1.0** (2024): Initial comprehensive SOP document

**Review Schedule**:
- Review quarterly or when major features are added
- Update as system evolves

**Approval**:
- Approved by: [Manager Name]
- Date: [Date]

**Distribution**:
- All employees with IPMP access
- New employees during onboarding
- Available in company documentation system

---

**End of Document**

*For questions or suggestions about this SOP, please contact the System Administrator.*
