/**
 * Database Compatibility Checker
 * 
 * This script checks if the database schema matches the current code requirements
 * Run with: node scripts/check-database-compatibility.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Find database file
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

// Required columns for each table
const REQUIRED_SCHEMA = {
  tasks: [
    'id', 'projectId', 'orderId', 'title', 'description', 'status',
    'startDate', 'endDate', 'estimatedDays', 'assignedUserId',
    'assignedUserName', 'assignedUserSurname', 'assignedUserEmail', // Critical for task creation
    'plannedStartDateTime', 'plannedEndDateTime', 'actualStartDateTime', 'actualEndDateTime',
    'resourceIds', 'purchaseIds', 'deliverableIds', 'dependencies',
    'isCritical', 'slackDays', 'milestone', 'createdAt', 'updatedAt'
  ],
  projects: [
    'id', 'title', 'description', 'status', 'components', 'assignedTeamIds',
    'departmentId', // Critical for project creation
    'ownerId', 'ownerName', 'ownerSurname', 'ownerEmail', // Critical for project creation
    'startDate', 'endDate', 'createdAt', 'updatedAt'
  ],
  orders: [
    'id', 'orderNumber', 'customerName', 'description', 'deadline', 'status', 'priority',
    'departmentId', 'createdBy', 'createdByName', 'createdBySurname', 'createdByEmail',
    'equipmentIds', 'completedDate', 'createdAt', 'updatedAt'
  ],
  users: [
    'id', 'name', 'surname', 'email', 'passwordHash', 'role', 'departmentId',
    'needsPasswordChange', 'createdAt', 'updatedAt'
  ]
};

function checkTable(db, tableName, requiredColumns) {
  console.log(`\n📋 Checking table: ${tableName}`);
  
  // Check if table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);

  if (!tableExists) {
    console.log(`   ❌ Table '${tableName}' does NOT exist!`);
    return { exists: false, missingColumns: requiredColumns };
  }

  console.log(`   ✅ Table exists`);

  // Get actual columns
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const actualColumnNames = columns.map(col => col.name);

  // Check for missing columns
  const missingColumns = requiredColumns.filter(col => !actualColumnNames.includes(col));
  const extraColumns = actualColumnNames.filter(col => !requiredColumns.includes(col));

  if (missingColumns.length > 0) {
    console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
  } else {
    console.log(`   ✅ All required columns present`);
  }

  if (extraColumns.length > 0) {
    console.log(`   ℹ️  Extra columns (not required): ${extraColumns.join(', ')}`);
  }

  // Show all columns
  console.log(`   📊 Total columns: ${actualColumnNames.length}`);
  console.log(`   📝 Columns: ${actualColumnNames.join(', ')}`);

  return {
    exists: true,
    missingColumns,
    extraColumns,
    allColumns: actualColumnNames
  };
}

function main() {
  console.log('='.repeat(60));
  console.log('Database Compatibility Checker');
  console.log('='.repeat(60));

  const dbPath = findDatabase();
  
  if (!dbPath) {
    console.error('\n❌ Database file (ipmp.db) not found!');
    console.error('   Searched in:');
    console.error('   - ' + path.join(process.cwd(), 'ipmp.db'));
    console.error('   - ' + path.join(process.cwd(), '..', 'ipmp.db'));
    process.exit(1);
  }

  console.log(`\n📁 Database found: ${dbPath}`);
  console.log(`   Size: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    console.log('   ✅ Database opened successfully\n');
  } catch (error) {
    console.error(`\n❌ Failed to open database: ${error.message}`);
    process.exit(1);
  }

  const results = {};
  let hasErrors = false;

  // Check each required table
  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
    const result = checkTable(db, tableName, requiredColumns);
    results[tableName] = result;
    
    if (!result.exists || result.missingColumns.length > 0) {
      hasErrors = true;
    }
  }

  // Check for project_analysis table (newly added)
  console.log(`\n📋 Checking table: project_analysis`);
  const analysisTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='project_analysis'
  `).get();
  
  if (analysisTable) {
    console.log(`   ✅ project_analysis table exists`);
  } else {
    console.log(`   ⚠️  project_analysis table missing (optional, for analysis feature)`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  if (hasErrors) {
    console.log('\n❌ COMPATIBILITY ISSUES FOUND!\n');
    
    for (const [tableName, result] of Object.entries(results)) {
      if (!result.exists) {
        console.log(`   ❌ ${tableName}: Table missing`);
      } else if (result.missingColumns.length > 0) {
        console.log(`   ❌ ${tableName}: Missing ${result.missingColumns.length} column(s)`);
        console.log(`      Missing: ${result.missingColumns.join(', ')}`);
      }
    }

    console.log('\n🔧 FIX: Restart the application to run migrations');
    console.log('   The migrations will automatically add missing columns/tables.');
    console.log('\n   Steps:');
    console.log('   1. Stop the application: pm2 stop ipmp');
    console.log('   2. Rebuild: npm run build');
    console.log('   3. Start: pm2 restart ipmp');
    console.log('   4. Check logs: pm2 logs ipmp | grep -i migration');
    
    db.close();
    process.exit(1);
  } else {
    console.log('\n✅ Database schema is compatible!');
    console.log('   All required tables and columns are present.\n');
    
    db.close();
    process.exit(0);
  }
}

main();
