# Login Troubleshooting Guide

If you're experiencing "Login Failed" errors, follow these steps to diagnose and fix the issue.

## Quick Diagnosis Steps

### 1. Check Server Logs

When the server starts, you should see:
```
Initializing database...
Database initialized successfully
Database seeded successfully
✅ All services initialized successfully
🚀 Server running at http://localhost:3000
✅ Database is ready - login should work
```

If you see errors instead, note them down.

### 2. Check Database Health

Visit or curl the health check endpoint:
```bash
curl http://localhost:3000/api/auth/health
```

Or in your browser: `http://your-vm-ip:3000/api/auth/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "message": "Database is ready"
}
```

If you see `"status": "not_initialized"` or `"status": "error"`, the database is not ready.

### 3. Check Database File

On your Ubuntu VM, verify the database file exists and has correct permissions:

```bash
# Find the database file
find /path/to/your/app -name "ipmp.db"

# Check if it exists and permissions
ls -la ipmp.db

# Check file size (should not be 0)
du -h ipmp.db
```

The database file should:
- Exist in the project root directory
- Have read/write permissions for the user running the app
- Not be corrupted (size > 0)

### 4. Check Server Console Output

Look for these error messages:

**"Database not initialized"**
- The database initialization failed or hasn't completed
- Check the full error message in server logs
- Common causes: file permissions, disk space, path issues

**"Database path (absolute): [path]"**
- Check if this path is correct for your VM
- Ensure the directory exists and is writable

**"Error initializing database"**
- Check the full error message
- Common issues:
  - SQLite library not installed (`better-sqlite3` native module)
  - File permissions
  - Disk space
  - Path resolution issues

## Common Issues and Solutions

### Issue 1: Database File Not Found

**Symptoms:**
- Server starts but login fails
- Health check shows "not_initialized"
- Logs show "Database path exists: false"

**Solution:**
1. Check the database path in server logs
2. Ensure the directory exists:
   ```bash
   mkdir -p /path/to/your/app
   ```
3. If the database file doesn't exist, it should be created automatically on first run
4. Check file permissions:
   ```bash
   chmod 664 ipmp.db
   chown your-user:your-group ipmp.db
   ```

### Issue 2: Database Initialization Fails Silently

**Symptoms:**
- Server starts but database isn't ready
- No clear error message

**Solution:**
1. Check server startup logs carefully
2. Look for any error messages during initialization
3. Try running the server with more verbose logging
4. Check if `better-sqlite3` is properly installed:
   ```bash
   npm list better-sqlite3
   ```
5. Rebuild native modules if needed:
   ```bash
   npm rebuild better-sqlite3
   ```

### Issue 3: Permission Denied

**Symptoms:**
- Error: "EACCES: permission denied"
- Database file exists but can't be written to

**Solution:**
```bash
# Check current permissions
ls -la ipmp.db

# Fix permissions (adjust user/group as needed)
sudo chown $USER:$USER ipmp.db
chmod 664 ipmp.db

# Ensure directory is writable
chmod 755 /path/to/your/app
```

### Issue 4: Database Corrupted

**Symptoms:**
- Database file exists but queries fail
- SQLite errors in logs

**Solution:**
1. **BACKUP FIRST:**
   ```bash
   cp ipmp.db ipmp.db.backup
   ```

2. Try to repair:
   ```bash
   sqlite3 ipmp.db "PRAGMA integrity_check;"
   ```

3. If corrupted, restore from backup or reinitialize:
   ```bash
   # Remove corrupted database (BACKUP FIRST!)
   mv ipmp.db ipmp.db.corrupted
   
   # Restart server - it will create a new database
   # Then restore data from backup if possible
   ```

### Issue 5: Path Resolution Issues on VM

**Symptoms:**
- Database path is wrong
- Works on Windows but not on Ubuntu VM

**Solution:**
1. Check the absolute path in server logs: `Database path (absolute): [path]`
2. Verify this path is correct for your VM
3. The path should be absolute and point to your project root
4. If using a different working directory, ensure you start the server from the project root:
   ```bash
   cd /path/to/your/app
   npm start
   ```

### Issue 6: Server Starts Before Database is Ready

**Symptoms:**
- Server accepts connections but login fails immediately
- Health check shows "not_initialized"

**Solution:**
This should be fixed in the latest code. The server now waits for database initialization before accepting requests. If you still see this:

1. Check server startup logs - database initialization should complete before "Server running" message
2. Wait a few seconds after server starts before trying to login
3. Check the health endpoint first: `/api/auth/health`

## Testing Steps

1. **Start the server and watch logs:**
   ```bash
   npm start
   ```

2. **Wait for initialization to complete** - look for:
   ```
   ✅ All services initialized successfully
   ✅ Database is ready - login should work
   ```

3. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/auth/health
   ```

4. **Try login** - if it still fails, check:
   - Server console for error messages
   - Network tab in browser for response details
   - Database file exists and is accessible

## Getting More Information

### Enable Verbose Logging

The server now logs more details. Check for:
- Database path resolution
- Initialization errors
- Login attempt details (email, success/failure reasons)

### Check Database Contents

If you want to verify users exist:

```bash
sqlite3 ipmp.db "SELECT email, role FROM users;"
```

### Verify Database Schema

```bash
sqlite3 ipmp.db ".tables"
sqlite3 ipmp.db ".schema users"
```

## Still Having Issues?

1. **Check all server logs** from startup to login attempt
2. **Verify database file** exists and is accessible
3. **Test health endpoint** to confirm database status
4. **Check file permissions** on database file and directory
5. **Verify better-sqlite3** is installed and working
6. **Check disk space** - database needs space to write

## Contact Information

If the issue persists, provide:
- Full server startup logs
- Response from `/api/auth/health` endpoint
- Database file location and permissions
- Error messages from login attempt
- Operating system and Node.js version

