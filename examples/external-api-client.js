/**
 * Example: How to call IPMP APIs from an external system
 * 
 * This shows how another machine/platform can access your IPMP data
 */

// ============================================
// Example 1: Fetch Orders from IPMP
// ============================================

async function fetchOrdersFromIPMP() {
  const IPMP_BASE_URL = 'http://your-ipmp-server:3000';
  const API_KEY = 'your-api-key-here'; // Or session ID

  try {
    const response = await fetch(`${IPMP_BASE_URL}/api/orders`, {
      headers: {
        'x-api-key': API_KEY, // Or 'x-session-id' for session-based
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const orders = await response.json();
    console.log('Fetched orders:', orders);
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

// ============================================
// Example 2: Create Order in IPMP
// ============================================

async function createOrderInIPMP(orderData) {
  const IPMP_BASE_URL = 'http://your-ipmp-server:3000';
  const API_KEY = 'your-api-key-here';

  try {
    const response = await fetch(`${IPMP_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        deadline: orderData.deadline,
        priority: orderData.priority || 'medium',
        description: orderData.description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    const newOrder = await response.json();
    console.log('Created order:', newOrder);
    return newOrder;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// ============================================
// Example 3: Get Dashboard Analytics
// ============================================

async function getDashboardData() {
  const IPMP_BASE_URL = 'http://your-ipmp-server:3000';
  const API_KEY = 'your-api-key-here';

  try {
    const response = await fetch(`${IPMP_BASE_URL}/api/analytics/overview`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const analytics = await response.json();
    console.log('Dashboard data:', analytics);
    
    // Use in your external dashboard
    return {
      totalOrders: analytics.orders.total,
      onTimeRate: analytics.orders.onTimeRate,
      taskCompletion: analytics.tasks.completionRate,
      totalHours: analytics.timeTracking.totalHours
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
}

// ============================================
// Example 4: Update Order Status via Webhook
// ============================================

async function updateOrderStatusInIPMP(orderNumber, newStatus) {
  const IPMP_BASE_URL = 'http://your-ipmp-server:3000';
  const WEBHOOK_SECRET = 'your-webhook-secret';

  try {
    const response = await fetch(`${IPMP_BASE_URL}/api/webhooks/order-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET // For security
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        status: newStatus,
        externalId: 'external-system-id-123' // Track where update came from
      })
    });

    const result = await response.json();
    console.log('Order updated:', result);
    return result;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

// ============================================
// Example 5: Scheduled Sync (Node.js)
// ============================================

const cron = require('node-cron');

// Sync orders every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly sync...');
  
  try {
    const orders = await fetchOrdersFromIPMP();
    const analytics = await getDashboardData();
    
    // Process and store in your external system
    await processOrders(orders);
    await updateDashboard(analytics);
    
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
  }
});

// ============================================
// Example 6: Python Client
// ============================================

/*
# Python example
import requests

IPMP_BASE_URL = 'http://your-ipmp-server:3000'
API_KEY = 'your-api-key-here'

def fetch_orders():
    response = requests.get(
        f'{IPMP_BASE_URL}/api/orders',
        headers={
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        }
    )
    response.raise_for_status()
    return response.json()

# Use it
orders = fetch_orders()
print(f"Found {len(orders)} orders")
*/

// ============================================
// Example 7: cURL (Command Line)
// ============================================

/*
# Get all orders
curl -X GET http://your-ipmp-server:3000/api/orders \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json"

# Create order
curl -X POST http://your-ipmp-server:3000/api/orders \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "ORD-001",
    "customerName": "Acme Corp",
    "deadline": "2024-02-01T00:00:00Z",
    "priority": "high"
  }'

# Get analytics
curl -X GET http://your-ipmp-server:3000/api/analytics/overview \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json"
*/

// Export functions for use in other files
module.exports = {
  fetchOrdersFromIPMP,
  createOrderInIPMP,
  getDashboardData,
  updateOrderStatusInIPMP
};
