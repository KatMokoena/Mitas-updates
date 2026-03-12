/**
 * Test script to diagnose delete order issues
 * Run with: node scripts/test-delete-order.js <order-id>
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function findDatabase() {
  const possiblePaths = [
    path.join(process.cwd(), 'ipmp.db'),
    path.join(process.cwd(), '..', 'ipmp.db'),
    path.join(__dirname, '..', 'ipmp.db'),
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }

  return null;
}

const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node scripts/test-delete-order.js <order-id>');
  process.exit(1);
}

const dbPath = findDatabase();

if (!dbPath) {
  console.error('Database not found!');
  process.exit(1);
}

console.log('Testing delete order operation...');
console.log(`Order ID: ${orderId}`);
console.log(`Database: ${dbPath}\n`);

try {
  const db = new Database(dbPath);

  // Check if order exists
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    console.log('❌ Order not found');
    db.close();
    process.exit(1);
  }

  console.log('✅ Order found:');
  console.log(`   Order Number: ${order.orderNumber}`);
  console.log(`   Status: ${order.status}\n`);

  // Check related purchases
  const purchases = db.prepare('SELECT * FROM purchases WHERE orderId = ?').all(orderId);
  console.log(`📦 Related purchases: ${purchases.length}`);
  if (purchases.length > 0) {
    console.log('   Purchase IDs:', purchases.map(p => p.id).join(', '));
  }

  // Check related tasks
  const tasks = db.prepare('SELECT * FROM tasks WHERE orderId = ?').all(orderId);
  console.log(`📋 Related tasks: ${tasks.length}`);
  if (tasks.length > 0) {
    console.log('   Task IDs:', tasks.map(t => t.id).join(', '));
  }

  // Check for foreign key constraints
  console.log('\n🔍 Checking for foreign key constraints...');
  const fkInfo = db.prepare('PRAGMA foreign_key_list(orders)').all();
  if (fkInfo.length > 0) {
    console.log('   Foreign keys found:', fkInfo);
  } else {
    console.log('   No foreign key constraints on orders table');
  }

  // Test delete operations (dry run)
  console.log('\n🧪 Testing delete operations (dry run)...');
  
  try {
    // Test delete purchases
    if (purchases.length > 0) {
      console.log('   Testing purchase deletion...');
      const deletePurchases = db.prepare('DELETE FROM purchases WHERE orderId = ?');
      // Don't actually execute, just prepare
      console.log('   ✅ Purchase delete query prepared successfully');
    }

    // Test update tasks
    if (tasks.length > 0) {
      console.log('   Testing task update...');
      const updateTasks = db.prepare('UPDATE tasks SET orderId = NULL WHERE orderId = ?');
      // Don't actually execute
      console.log('   ✅ Task update query prepared successfully');
    }

    // Test delete order
    console.log('   Testing order deletion...');
    const deleteOrder = db.prepare('DELETE FROM orders WHERE id = ?');
    console.log('   ✅ Order delete query prepared successfully');

    console.log('\n✅ All delete operations can be prepared');
    console.log('   The issue might be:');
    console.log('   1. Database permissions');
    console.log('   2. Database lock');
    console.log('   3. Code error in the delete endpoint');
    console.log('   4. Missing repository initialization');

  } catch (testError) {
    console.error('   ❌ Error preparing delete operations:', testError.message);
  }

  db.close();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
