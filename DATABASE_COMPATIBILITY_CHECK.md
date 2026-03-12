# Database Compatibility Check

## Quick Check

Run this to verify your database schema matches the current code:

```bash
node scripts/check-database-compatibility.js
```

This will check:
- ✅ All required tables exist
- ✅ All required columns exist
- ✅ Schema matches current code requirements

---

## Required Schema

### Tasks Table
**Critical columns for task creation:**
- `assignedUserName` (nullable)
- `assignedUserSurname` (nullable)
- `assignedUserEmail` (nullable)

**All columns:**
- id, projectId, orderId, title, description, status
- startDate, endDate, estimatedDays
- assignedUserId, assignedUserName, assignedUserSurname, assignedUserEmail
- plannedStartDateTime, plannedEndDateTime, actualStartDateTime, actualEndDateTime
- resourceIds, purchaseIds, deliverableIds, dependencies
- isCritical, slackDays, milestone
- createdAt, updatedAt

### Projects Table
**Critical columns for project creation:**
- `departmentId` (nullable)
- `ownerId` (nullable)
- `ownerName` (nullable)
- `ownerSurname` (nullable)
- `ownerEmail` (nullable)

**All columns:**
- id, title, description, status, components, assignedTeamIds
- departmentId, ownerId, ownerName, ownerSurname, ownerEmail
- startDate, endDate
- createdAt, updatedAt

### Orders Table
**Critical columns:**
- `departmentId` (nullable)
- `createdBy` (nullable)
- `createdByName` (nullable)
- `createdBySurname` (nullable)
- `createdByEmail` (nullable)
- `completedDate` (nullable)

---

## If Compatibility Issues Found

### Option 1: Automatic Migration (Recommended)

The system automatically runs migrations on startup. Just restart:

```bash
pm2 stop ipmp
npm run build
pm2 restart ipmp
pm2 logs ipmp | grep -i migration
```

Look for messages like:
- ✅ "Adding assignedUserName column to tasks table..."
- ✅ "Adding departmentId column to projects table..."
- ✅ "Database initialized successfully"

### Option 2: Manual SQL (If migrations fail)

If automatic migrations don't work, you can run SQL manually:

```sql
-- Add missing task columns
ALTER TABLE tasks ADD COLUMN "assignedUserName" varchar;
ALTER TABLE tasks ADD COLUMN "assignedUserSurname" varchar;
ALTER TABLE tasks ADD COLUMN "assignedUserEmail" varchar;

-- Add missing project columns
ALTER TABLE projects ADD COLUMN "departmentId" varchar;
ALTER TABLE projects ADD COLUMN "ownerId" varchar;
ALTER TABLE projects ADD COLUMN "ownerName" varchar;
ALTER TABLE projects ADD COLUMN "ownerSurname" varchar;
ALTER TABLE projects ADD COLUMN "ownerEmail" varchar;

-- Add missing order columns
ALTER TABLE orders ADD COLUMN "departmentId" varchar;
ALTER TABLE orders ADD COLUMN "createdBy" varchar;
ALTER TABLE orders ADD COLUMN "createdByName" varchar;
ALTER TABLE orders ADD COLUMN "createdBySurname" varchar;
ALTER TABLE orders ADD COLUMN "createdByEmail" varchar;
ALTER TABLE orders ADD COLUMN "completedDate" datetime;
```

---

## Common Issues

### Issue: "Cannot read property 'assignedUserName' of undefined"

**Cause:** `assignedUserName` column missing from tasks table

**Fix:** Run migrations or add column manually (see above)

### Issue: "Cannot create project - departmentId required"

**Cause:** `departmentId` column missing from projects table

**Fix:** Run migrations or add column manually

### Issue: "SQLITE_ERROR: no such column: completedDate"

**Cause:** `completedDate` column missing from orders table

**Fix:** Run migrations or add column manually

---

## Verification

After fixing, verify:

```bash
# Check compatibility
node scripts/check-database-compatibility.js

# Should output:
# ✅ Database schema is compatible!
#    All required tables and columns are present.
```

---

## Migration Log

The system logs all migrations. Check logs:

```bash
pm2 logs ipmp | grep -i "adding\|creating\|migration"
```

You should see:
- "Adding [column] column to [table] table..."
- "[table] table created successfully"
- "Database initialized successfully"
