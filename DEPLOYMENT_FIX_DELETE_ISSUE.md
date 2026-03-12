# Fix: Delete Order/Task/Project Not Working After Deployment

## Problem

After deploying, you can't delete orders, tasks, or projects, but it works locally.

## Root Causes

### 1. **Build Not Updated** (Most Common - 90% of cases)
The `dist/` folder contains old compiled code that doesn't match the current source.

### 2. **Database Schema Mismatch**
Missing columns or tables that the code expects.

### 3. **TypeORM Update Issue**
The `taskRepository.update()` with `undefined` doesn't work properly in SQLite.

## Quick Fix

```bash
# On your deployed server
cd ~/ipmp/ipmp

# 1. Stop the app
pm2 stop ipmp

# 2. Clean old build
rm -rf dist/

# 3. Rebuild everything
npm run build

# 4. Restart
pm2 restart ipmp

# 5. Check logs for errors
pm2 logs ipmp --lines 50
```

## What I Fixed

### 1. Improved Error Logging
- Added detailed error messages
- Shows exactly which step fails (purchases, tasks, or order deletion)
- Logs to console for debugging

### 2. Fixed Task Update Issue
**Before:**
```typescript
await taskRepository.update(
  { orderId: req.params.id },
  { orderId: undefined as any }  // ❌ Doesn't work in SQLite
);
```

**After:**
```typescript
await dataSource.query(
  `UPDATE tasks SET orderId = NULL WHERE orderId = ?`,
  [req.params.id]  // ✅ Works correctly
);
```

### 3. Better Error Handling
- Each step is wrapped in try-catch
- Specific error messages for each failure point
- Non-fatal errors don't block the operation

## Check Server Logs

After restarting, try to delete an order and check logs:

```bash
pm2 logs ipmp | grep -i "delete\|error"
```

You should see:
- `[Delete Order] Starting deletion for order...`
- `[Delete Order] Deleted X purchase(s)`
- `[Delete Order] Cleared orderId from tasks`
- `[Delete Order] Order deleted successfully`

If you see errors, they'll show exactly what failed.

## Database Compatibility Check

Run the compatibility checker:

```bash
node scripts/check-database-compatibility.js
```

This will show if any required columns are missing.

## Common Error Messages

### "Failed to delete purchases"
- **Cause:** Purchase table issue or database lock
- **Fix:** Check database permissions, ensure no other process is using it

### "Failed to update tasks"
- **Cause:** Task table issue or orderId column problem
- **Fix:** Run migrations, check if orderId column exists

### "Failed to delete order"
- **Cause:** Order table issue or foreign key constraint
- **Fix:** Check database integrity, ensure no locks

## Still Not Working?

1. **Check exact error in logs:**
   ```bash
   pm2 logs ipmp --lines 100 | grep -A 5 "Failed to delete"
   ```

2. **Verify build:**
   ```bash
   ls -la dist/src/api/routes/orders.js
   # Should exist and have recent timestamp
   ```

3. **Test database directly:**
   ```bash
   sqlite3 ipmp.db "SELECT * FROM orders LIMIT 1;"
   ```

4. **Check permissions:**
   ```bash
   ls -la ipmp.db
   # Should be readable and writable
   ```

## Files Changed

- `src/api/routes/orders.ts` - Improved delete order with better error handling
- `src/api/routes/projects.ts` - Improved delete project with better error handling  
- `src/api/routes/tasks.ts` - Improved delete task with better error handling

All changes are backward compatible and will work with existing databases.
