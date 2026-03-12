#!/bin/bash
# Stop IPMP Application Script

echo "=========================================="
echo "  Stopping IPMP Application"
echo "=========================================="
echo ""

# Step 1: Stop PM2 processes
echo "Step 1: Stopping PM2 processes..."
if pm2 list | grep -q "ipmp"; then
    pm2 stop ipmp
    pm2 delete ipmp
    echo "✅ PM2 process stopped and removed"
else
    echo "ℹ️  No PM2 process named 'ipmp' found"
fi

# Step 2: Check for other node processes
echo ""
echo "Step 2: Checking for other Node.js processes..."
NODE_PROCESSES=$(ps aux | grep -E "node|dist/server.js" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    echo "⚠️  Found $NODE_PROCESSES Node.js process(es) still running:"
    ps aux | grep -E "node|dist/server.js" | grep -v grep
    echo ""
    read -p "Kill these processes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -9 -f "dist/server.js"
        pkill -9 -f "node.*start"
        echo "✅ Node.js processes killed"
    fi
else
    echo "✅ No other Node.js processes found"
fi

# Step 3: Check port 3000
echo ""
echo "Step 3: Checking port 3000..."
if lsof -i :3000 > /dev/null 2>&1 || netstat -tulpn 2>/dev/null | grep -q :3000; then
    echo "⚠️  Port 3000 is still in use:"
    lsof -i :3000 2>/dev/null || netstat -tulpn 2>/dev/null | grep :3000
    echo ""
    read -p "Kill process using port 3000? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :3000 | xargs kill -9 2>/dev/null || fuser -k 3000/tcp 2>/dev/null
        echo "✅ Port 3000 freed"
    fi
else
    echo "✅ Port 3000 is free"
fi

# Step 4: Final verification
echo ""
echo "Step 4: Final verification..."
echo "=========================================="
pm2 list
echo ""
echo "Port 3000 status:"
netstat -tulpn 2>/dev/null | grep :3000 || echo "Port 3000 is free"
echo ""

echo "=========================================="
echo "  Application Stop Complete!"
echo "=========================================="
echo ""
echo "The application should now be stopped."
echo "To start it again, run: pm2 start npm --name ipmp -- start"
