# API Integration Guide - Sharing Data with Other Systems

## What are APIs?

**API (Application Programming Interface)** is a way for different software systems to communicate with each other. Think of it as a "menu" that your system provides - other systems can "order" data or actions from your system.

## Yes, APIs are Perfect for This!

APIs are **exactly** what you use to:
- ✅ Share data with other machines/platforms
- ✅ Integrate with external systems
- ✅ Allow mobile apps to access your data
- ✅ Connect to third-party services
- ✅ Build automated workflows

---

## How Your IPMP APIs Work

### Your System Already Has APIs!

All your data is accessible via REST APIs:

**Base URL:** `http://your-server:3000/api`

**Example Endpoints:**
- `GET /api/orders` - Get all orders
- `GET /api/tasks` - Get all tasks
- `GET /api/analytics/overview` - Get dashboard data
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order

---

## Scenario 1: Another System Wants to Read Your Data

### Example: External Dashboard Needs Order Data

**From another machine/platform, they can call:**

```javascript
// JavaScript/Node.js example
const response = await fetch('http://your-ipmp-server:3000/api/orders', {
  headers: {
    'x-session-id': 'their-session-id',
    'Content-Type': 'application/json'
  }
});

const orders = await response.json();
console.log(orders); // Array of all orders
```

**Python example:**
```python
import requests

response = requests.get(
    'http://your-ipmp-server:3000/api/orders',
    headers={
        'x-session-id': 'their-session-id',
        'Content-Type': 'application/json'
    }
)

orders = response.json()
print(orders)
```

**cURL (command line):**
```bash
curl -X GET http://your-ipmp-server:3000/api/orders \
  -H "x-session-id: their-session-id" \
  -H "Content-Type: application/json"
```

---

## Scenario 2: Your System Needs Data from Another System

### Example: Fetch Customer Data from CRM System

You can create an API client in your system to call external APIs:

```typescript
// In your IPMP service
async function fetchCustomerData(customerId: string) {
  const response = await fetch(`https://external-crm.com/api/customers/${customerId}`, {
    headers: {
      'Authorization': 'Bearer external-api-key',
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

---

## Scenario 3: Two-Way Integration

### Example: Sync Orders Between Systems

**System A (Your IPMP) → System B (ERP System):**

```typescript
// When order is created in IPMP, send to ERP
async function syncOrderToERP(order: OrderEntity) {
  await fetch('https://erp-system.com/api/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer erp-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      deadline: order.deadline,
      // ... other fields
    })
  });
}
```

**System B (ERP) → System A (Your IPMP):**

ERP can call your API to update order status:

```bash
curl -X PUT http://your-ipmp-server:3000/api/orders/order-id \
  -H "x-session-id: session-id" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

---

## Authentication Methods

### Current Method: Session-Based

Your system uses session IDs:
```javascript
headers: {
  'x-session-id': 'session-id-from-login'
}
```

### Better for Integration: API Keys

For machine-to-machine communication, API keys are better:

**1. Create API Key Endpoint:**
```typescript
// POST /api/auth/api-key
// Returns: { apiKey: "key-123..." }
```

**2. Use API Key:**
```javascript
headers: {
  'x-api-key': 'key-123...'
}
```

**3. Validate API Key:**
```typescript
// Middleware to check API key
if (req.headers['x-api-key']) {
  const user = await validateApiKey(req.headers['x-api-key']);
  req.user = user;
}
```

---

## Common Integration Scenarios

### 1. **Webhook Integration**
Your system sends data to another system when events happen:

```typescript
// When order is completed, notify external system
async function notifyOrderCompleted(order: OrderEntity) {
  await fetch('https://external-system.com/webhook/order-completed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      orderNumber: order.orderNumber,
      completedDate: order.completedDate,
    })
  });
}
```

### 2. **Scheduled Sync**
Periodically sync data between systems:

```typescript
// Run every hour
setInterval(async () => {
  const orders = await fetchOrdersFromExternalSystem();
  for (const order of orders) {
    await createOrUpdateOrder(order);
  }
}, 60 * 60 * 1000);
```

### 3. **Real-Time Integration**
Use WebSockets for real-time updates:

```typescript
// When order status changes, broadcast to connected clients
io.emit('order-updated', orderData);
```

### 4. **File-Based Integration**
Export data to files that other systems can read:

```typescript
// Export orders to CSV/JSON
async function exportOrdersToFile() {
  const orders = await orderRepository.find();
  const csv = convertToCSV(orders);
  fs.writeFileSync('orders-export.csv', csv);
  // Other system reads this file
}
```

---

## API Documentation

### For External Systems to Use Your APIs

Create an API documentation page (like Swagger/OpenAPI):

**Example: `API_DOCUMENTATION.md`**

```markdown
# IPMP API Documentation

## Base URL
`http://your-server:3000/api`

## Authentication
Include session ID in header:
```
x-session-id: your-session-id
```

## Endpoints

### Get All Orders
**GET** `/api/orders`

**Response:**
```json
[
  {
    "id": "uuid",
    "orderNumber": "ORD-001",
    "customerName": "Acme Corp",
    "deadline": "2024-02-01T00:00:00Z",
    "status": "active"
  }
]
```

### Create Order
**POST** `/api/orders`

**Request Body:**
```json
{
  "orderNumber": "ORD-002",
  "customerName": "New Customer",
  "deadline": "2024-02-15T00:00:00Z",
  "priority": "high"
}
```
```

---

## Security Considerations

### 1. **HTTPS in Production**
Always use HTTPS for API calls:
```
https://your-server.com/api/orders
```

### 2. **Rate Limiting**
Prevent abuse:
```typescript
// Limit: 100 requests per minute per API key
if (requestsPerMinute > 100) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 3. **CORS Configuration**
Control which domains can call your API:
```typescript
app.use(cors({
  origin: ['https://trusted-domain.com'],
  credentials: true
}));
```

### 4. **API Key Rotation**
Allow users to regenerate API keys:
```typescript
// POST /api/auth/regenerate-api-key
// Invalidates old key, creates new one
```

---

## Example: Complete Integration

### Scenario: Connect IPMP to External Reporting Tool

**Step 1: External system gets API key from IPMP**
```javascript
// Login to get session, then request API key
const loginResponse = await fetch('http://ipmp-server/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { sessionId } = await loginResponse.json();

const apiKeyResponse = await fetch('http://ipmp-server/api/auth/api-key', {
  headers: { 'x-session-id': sessionId }
});
const { apiKey } = await apiKeyResponse.json();
```

**Step 2: External system uses API key to fetch data**
```javascript
// Daily sync job
async function dailySync() {
  const orders = await fetch('http://ipmp-server/api/orders', {
    headers: { 'x-api-key': apiKey }
  });
  
  const analytics = await fetch('http://ipmp-server/api/analytics/overview', {
    headers: { 'x-api-key': apiKey }
  });
  
  // Process and store in external system
  await processOrders(await orders.json());
  await processAnalytics(await analytics.json());
}

// Run daily at midnight
schedule.scheduleJob('0 0 * * *', dailySync);
```

---

## Tools for API Integration

### 1. **Postman** - Test APIs
- Create requests
- Test authentication
- Save collections

### 2. **Swagger/OpenAPI** - Document APIs
- Auto-generate documentation
- Interactive API explorer

### 3. **Zapier/Make** - No-code Integration
- Connect systems without coding
- Create automated workflows

### 4. **Webhooks** - Real-time Notifications
- Send data when events happen
- Push instead of pull

---

## Quick Start: Make Your APIs Accessible

### Option 1: Add API Key Support (Recommended)

I can add API key authentication to your system so other machines can access it without user sessions.

### Option 2: Create Webhook System

I can add webhooks so your system can notify other systems when events happen.

### Option 3: Create Export Endpoints

I can add endpoints that export data in formats other systems can easily consume (CSV, JSON, XML).

---

## Summary

✅ **APIs are the standard way** to share data between systems
✅ **Your system already has APIs** - they're ready to use
✅ **Other systems can call your APIs** using HTTP requests
✅ **You can call external APIs** from your system
✅ **Authentication is important** - use API keys for machine-to-machine

Would you like me to:
1. Add API key authentication for easier integration?
2. Create webhook support for real-time notifications?
3. Add export endpoints (CSV/JSON)?
4. Create API documentation?
