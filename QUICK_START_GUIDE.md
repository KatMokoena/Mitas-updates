# IPMP Quick Start Guide
## MITAS Internal Project Management Platform

**Version:** 1.0  
**For:** All Employees  
**Purpose:** Get up and running quickly

---

## 🚀 Getting Started (5 Minutes)

### Login
1. Open IPMP in your browser
2. Enter your **email** and **password**
3. Click **"Login"**
4. You'll see the **Dashboard**

### First Look
- **Dashboard**: Overview of all orders
- **Sidebar**: Navigation menu (left side)
- **Header**: Your name, notifications bell, logout

---

## 📍 Navigation

| Menu Item | What It Does |
|-----------|--------------|
| **Dashboard** | View all orders, statistics, filters |
| **Projects** | View all projects with ownership info |
| **Orders** | View and manage customer orders |
| **All Projects Gantt** | Combined timeline of all projects |
| **Users** | User management (Admin only) |
| **Settings** | System configuration (Admin/PM only) |

---

## 🎯 Essential Tasks

### Create a New Order

1. Click **"Orders"** → Click **"+ New Order"**
2. Fill in:
   - **Order Number** (unique, e.g., "ORD-2024-001")
   - **Customer Name**
   - **Deadline** (date & time)
   - **Priority** (Low/Medium/High/Urgent)
3. Click **"Create Order"**

### Add a Task/Step to an Order

1. Open an order → Click **"Workflow"** tab
2. Click **"Add Step"**
3. Fill in:
   - **Title** (e.g., "Design Phase")
   - **Description**
   - **Estimated Duration** (days)
   - **Dependencies** (tasks that must finish first)
   - **Assigned User** (optional)
4. Click **"Create Step"**

### Update Task Status

1. Open order → **"Workflow"** tab
2. Find your task
3. Click **status dropdown** → Select:
   - **Not Started** → **In Progress** → **Completed**

### Add a Purchase

1. Open order → **"Purchases"** tab
2. Click **"Add Purchase"**
3. Fill in:
   - **Item Description**
   - **Supplier Name**
   - **Expected Delivery Date**
4. Click **"Create Purchase"**

### View Timeline

1. Open order → **"Timeline"** tab
2. See Gantt chart with all tasks
3. **Red tasks** = Critical path (must finish on time)
4. Check if projected completion is before deadline

---

## ⏱️ Time Tracking

### Start Timer
1. Go to project's **Time Tracking** page
2. Click **"Start Timer"**
3. Timer runs automatically
4. Click **"Stop Timer"** when done

### Manual Time Entry
1. Go to **Time Tracking** → **"Manual Entry"** tab
2. Fill in: Project, Date, Start Time, End Time
3. Add description
4. Click **"Save Entry"**

---

## 📧 Notifications & Invitations

### Check Notifications
- Click **bell icon** in header
- See pending: Task assignments, Ownership transfers, Requisitions

### Accept/Decline Invitations
1. Click notification bell
2. Click **"Accept"** or **"Decline"** button
3. For ownership transfers: Accept to become owner

### Assign Task to Someone
1. When creating/editing task
2. Select **"Assigned User"** from dropdown
3. User receives email notification

---

## 🛒 Requisitions

### Create Requisition
1. Open order → Find **"Create Requisition"** option
2. Select equipment items needed
3. Select approvers
4. Add notes (optional)
5. Click **"Create Requisition"**

### Approve/Reject Requisition
1. Click notification bell
2. Review requisition details
3. Click **"Approve"** or **"Reject"**

---

## 🎨 Color Codes

| Color | Meaning | Action |
|-------|---------|--------|
| 🟢 **Green** | On track, completed | Continue monitoring |
| 🟡 **Amber** | At risk, warning | Review and take action |
| 🔴 **Red** | Critical path, late | Immediate attention needed |

---

## 📊 Dashboard Filters

Use filters to find orders quickly:

- **Status**: Pending, Active, On Hold, Completed
- **Risk Level**: On Track, At Risk, Late
- **Customer**: Search by customer name
- **Priority**: Low, Medium, High, Urgent

---

## 🔄 Daily Routine

### Morning (5 min)
- [ ] Log in
- [ ] Check Dashboard
- [ ] Filter by "At Risk" and "Late"
- [ ] Review problematic orders

### During Day
- [ ] Update task status when starting work
- [ ] Update status when completing work
- [ ] Update purchase dates if delayed
- [ ] Check timeline after changes

### End of Day (5 min)
- [ ] Update all task statuses
- [ ] Stop any running timers
- [ ] Review tomorrow's tasks
- [ ] Log out

---

## ⚡ Quick Actions

| What You Want To Do | How To Do It |
|---------------------|--------------|
| **Create new order** | Orders → + New Order |
| **Add task** | Order → Workflow → Add Step |
| **Update task status** | Order → Workflow → Status dropdown |
| **View timeline** | Order → Timeline tab |
| **Add purchase** | Order → Purchases → Add Purchase |
| **Track time** | Project → Time Tracking → Start Timer |
| **Check notifications** | Click bell icon in header |
| **Transfer ownership** | Projects → Assign New Owner |
| **Create requisition** | Order → Create Requisition |

---

## 🚨 Common Issues & Quick Fixes

### Can't Log In
- ✅ Check email and password (case-sensitive)
- ✅ Clear browser cache
- ✅ Contact Admin for password reset

### Timeline Looks Wrong
- ✅ Click **"Recalculate Timeline"** button
- ✅ Check task dependencies
- ✅ Verify purchase delivery dates

### Order Shows as Late
- ✅ Review task durations (are they realistic?)
- ✅ Check dependencies are correct
- ✅ Verify purchase dates

### Can't See an Order
- ✅ Clear Dashboard filters
- ✅ Check department access
- ✅ Verify order status

### Task Won't Update
- ✅ Refresh the page
- ✅ Check you have edit permissions
- ✅ Try again in a few minutes

---

## 👥 Roles & Permissions

| Action | User | Project Manager | Admin |
|--------|------|-----------------|-------|
| View orders | ✅ | ✅ | ✅ |
| Update task status | ✅ | ✅ | ✅ |
| Create orders | ❌ | ✅ | ✅ |
| Edit orders | ❌ | ✅ | ✅ |
| Delete orders | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| System settings | ❌ | ⚠️ | ✅ |

*Actual permissions may vary by configuration*

---

## 📝 Best Practices

### ✅ DO
- Update task statuses promptly
- Set realistic duration estimates
- Update purchase dates when delayed
- Check critical path regularly
- Respond to invitations quickly

### ❌ DON'T
- Skip task dependencies
- Use "Urgent" for everything
- Ignore amber/red warnings
- Leave descriptions blank
- Wait until deadline to update status

---

## 🔑 Key Concepts

**Order**: Customer order with deadline and priority

**Task/Step**: Individual work item within an order

**Critical Path**: Tasks that directly impact deadline (shown in red)

**Dependency**: One task must finish before another starts

**Risk Level**: 
- **On Track** (Green): Will finish before deadline
- **At Risk** (Amber): Close to deadline
- **Late** (Red): Will miss deadline

**Timeline**: Automatically calculated schedule (system does this for you!)

---

## 📞 Need Help?

### Quick Self-Help
1. Check this guide
2. Review full SOP document
3. Check notification bell for pending items

### Contact Support
- **System Admin**: Technical issues, user management
- **Project Manager**: Workflow questions, training
- **IT Support**: Login problems, access issues

---

## 🎓 Learning Path

### Day 1: Basics
- [ ] Log in successfully
- [ ] View Dashboard
- [ ] Open an order
- [ ] Update a task status
- [ ] View timeline

### Week 1: Core Features
- [ ] Create an order
- [ ] Add tasks with dependencies
- [ ] Assign resources
- [ ] Add purchases
- [ ] Track time

### Month 1: Advanced
- [ ] Manage multiple orders
- [ ] Handle delays and changes
- [ ] Create requisitions
- [ ] Transfer ownership
- [ ] Use filters effectively

---

## 📋 Quick Checklist: Setting Up a New Order

- [ ] Create order with deadline and priority
- [ ] Add all workflow steps/tasks
- [ ] Set task dependencies (which tasks come first)
- [ ] Assign staff to tasks
- [ ] Assign equipment/resources
- [ ] Add purchases (if needed)
- [ ] Link purchases to tasks (if applicable)
- [ ] Review timeline
- [ ] Verify projected completion is before deadline
- [ ] Check critical path tasks

---

## 💡 Pro Tips

1. **Check Dashboard First**: Always start your day by checking at-risk orders

2. **Update Status Immediately**: Don't wait - update task status as soon as you start/finish work

3. **Trust the Timeline**: The system calculates automatically - trust it, but verify if something seems wrong

4. **Focus on Red Tasks**: Critical path tasks (red) directly impact deadline - prioritize these

5. **Use Filters**: Don't scroll through all orders - use filters to find what you need

6. **Update Delays Early**: If something is delayed, update it immediately - don't wait

7. **Check Notifications**: Click the bell regularly to see pending invitations and approvals

8. **Track Time Accurately**: Use timer for real-time work, manual entry for past work

---

## 🔄 Status Flow

**Order Status Flow:**
```
Pending → Active → Completed
         ↓
      On Hold
         ↓
     Cancelled
```

**Task Status Flow:**
```
Not Started → In Progress → Completed
                    ↓
                 Blocked
```

---

## 📱 Mobile-Friendly

The system works on:
- ✅ Desktop computers
- ✅ Laptops
- ✅ Tablets
- ✅ Mobile phones (responsive design)

---

## 🎯 Most Common Workflows

### Workflow 1: Daily Task Update
1. Log in
2. Check Dashboard for assigned tasks
3. Open order → Workflow tab
4. Find your task → Change status to "In Progress"
5. Start timer (if tracking time)
6. When done → Change status to "Completed"
7. Stop timer

### Workflow 2: Handle a Delay
1. Open order → Purchases tab (if purchase delayed)
2. Edit purchase → Update delivery date
3. System automatically recalculates timeline
4. Check Timeline tab → Verify if still on track
5. If at risk → Take action on critical path tasks

### Workflow 3: Create New Order
1. Orders → + New Order
2. Fill in order details
3. Create order
4. Add workflow steps
5. Set dependencies
6. Assign resources
7. Review timeline
8. Verify on track

---

## ⚠️ Important Reminders

- **Session Timeout**: You'll be logged out after inactivity (typically 8 hours)
- **Auto-Save**: Most actions save automatically
- **Email Notifications**: Check your email for important notifications
- **Timeline Recalculation**: Happens automatically, but you can manually trigger it
- **Critical Path**: Red tasks are critical - any delay delays the entire order

---

## 📚 Additional Resources

- **Full SOP Document**: `SOP_EMPLOYEE_USER_GUIDE.md` - Comprehensive guide
- **User Guide**: Detailed feature documentation
- **Training Materials**: Video tutorials and step-by-step guides

---

## 🏗️ Complete Project Lifecycle Guide
### Step-by-Step: From Creation to Completion

This guide walks you through creating a new project and managing it through the entire lifecycle until the due date.

---

### PHASE 1: Project Setup (Initial Setup - Day 1)

#### Step 1: Create the Order/Project

1. **Navigate to Orders**
   - Click **"Orders"** in the left sidebar
   - You'll see a list of all existing orders

2. **Click "+ New Order" Button**
   - Located at the top right of the Orders page
   - A form modal will open

3. **Fill in Order Details**
   - **Order Number** (Required): 
     - Enter a unique identifier (e.g., "ORD-2024-001")
     - Must be unique - system will warn if duplicate
   - **Customer Name** (Required):
     - Enter the client's name (e.g., "ABC Manufacturing")
   - **Deadline** (Required):
     - Click the date/time picker
     - Select the target delivery date
     - Select the target delivery time
     - **Important**: Make this realistic based on project scope
   - **Priority** (Required):
     - Select from dropdown: Low, Medium, High, or Urgent
     - Use "Urgent" only for truly critical projects
   - **Description** (Optional):
     - Add any additional context or requirements
     - Helpful for team members who join later

4. **Create the Order**
   - Click **"Create Order"** button at bottom of form
   - You'll be automatically redirected to the order timeline page
   - **Note**: You automatically become the project owner

5. **Verify Order Created**
   - You should see the order timeline page
   - Order status will be "Pending" initially
   - You'll see tabs: Overview, Workflow, Purchases, Timeline

---

#### Step 2: Add Workflow Steps/Tasks

**Planning Your Tasks First:**
- Before adding tasks, plan out all the work that needs to be done
- Think about the sequence: which tasks must happen first?
- Estimate how long each task will take
- Identify which tasks depend on others

**Adding Tasks One by One:**

1. **Go to Workflow Tab**
   - Click the **"Workflow"** tab in the order timeline
   - You'll see an empty list (or existing tasks if any)

2. **Click "Add Step" Button**
   - Located at the top of the Workflow tab
   - A modal form will open

3. **Fill in Task Details for First Task**
   - **Title** (Required): 
     - Enter task name (e.g., "Initial Design")
   - **Description** (Required):
     - Describe what needs to be done
     - Be specific and clear
   - **Estimated Duration** (Required):
     - Enter number of days (e.g., "5" for 5 days)
     - Base on past experience - be realistic!
   - **Status** (Required):
     - Select "Not Started" (default for new tasks)
   - **Dependencies** (Optional - for first task, leave empty):
     - This task has no dependencies yet
     - We'll set dependencies for later tasks
   - **Assigned User** (Optional):
     - Select team member from dropdown
     - Leave empty if assigning later
   - **Resources** (Optional):
     - Select equipment/resources needed
     - Can add multiple resources
   - **Is Critical** (Optional):
     - Check if this is a critical path task
   - **Is Milestone** (Optional):
     - Check if this is a project milestone

4. **Save First Task**
   - Click **"Create Step"** button
   - Task appears in the Workflow list
   - System automatically calculates start/end dates

5. **Add Remaining Tasks**
   - Repeat steps 2-4 for each task
   - **Example tasks you might add:**
     - Task 1: "Initial Design" (5 days)
     - Task 2: "Design Review" (2 days)
     - Task 3: "Procurement" (7 days)
     - Task 4: "Assembly" (10 days)
     - Task 5: "Testing" (3 days)
     - Task 6: "Final Delivery" (1 day)

6. **Verify All Tasks Added**
   - Review the Workflow tab
   - Ensure all tasks are listed
   - Check that durations are realistic

---

#### Step 3: Set Task Dependencies

**Understanding Dependencies:**
- Dependencies define which tasks must complete before another can start
- Example: "Assembly" cannot start until "Procurement" is complete
- The system uses dependencies to calculate the timeline automatically

**Setting Dependencies:**

1. **Identify Dependent Tasks**
   - Review your task list
   - Determine which tasks must wait for others
   - Example: "Design Review" depends on "Initial Design"

2. **Edit Each Task to Add Dependencies**
   - Click on a task card (or click Edit button)
   - Modal opens with task details

3. **Select Dependencies**
   - Find the **"Dependencies"** field
   - It shows a multi-select dropdown
   - Select all tasks that must complete first
   - Example: For "Design Review", select "Initial Design"

4. **Save Changes**
   - Click **"Update Step"** button
   - System automatically recalculates timeline
   - Dependent task's start date moves to after predecessor's end date

5. **Set Dependencies for All Tasks**
   - Repeat for each task that has dependencies
   - **Common dependency patterns:**
     - Sequential: Task 2 depends on Task 1, Task 3 depends on Task 2
     - Parallel: Multiple tasks depend on same predecessor
     - Complex: Task depends on multiple predecessors

6. **Verify Dependencies**
   - Review the Workflow tab
   - Each task shows its dependencies
   - Check that dependencies make logical sense

---

#### Step 4: Assign Resources (Staff & Equipment)

**Assigning Staff to Tasks:**

1. **Review Task Assignments**
   - Go to Workflow tab
   - Identify which tasks need which team members

2. **Edit Task to Assign User**
   - Click on task card
   - Find **"Assigned User"** dropdown
   - Select team member from list
   - Click **"Update Step"**

3. **Assign Users to All Tasks**
   - Repeat for each task that needs assignment
   - **Tip**: Assign based on skills and availability

4. **Alternative: Assign During Task Creation**
   - When creating a task, select "Assigned User" before saving
   - Saves time if you know assignments upfront

**Assigning Equipment/Resources:**

1. **Identify Required Equipment**
   - Review each task
   - Determine what equipment/resources are needed

2. **Edit Task to Add Resources**
   - Click on task card
   - Find **"Resources"** field
   - Select equipment from dropdown (can select multiple)
   - Click **"Update Step"**

3. **Link Resources to All Tasks**
   - Repeat for tasks requiring equipment
   - **Note**: System tracks resource availability

---

#### Step 5: Add Purchases (If Needed)

**When to Add Purchases:**
- If your project requires materials, equipment, or supplies from suppliers
- If tasks cannot start without certain items being delivered

**Adding Purchases:**

1. **Go to Purchases Tab**
   - Click **"Purchases"** tab in order timeline
   - You'll see an empty list (or existing purchases)

2. **Click "Add Purchase" Button**
   - Located at top of Purchases tab
   - Modal form opens

3. **Fill in Purchase Details**
   - **Item Description** (Required):
     - What is being purchased (e.g., "Steel Components")
   - **Supplier Name** (Required):
     - Name of supplier (e.g., "ABC Supplies Inc.")
   - **Purchase Order Number** (Optional):
     - Your PO number if available
   - **Order Date** (Required):
     - When the purchase order was placed
   - **Expected Delivery Date** (Required):
     - When supplier will deliver
     - **Critical**: This affects task start dates!
   - **Lead Time Days** (Optional):
     - Number of days from order to delivery
   - **Cost** (Optional):
     - Purchase cost for tracking
   - **Link to Task** (Optional):
     - Select task that requires this purchase
     - Tasks cannot start until purchase is delivered

4. **Save Purchase**
   - Click **"Create Purchase"** button
   - Purchase appears in list
   - System automatically adjusts timeline if linked to task

5. **Add All Required Purchases**
   - Repeat for each purchase needed
   - Link purchases to tasks that depend on them

---

#### Step 6: Review and Verify Timeline

**Checking the Timeline:**

1. **Go to Timeline Tab**
   - Click **"Timeline"** tab
   - You'll see a Gantt chart visualization

2. **Interpret the Gantt Chart**
   - **X-Axis**: Time (dates)
   - **Y-Axis**: Tasks (listed vertically)
   - **Bars**: Each task's duration (start to end date)
   - **Colors**: 
     - 🟢 Green = On track
     - 🟡 Amber = At risk
     - 🔴 Red = Critical path or late

3. **Check Projected Completion Date**
   - Look at the rightmost end of the timeline
   - This is the calculated completion date
   - Compare to your deadline (shown at top)
   - **Goal**: Projected completion should be BEFORE deadline

4. **Identify Critical Path**
   - Tasks highlighted in **RED** are on the critical path
   - These tasks directly impact the deadline
   - Any delay in these tasks delays the entire project
   - **Action**: Focus resources on critical path tasks

5. **Review Task Sequence**
   - Verify tasks are in logical order
   - Check that dependencies are working correctly
   - Ensure no tasks are starting before their dependencies complete

6. **Check for Issues**
   - **If projected completion is AFTER deadline:**
     - Project is already at risk or late
     - **Solutions:**
       - Reduce task durations (if realistic)
       - Remove unnecessary dependencies
       - Add more resources
       - Extend deadline (if possible)

7. **Verify Timeline is Correct**
   - Click **"Recalculate Timeline"** button if needed
   - System will recalculate all dates
   - Review again after recalculation

---

#### Step 7: Activate the Project

1. **Change Order Status**
   - Go to **Overview** tab
   - Find order status (currently "Pending")
   - Change to **"Active"** when ready to start work
   - **Note**: Some actions may require status to be Active

2. **Verify Everything is Ready**
   - All tasks created ✅
   - Dependencies set ✅
   - Resources assigned ✅
   - Purchases added (if needed) ✅
   - Timeline looks correct ✅
   - Projected completion before deadline ✅

---

### PHASE 2: Active Project Management (Daily Operations)

#### Daily Monitoring Routine

**Every Morning:**

1. **Check Dashboard**
   - Log in to IPMP
   - View Dashboard
   - Filter by "At Risk" and "Late"
   - Review your project's status

2. **Open Your Project**
   - Click on your project from Dashboard
   - Go to **Overview** tab
   - Check:
     - Days until deadline
     - Current risk level (Green/Amber/Red)
     - Projected completion date
     - Number of tasks completed

3. **Review Critical Path**
   - Go to **Timeline** tab
   - Identify red (critical) tasks
   - These are your priority tasks today
   - Focus efforts on critical path tasks

4. **Check Notifications**
   - Click notification bell
   - Review any pending invitations or approvals
   - Respond to notifications

---

#### Updating Task Progress

**When Starting Work on a Task:**

1. **Open Project → Workflow Tab**
   - Find the task you're about to start

2. **Update Task Status**
   - Click status dropdown
   - Change from **"Not Started"** to **"In Progress"**
   - Status updates automatically

3. **Start Time Tracking (Optional)**
   - Navigate to project's Time Tracking page
   - Click **"Start Timer"**
   - Timer begins counting
   - Continue working

4. **Update Actual Start Date (If Different)**
   - If task started on different date than planned
   - Click Edit on task
   - Update **"Actual Start DateTime"**
   - Click **"Update Step"**

**While Working on Task:**

1. **Keep Timer Running**
   - Timer tracks time automatically
   - Can minimize browser - timer continues

2. **Update Task if Needed**
   - If duration estimate was wrong
   - Edit task → Update **"Estimated Duration"**
   - System recalculates timeline

3. **Add Notes if Issues Arise**
   - Edit task
   - Add notes in description or notes field
   - Document any problems or delays

**When Completing a Task:**

1. **Stop Time Tracking**
   - Go to Time Tracking page
   - Click **"Stop Timer"**
   - Add description of work performed
   - Time entry is saved

2. **Update Task Status**
   - Go to Workflow tab
   - Find completed task
   - Change status from **"In Progress"** to **"Completed"**
   - Status updates automatically

3. **Update Actual End Date**
   - If task finished on different date
   - Click Edit on task
   - Update **"Actual End DateTime"**
   - Click **"Update Step"**

4. **Verify Dependent Tasks**
   - System automatically updates dependent tasks
   - Check Timeline tab
   - Dependent tasks should now be able to start
   - Verify timeline updated correctly

---

#### Handling Delays and Changes

**When a Task is Delayed:**

1. **Identify the Delay**
   - Task is taking longer than estimated
   - Or task cannot start on planned date

2. **Update Task Duration**
   - Go to Workflow tab
   - Click Edit on delayed task
   - Increase **"Estimated Duration"** to new estimate
   - Click **"Update Step"**

3. **OR Update Actual Dates**
   - If task started late
   - Update **"Actual Start DateTime"**
   - System adjusts end date automatically

4. **Check Impact**
   - Go to Timeline tab
   - System automatically recalculated
   - Check if project is still on track
   - Review critical path (may have changed)

5. **Take Action if Needed**
   - If project is now at risk:
     - Focus resources on critical path
     - Consider adding more resources
     - Review if deadline can be extended

**When a Purchase is Delayed:**

1. **Receive Delay Notification**
   - Supplier informs you of delay
   - Or you notice delivery date passed

2. **Update Purchase Delivery Date**
   - Go to **Purchases** tab
   - Click Edit on delayed purchase
   - Update **"Expected Delivery Date"** to new date
   - Update status if needed (e.g., "Delayed")
   - Click **"Update Purchase"**

3. **System Automatically Adjusts**
   - Tasks linked to this purchase are delayed
   - Timeline recalculates automatically
   - Dependent tasks are pushed back

4. **Check Project Status**
   - Go to Timeline tab
   - Verify if project is still on track
   - Check new projected completion date
   - Review critical path

5. **Communicate with Team**
   - Inform affected team members
   - Update project notes if needed
   - Plan for delay impact

**When Resources Change:**

1. **Reassign Staff**
   - Go to Workflow tab
   - Edit task
   - Change **"Assigned User"** to new person
   - Click **"Update Step"**
   - New assignee receives notification

2. **Change Equipment**
   - Edit task
   - Update **"Resources"** field
   - Remove old equipment, add new
   - Click **"Update Step"**

3. **Verify Timeline**
   - Check Timeline tab
   - Ensure changes didn't cause issues
   - Review critical path

---

#### Creating Requisitions (If Needed)

**When Equipment/Materials Are Needed:**

1. **Navigate to Requisition Creation**
   - From order timeline, find **"Create Requisition"** option
   - Or access from appropriate menu

2. **Select Equipment Items**
   - Choose from available equipment/resources
   - Select quantities needed
   - Check availability status

3. **Select Approvers**
   - Choose one or more approvers from list
   - These users will receive email notifications

4. **Add Notes**
   - Provide context or special instructions
   - Explain why items are needed

5. **Submit Requisition**
   - Click **"Create Requisition"**
   - Status: "Pending Approval"
   - Approvers receive notifications

6. **Wait for Approval**
   - Monitor notification bell
   - Or check requisition status
   - Once approved, proceed with procurement

---

### PHASE 3: Ongoing Monitoring (Throughout Project)

#### Weekly Review

**Every Week:**

1. **Review All Active Projects**
   - Check Dashboard
   - Review all your projects
   - Identify any new risks

2. **Check Timeline for Each Project**
   - Open each active project
   - Review Timeline tab
   - Verify still on track

3. **Review Critical Path**
   - Identify critical tasks for coming week
   - Plan resource allocation
   - Prioritize critical path work

4. **Update Any Delayed Items**
   - Update delayed tasks
   - Update delayed purchases
   - Ensure timeline is current

5. **Communicate with Team**
   - Review assignments
   - Check if anyone needs help
   - Update on project status

---

#### Monitoring Project Health

**Check Risk Indicators:**

1. **Dashboard View**
   - Project card shows risk level:
     - 🟢 Green = On Track
     - 🟡 Amber = At Risk
     - 🔴 Red = Late

2. **Overview Tab**
   - Shows days until deadline
   - Shows projected completion
   - Compares to deadline

3. **Timeline Tab**
   - Visual representation of risk
   - Color-coded tasks
   - Critical path highlighted

**When Project Shows "At Risk" (Amber):**

1. **Review Timeline**
   - Check what's causing the risk
   - Identify delayed tasks
   - Review critical path

2. **Take Immediate Action**
   - Focus resources on critical tasks
   - Consider adding more resources
   - Review if durations can be reduced

3. **Update Timeline**
   - Make necessary adjustments
   - Recalculate timeline
   - Monitor closely

**When Project Shows "Late" (Red):**

1. **Immediate Review**
   - Open Timeline tab
   - Identify all delayed tasks
   - Review critical path

2. **Emergency Actions**
   - Reallocate all resources to critical path
   - Consider extending deadline (if possible)
   - Communicate with customer if needed

3. **Daily Monitoring**
   - Check project daily
   - Update statuses immediately
   - Track progress closely

---

### PHASE 4: Project Completion

#### Final Tasks Before Completion

1. **Verify All Tasks Complete**
   - Go to Workflow tab
   - Review all tasks
   - Ensure all are marked "Completed"
   - Check for any "Blocked" tasks

2. **Verify All Purchases Received**
   - Go to Purchases tab
   - Ensure all purchases are "Delivered"
   - Update any pending purchases

3. **Review Final Timeline**
   - Go to Timeline tab
   - Verify all tasks are complete
   - Check final completion date

4. **Complete Time Tracking**
   - Stop any running timers
   - Ensure all time entries are logged
   - Review time summary

---

#### Marking Project as Complete

1. **Navigate to Project Overview**
   - Open your project
   - Go to Overview tab

2. **Click "Mark Complete" Button**
   - Located on the order timeline page
   - Confirmation dialog appears

3. **Confirm Completion**
   - Review confirmation message
   - Click **"Confirm"** or **"Mark Complete"**
   - Order status changes to "Completed"

4. **Verify Completion**
   - Project status shows "Completed"
   - Project appears in "Completed" filter
   - Timeline shows all tasks complete

5. **Review Project Metrics**
   - Check actual vs. planned completion date
   - Review time spent vs. estimated
   - Note any lessons learned

---

#### Post-Completion Tasks

1. **Review Project Performance**
   - Compare actual duration to estimated
   - Review time tracking data
   - Identify areas for improvement

2. **Document Lessons Learned**
   - Note what went well
   - Note what could be improved
   - Update task duration estimates for future projects

3. **Archive Project Information**
   - All data remains in system
   - Can be reviewed later
   - Useful for future project planning

---

### PHASE 5: Best Practices Throughout Project Lifecycle

#### Daily Best Practices

✅ **DO:**
- Update task statuses immediately when starting/finishing work
- Check Dashboard every morning
- Monitor critical path tasks daily
- Update delayed items as soon as you know
- Track time accurately
- Respond to notifications promptly

❌ **DON'T:**
- Wait until end of day to update statuses
- Ignore amber/red warnings
- Skip updating delayed purchases
- Forget to stop timers
- Leave notifications unread

#### Weekly Best Practices

✅ **DO:**
- Review all active projects weekly
- Check timeline for each project
- Verify resource assignments
- Update any delayed items
- Communicate with team

❌ **DON'T:**
- Assume everything is on track
- Ignore timeline changes
- Skip weekly reviews
- Forget to update delayed items

#### Project Management Best Practices

✅ **DO:**
- Set realistic duration estimates
- Set dependencies correctly
- Assign resources early
- Monitor critical path closely
- Update timeline when changes occur
- Communicate delays immediately

❌ **DON'T:**
- Be overly optimistic with estimates
- Skip setting dependencies
- Wait to assign resources
- Ignore critical path warnings
- Hide delays or problems
- Assume timeline will fix itself

---

### Quick Reference: Project Lifecycle Checklist

**Setup Phase:**
- [ ] Create order with deadline and priority
- [ ] Add all workflow tasks
- [ ] Set task dependencies
- [ ] Assign staff to tasks
- [ ] Assign equipment/resources
- [ ] Add purchases (if needed)
- [ ] Link purchases to tasks
- [ ] Review timeline
- [ ] Verify projected completion before deadline
- [ ] Activate project

**Daily Operations:**
- [ ] Check Dashboard each morning
- [ ] Review project status
- [ ] Update task status when starting work
- [ ] Start timer (if tracking time)
- [ ] Update task status when completing work
- [ ] Stop timer
- [ ] Update delayed items immediately
- [ ] Check timeline after changes
- [ ] Monitor critical path

**Weekly Review:**
- [ ] Review all active projects
- [ ] Check timelines
- [ ] Update delayed items
- [ ] Review resource assignments
- [ ] Communicate with team

**Completion:**
- [ ] Verify all tasks complete
- [ ] Verify all purchases received
- [ ] Stop all timers
- [ ] Mark project as complete
- [ ] Review project metrics

---

## ✅ Quick Test: Are You Ready?

Answer these to check your understanding:

- [ ] I can log in and navigate the Dashboard
- [ ] I know how to create a new order
- [ ] I can add tasks and set dependencies
- [ ] I understand what the color codes mean
- [ ] I know how to update task status
- [ ] I can view and interpret the timeline
- [ ] I know how to track time
- [ ] I understand how to respond to notifications
- [ ] I know who to contact for help
- [ ] I understand the complete project lifecycle

**If you answered "Yes" to all, you're ready to use IPMP!**

---

**Last Updated:** 2024  
**Version:** 1.0

*Keep this guide handy for quick reference!*
