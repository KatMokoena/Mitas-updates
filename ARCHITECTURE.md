# Architecture: Order-Centric Timeline Manager

## Current Architecture Summary

### Existing Entities
- **Project**: High-level project container (optional startDate/endDate)
- **Task**: Work items with dependencies, resources, assigned users
- **Resource**: Labour/equipment resources
- **Deliverable**: Project deliverables
- **User**: System users with roles

### Current Scheduling Logic
- Basic dependency propagation in `ProjectService.recalculateTimeline()`
- Manual date updates in GanttView
- No automatic deadline tracking

## Proposed Architecture

### Core Concept: Order-Centric Model
The system will be centered around **Orders** - each order represents a customer order with a fixed deadline. Orders contain tasks/phases that must be completed to fulfill the order.

### New/Enhanced Entities

#### 1. Order Entity
- Core unit replacing/enhancing Project concept
- **Required fields:**
  - `id`: UUID
  - `orderNumber`: Unique order identifier
  - `customerName`: Customer information
  - `deadline`: Fixed target delivery date (datetime)
  - `status`: Order status (pending, active, completed, cancelled)
  - `priority`: Priority level
  - `description`: Order details
  - `createdAt`, `updatedAt`

#### 2. Purchase Entity (NEW)
- Tracks procurement and supplier deliveries
- **Fields:**
  - `id`: UUID
  - `orderId`: Link to order
  - `taskId`: Optional link to specific task
  - `supplierName`: Supplier information
  - `purchaseOrderNumber`: PO number
  - `itemDescription`: What's being purchased
  - `orderDate`: When PO was placed
  - `expectedDeliveryDate`: Expected arrival
  - `actualDeliveryDate`: Actual arrival (nullable)
  - `status`: Purchase status
  - `cost`: Optional cost tracking

#### 3. Enhanced Task Entity
- Add datetime precision (not just dates)
- Link to purchases and deliverables
- **New fields:**
  - `orderId`: Link to order (replaces or supplements projectId)
  - `plannedStartDateTime`: Precise start time
  - `plannedEndDateTime`: Precise end time
  - `actualStartDateTime`: Actual start (nullable)
  - `actualEndDateTime`: Actual end (nullable)
  - `purchaseIds`: Array of linked purchase IDs
  - `deliverableIds`: Array of linked deliverable IDs
  - `isCritical`: Flag for critical path tasks
  - `slackDays`: Calculated buffer time

#### 4. Enhanced Resource Entity
- Add availability constraints
- **New fields:**
  - `availabilitySchedule`: Working hours/days
  - `leadTimeDays`: Lead time for procurement
  - `capacity`: Maximum concurrent allocations

### Scheduling Engine

#### SchedulingEngine Service
A dedicated service that:
1. **Recalculates timelines** when:
   - Task dates change
   - Resource availability changes
   - Purchase delivery dates change
   - Dependencies are updated
   - Tasks are completed early/late

2. **Critical Path Analysis:**
   - Identifies tasks on the critical path
   - Calculates slack/buffer time
   - Flags tasks that risk the deadline

3. **Deadline Tracking:**
   - Computes order status (on-track, at-risk, late)
   - Calculates days until deadline
   - Provides risk assessment

4. **Constraint Handling:**
   - Resource availability windows
   - Supplier lead times
   - Working hours/days
   - Task dependencies

### API Structure

#### Order Endpoints
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order
- `GET /api/orders/:id/timeline` - Get order timeline with calculated dates
- `POST /api/orders/:id/recalculate` - Trigger timeline recalculation

#### Purchase Endpoints
- `GET /api/purchases` - List purchases
- `GET /api/purchases/:id` - Get purchase details
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Frontend Components

#### OrderTimeline Component
- Real-time timeline view for an order
- Shows:
  - All tasks/phases with dates
  - Current phase indicator
  - Critical path highlighting
  - Deadline countdown
  - Risk indicators
  - Resource allocations
  - Purchase deliveries

#### Features:
- Drag-and-drop date adjustment
- Inline editing
- Filter by status/resource
- Real-time updates via polling/websockets
- Deadline alerts

## Implementation Plan

### Phase 1: Data Model
1. Create Order entity
2. Create Purchase entity
3. Enhance Task entity
4. Update database schema

### Phase 2: Scheduling Engine
1. Create SchedulingEngine service
2. Implement dependency resolution
3. Add critical path calculation
4. Add deadline tracking

### Phase 3: Backend APIs
1. Order CRUD endpoints
2. Purchase CRUD endpoints
3. Timeline recalculation endpoint
4. Deadline status endpoint

### Phase 4: Frontend
1. Order list/detail views
2. OrderTimeline component
3. Real-time updates
4. Deadline alerts

### Phase 5: Testing & Documentation
1. Unit tests for scheduling logic
2. Integration tests
3. API documentation
4. User documentation
















