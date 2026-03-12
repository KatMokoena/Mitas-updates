# Stop IPMP Application on Azure Server

## Server Details
- **IP Address**: 4.221.123.103
- **Issue**: Application still running after stopping deployment

## Step-by-Step Commands

### 1. Connect to Azure Server
```bash
ssh MITAS_IPMP@4.221.123.103
```

### 2. Navigate to Project Directory
```bash
cd ~/ipmp/ipmp
```

### 3. Check Current PM2 Status
```bash
pm2 list
```
This will show all running PM2 processes. Look for processes named "ipmp" or similar.

### 4. Stop All PM2 Processes
```bash
# Stop the application
pm2 stop all

# Delete all PM2 processes (removes them from PM2's list)
pm2 delete all
```

### 5. Check for Other Node Processes
```bash
# See all Node.js processes
ps aux | grep node | grep -v grep

# See what's using port 3000
netstat -tulpn | grep :3000
# OR
lsof -i :3000
```

### 6. Kill Any Remaining Processes

If you see processes still running:

**Option A: Kill by Process ID**
```bash
# Find the PID (Process ID) from the ps aux output
# Then kill it (replace XXXX with actual PID)
kill -9 XXXX
```

**Option B: Kill All Node Processes (Nuclear Option)**
```bash
# Kill all node processes
pkill -9 node

# OR kill specific process by name
pkill -9 -f "dist/server.js"
pkill -9 -f "npm.*start"
```

**Option C: Kill Process Using Port 3000**
```bash
# Find and kill process using port 3000
lsof -ti :3000 | xargs kill -9

# OR if lsof is not available
fuser -k 3000/tcp
```

### 7. Verify Application is Stopped
```bash
# Check PM2 (should be empty)
pm2 list

# Check port 3000 (should show nothing)
netstat -tulpn | grep :3000

# Check Node processes (should show nothing related to your app)
ps aux | grep -E "node|dist/server.js" | grep -v grep

# Try to access the app (should fail)
curl http://localhost:3000
```

### 8. Disable PM2 Startup (Optional)
If PM2 is set to start on boot, disable it:
```bash
pm2 unstartup systemd
```

## Quick One-Liner to Stop Everything

If you want to stop everything quickly, run this sequence:

```bash
cd ~/ipmp/ipmp && \
pm2 stop all && \
pm2 delete all && \
pkill -9 -f "dist/server.js" && \
pkill -9 -f "npm.*start" && \
lsof -ti :3000 | xargs kill -9 2>/dev/null; \
echo "Application stopped. Verifying..." && \
pm2 list && \
netstat -tulpn | grep :3000 || echo "Port 3000 is free"
```

## Troubleshooting

### If PM2 commands don't work:
```bash
# Check if PM2 is installed
which pm2

# Check PM2 version
pm2 --version

# If PM2 is not found, it might be in a different location
~/.nvm/versions/node/*/bin/pm2 list
```

### If you get "Permission denied":
```bash
# You might need sudo (but be careful)
sudo pm2 stop all
sudo pm2 delete all
```

### If the app restarts automatically:
This might be because PM2 is configured to auto-restart. Check:
```bash
# Check PM2 ecosystem file
cat ecosystem.config.js

# Check systemd service
systemctl status pm2-MITAS_IPMP

# Stop systemd service
sudo systemctl stop pm2-MITAS_IPMP
```

## After Stopping

Once the application is stopped, you can:
1. Update files
2. Rebuild the application
3. Start it again when ready

To start again:
```bash
cd ~/ipmp/ipmp
pm2 start npm --name ipmp -- start
pm2 save
```
