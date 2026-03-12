# Deployment Troubleshooting Guide

## Issue: Can't Create/Delete Tasks or Projects After Deployment

If features work locally but not after deployment, follow these steps:

---

## Step 1: Check if Build is Up to Date

**Problem:** The `dist/` folder contains old compiled code.

**Solution:**
```bash
cd ~/ipmp/ipmp

# Stop the application
pm2 stop ipmp

# Clean old build
rm -rf dist/

# Rebuild everything
npm run build

# Restart
pm2 restart ipmp
```

**Verify:**
```bash
# Check if dist folder exists and has recent files
ls -la dist/
ls -la dist/src/api/routes/
```

---

## Step 2: Check Database Migrations

**Problem:** Database schema is out of sync with code.

**Solution:**
```bash
# Check server logs for migration errors
pm2 logs ipmp | grep -i migration
pm2 logs ipmp | grep -i error

# Restart to trigger migrations
pm2 restart ipmp

# Watch logs during startup
pm2 logs ipmp --lines 50
```

**Look for:**
- ✅ "Database initialized successfully"
- ✅ "Adding [column] column to [table] table..."
- ❌ Any error messages about missing columns/tables

---

## Step 3: Verify Dependencies

**Problem:** Missing or outdated npm packages.

**Solution:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules (important!)
npm rebuild better-sqlite3

# Rebuild application
npm run build
```

---

## Step 4: Check File Permissions

**Problem:** Database file or directories not writable.

**Solution:**
```bash
# Check database file permissions
ls -la ipmp.db

# Fix permissions if needed
chmod 644 ipmp.db
chmod 755 .  # Current directory

# Check if database directory is writable
touch test-write.txt && rm test-write.txt
```

---

## Step 5: Check Server Logs for Errors

**Problem:** Errors are being silently caught.

**Solution:**
```bash
# View recent logs
pm2 logs ipmp --lines 100

# Look for:
# - 500 errors
# - Database errors
# - Permission errors
# - Missing module errors
```

**Common errors:**
- `Cannot find module` → Missing dependency
- `SQLITE_ERROR` → Database issue
- `EACCES` → Permission issue
- `Cannot read property` → Code mismatch

---

## Step 6: Verify API Routes are Loaded

**Problem:** Routes not registered correctly.

**Test manually:**
```bash
# Test if API is responding
curl http://localhost:3000/api/health

# Test if routes exist (should return 401, not 404)
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/projects
```

**If you get 404:**
- Routes not registered
- Check `src/api/server.ts` for route imports
- Verify build includes all route files

---

## Step 7: Check Environment Variables

**Problem:** Missing or incorrect environment variables.

**Solution:**
```bash
# Check current environment
pm2 env 0

# Or check .env file
cat .env

# Verify NODE_ENV
echo $NODE_ENV
```

---

## Step 8: Compare Local vs Production

**Check these differences:**

1. **Node version:**
```bash
# Local
node --version

# Production (SSH into server)
node --version
```

2. **npm version:**
```bash
# Local
npm --version

# Production
npm --version
```

3. **Database file:**
```bash
# Check if database exists
ls -la ipmp.db

# Check database size (should be > 0)
du -h ipmp.db
```

---

## Step 9: Full Clean Rebuild

If nothing else works, do a complete clean rebuild:

```bash
# Stop application
pm2 stop ipmp
pm2 delete ipmp

# Backup database
cp ipmp.db ipmp.db.backup.$(date +%Y%m%d_%H%M%S)

# Clean everything
rm -rf dist/
rm -rf node_modules/
rm package-lock.json

# Reinstall
npm install
npm rebuild better-sqlite3

# Rebuild
npm run build

# Verify build
ls -la dist/server.js
ls -la dist/src/api/routes/

# Start fresh
pm2 start npm --name ipmp -- start
pm2 save
pm2 logs ipmp
```

---

## Step 10: Check Browser Console

**Problem:** Frontend errors preventing API calls.

**Solution:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to create/delete task/project
4. Look for JavaScript errors
5. Check Network tab for failed API calls

**Common frontend issues:**
- CORS errors
- 404 on API calls
- 401 authentication errors
- JavaScript errors

---

## Quick Diagnostic Script

Create this script to check everything:

```bash
#!/bin/bash
# save as check-deployment.sh

echo "=== Deployment Health Check ==="
echo ""

echo "1. Checking Node.js version..."
node --version

echo ""
echo "2. Checking if dist/ exists..."
if [ -d "dist" ]; then
    echo "✅ dist/ exists"
    echo "   Files: $(ls dist/ | wc -l)"
else
    echo "❌ dist/ missing - need to run npm run build"
fi

echo ""
echo "3. Checking if database exists..."
if [ -f "ipmp.db" ]; then
    echo "✅ ipmp.db exists"
    echo "   Size: $(du -h ipmp.db | cut -f1)"
else
    echo "❌ ipmp.db missing"
fi

echo ""
echo "4. Checking PM2 status..."
pm2 list | grep ipmp

echo ""
echo "5. Checking recent logs for errors..."
pm2 logs ipmp --lines 20 --nostream | grep -i error | tail -5

echo ""
echo "6. Testing API health endpoint..."
curl -s http://localhost:3000/api/health || echo "❌ API not responding"

echo ""
echo "=== Check Complete ==="
```

Run it:
```bash
chmod +x check-deployment.sh
./check-deployment.sh
```

---

## Most Common Fix

**90% of the time, the issue is:**

1. **Build not updated** → Run `npm run build`
2. **Old code running** → Restart PM2 after build
3. **Missing dependencies** → Run `npm install`

**Quick fix:**
```bash
pm2 stop ipmp
npm run build
pm2 restart ipmp
pm2 logs ipmp
```

---

## Still Not Working?

If none of the above works, check:

1. **Server logs** - `pm2 logs ipmp --lines 200`
2. **Database integrity** - Check if database is corrupted
3. **Network issues** - Firewall blocking requests
4. **Code differences** - Compare local vs production code
5. **Git status** - Make sure all changes are committed and pulled

---

## Need More Help?

Provide these details:
1. Output of `pm2 logs ipmp --lines 50`
2. Output of `ls -la dist/`
3. Output of `node --version` and `npm --version`
4. Any error messages from browser console
5. Response from `curl http://localhost:3000/api/health`
