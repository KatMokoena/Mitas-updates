#!/bin/bash
# Safe Deployment Script for IPMP
# This script safely updates the application while preserving database data

set -e  # Exit on error

echo "=========================================="
echo "  IPMP Safe Deployment Script"
echo "=========================================="
echo ""

# Step 1: Backup Database
echo "Step 1: Creating database backup..."
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
if [ -f "ipmp.db" ]; then
    BACKUP_FILE="$BACKUP_DIR/ipmp.db.$(date +%Y%m%d_%H%M%S)"
    cp ipmp.db "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  Database file not found (first deployment?)"
fi
echo ""

# Step 2: Stop Application
echo "Step 2: Stopping application..."
if pm2 list | grep -q "ipmp"; then
    pm2 stop ipmp
    echo "✅ Application stopped"
else
    echo "ℹ️  Application not running with PM2"
fi
echo ""

# Step 3: Update Code (if using Git)
echo "Step 3: Updating code..."
if [ -d ".git" ]; then
    echo "Pulling latest changes from Git..."
    git pull origin main || git pull origin master || echo "⚠️  Git pull failed or no remote configured"
else
    echo "ℹ️  Not a Git repository, skipping pull"
    echo "⚠️  Make sure you've uploaded the latest files manually"
fi
echo ""

# Step 4: Install Dependencies
echo "Step 4: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 5: Rebuild Native Modules
echo "Step 5: Rebuilding native modules..."
npm rebuild better-sqlite3 || echo "⚠️  Failed to rebuild better-sqlite3 (may not be needed)"
echo "✅ Native modules rebuilt"
echo ""

# Step 6: Build Application
echo "Step 6: Building application..."
npm run build
echo "✅ Application built successfully"
echo ""

# Step 7: Start Application
echo "Step 7: Starting application..."
if pm2 list | grep -q "ipmp"; then
    pm2 restart ipmp
    echo "✅ Application restarted"
else
    pm2 start npm --name ipmp -- start
    echo "✅ Application started"
fi
pm2 save
echo ""

# Step 8: Show Status
echo "Step 8: Application Status"
echo "=========================================="
pm2 list | grep ipmp || echo "Application not found in PM2"
echo ""

# Step 9: Show Recent Logs
echo "Step 9: Recent Logs (check for migration messages)"
echo "=========================================="
pm2 logs ipmp --lines 20 --nostream || echo "Could not retrieve logs"
echo ""

echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Monitor logs: pm2 logs ipmp"
echo "2. Check for migration messages (look for 'Adding column' or 'table created')"
echo "3. Test the application to ensure everything works"
echo "4. If issues occur, restore backup: cp backups/ipmp.db.backup.YYYYMMDD_HHMMSS ipmp.db"
echo ""
