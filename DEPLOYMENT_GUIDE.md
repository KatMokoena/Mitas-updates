# Deployment Guide - Safe Updates Without Data Loss

This guide explains how to safely update and deploy the latest version of the application while preserving existing data and ensuring new database tables/columns are properly migrated.

## How Database Migrations Work

The application uses a **two-layer migration system**:

1. **Automatic Migrations** (`runMigrations()` in `src/database/config.ts`)
   - Runs custom SQL to add new columns/tables
   - Checks if columns/tables exist before creating them
   - Preserves all existing data
   - Runs automatically on startup if database exists

2. **TypeORM Synchronize** (`synchronize: true`)
   - Automatically updates schema to match entity definitions
   - Adds new columns/tables based on entity classes
   - **Important**: Only adds new columns/tables, never deletes data

## Safe Deployment Process

### Step 1: Backup Your Database (CRITICAL)

**Before deploying any update, always backup your database:**

```bash
# On Azure/Linux
cd ~/ipmp/ipmp
cp ipmp.db ipmp.db.backup.$(date +%Y%m%d_%H%M%S)

# Or create a backup directory
mkdir -p backups
cp ipmp.db backups/ipmp.db.backup.$(date +%Y%m%d_%H%M%S)
```

**On Windows (if deploying locally):**
```powershell
Copy-Item ipmp.db "ipmp.db.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
```

### Step 2: Stop the Running Application

```bash
# On Azure/Linux with PM2
pm2 stop ipmp

# Or if running directly
# Press Ctrl+C or kill the process
```

### Step 3: Update Application Files

**Option A: Git Pull (Recommended)**
```bash
cd ~/ipmp/ipmp
git pull origin main  # or your branch name
```

**Option B: Manual File Transfer**
- Upload new files via SFTP/SCP
- Replace only the files that changed (don't overwrite `ipmp.db`)

### Step 4: Install/Update Dependencies

```bash
npm install
npm rebuild better-sqlite3  # Important for native modules
```

### Step 5: Build the Application

```bash
npm run build
```

### Step 6: Start the Application

```bash
# With PM2
pm2 restart ipmp

# Or start fresh
pm2 start npm --name ipmp -- start
pm2 save
```

### Step 7: Verify Migration

Check the application logs to ensure migrations ran successfully:

```bash
pm2 logs ipmp
```

Look for messages like:
- ✅ "Adding [column] column to [table] table..."
- ✅ "[table] table created successfully"
- ✅ "Database initialized successfully"

## What Happens During Deployment

### When the Application Starts:

1. **Database Check**: Checks if `ipmp.db` exists
2. **Migration Run**: If database exists, runs `runMigrations()`:
   - Checks each table/column existence
   - Adds missing columns/tables
   - **Never deletes existing data**
3. **TypeORM Synchronize**: Updates schema to match entities
   - Adds new columns from entity definitions
   - Creates new tables if needed
   - **Preserves all existing data**

### Example Migration Flow:

```typescript
// If you add a new column to an entity:
@Column({ nullable: true })
newField?: string;

// On next deployment:
// 1. runMigrations() checks if column exists
// 2. If not, adds: ALTER TABLE table_name ADD COLUMN "newField" varchar;
// 3. Existing rows get NULL for this column (because nullable: true)
// 4. All existing data remains intact
```

## Important Notes

### ✅ Safe Operations (No Data Loss):
- Adding new columns (nullable or with defaults)
- Creating new tables
- Adding indexes
- Updating column types (if compatible)

### ⚠️ Operations That Require Care:
- **Removing columns**: TypeORM synchronize will NOT remove columns automatically
- **Renaming columns**: Requires manual migration
- **Changing column types**: May require data conversion

### 🔴 Dangerous Operations (Require Manual Migration):
- Dropping tables
- Removing columns
- Changing primary keys
- Complex data transformations

## Rollback Procedure

If something goes wrong:

```bash
# 1. Stop the application
pm2 stop ipmp

# 2. Restore database backup
cp backups/ipmp.db.backup.YYYYMMDD_HHMMSS ipmp.db

# 3. Restore previous code version
git checkout <previous-commit-hash>
# OR restore previous files manually

# 4. Rebuild and restart
npm run build
pm2 restart ipmp
```

## Best Practices

### 1. Always Backup Before Deployment
```bash
# Create a backup script
#!/bin/bash
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
cp ipmp.db "$BACKUP_DIR/ipmp.db.$(date +%Y%m%d_%H%M%S)"
echo "Backup created: $BACKUP_DIR/ipmp.db.$(date +%Y%m%d_%H%M%S)"
```

### 2. Test Migrations Locally First
- Test on a copy of production database
- Verify all migrations run successfully
- Check that existing data is preserved

### 3. Monitor Logs After Deployment
```bash
# Watch logs in real-time
pm2 logs ipmp --lines 100

# Check for errors
pm2 logs ipmp | grep -i error
```

### 4. Version Control Your Database Schema
- Keep entity definitions in Git
- Document manual migrations in code comments
- Tag releases in Git for easy rollback

### 5. Database File Location
The database file `ipmp.db` is located in the project root:
- **Local**: `C:\SelfBuilds\Mitas Internal Project Management Platform (IPMP)\ipmp\ipmp.db`
- **Azure**: `~/ipmp/ipmp/ipmp.db`

**Important**: Never delete or overwrite this file during deployment!

## Automated Deployment Script

Create a `deploy.sh` script for easier deployments:

```bash
#!/bin/bash
set -e  # Exit on error

echo "=== Starting Deployment ==="

# Step 1: Backup
echo "1. Creating database backup..."
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
cp ipmp.db "$BACKUP_DIR/ipmp.db.$(date +%Y%m%d_%H%M%S)" || echo "Warning: Could not backup database (may not exist)"

# Step 2: Stop application
echo "2. Stopping application..."
pm2 stop ipmp || echo "Application not running"

# Step 3: Update code
echo "3. Updating code..."
git pull origin main || echo "Warning: Git pull failed, continuing..."

# Step 4: Install dependencies
echo "4. Installing dependencies..."
npm install

# Step 5: Rebuild native modules
echo "5. Rebuilding native modules..."
npm rebuild better-sqlite3

# Step 6: Build application
echo "6. Building application..."
npm run build

# Step 7: Start application
echo "7. Starting application..."
pm2 restart ipmp || pm2 start npm --name ipmp -- start
pm2 save

echo "=== Deployment Complete ==="
echo "Check logs with: pm2 logs ipmp"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Troubleshooting

### Issue: "Database locked" error
**Solution**: Ensure the application is fully stopped before deployment
```bash
pm2 stop ipmp
# Wait a few seconds
pm2 restart ipmp
```

### Issue: Migrations not running
**Solution**: Check if database exists and has correct permissions
```bash
ls -la ipmp.db
chmod 644 ipmp.db  # Ensure readable
```

### Issue: New columns not appearing
**Solution**: Check entity definitions match database schema
- Verify `@Column()` decorators are correct
- Check migration logs for errors
- Ensure `synchronize: true` is enabled

### Issue: Data missing after deployment
**Solution**: Restore from backup immediately
```bash
pm2 stop ipmp
cp backups/ipmp.db.backup.YYYYMMDD_HHMMSS ipmp.db
pm2 restart ipmp
```

## Summary

✅ **Safe Deployment Checklist:**
1. ✅ Backup database
2. ✅ Stop application
3. ✅ Update code
4. ✅ Install dependencies
5. ✅ Rebuild native modules
6. ✅ Build application
7. ✅ Start application
8. ✅ Verify migrations in logs
9. ✅ Test application functionality

The migration system is designed to be **safe by default** - it only adds new columns/tables and never deletes data. As long as you backup before deployment, you can safely rollback if needed.
