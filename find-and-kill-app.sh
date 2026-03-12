#!/bin/bash
# Find and Kill IPMP Application Process

echo "=========================================="
echo "  Finding Running IPMP Processes"
echo "=========================================="
echo ""

# Step 1: Find Node.js processes
echo "Step 1: Node.js processes:"
echo "----------------------------------------"
ps aux | grep -E "node|npm|dist/server" | grep -v grep || echo "No Node.js processes found"
echo ""

# Step 2: Check what's using port 3000
echo "Step 2: Processes using port 3000:"
echo "----------------------------------------"
if command -v lsof > /dev/null 2>&1; then
    lsof -i :3000 || echo "Port 3000 is free (lsof)"
else
    echo "lsof not available, trying netstat..."
fi

if command -v netstat > /dev/null 2>&1; then
    netstat -tulpn 2>/dev/null | grep :3000 || echo "Port 3000 is free (netstat)"
else
    echo "netstat not available"
fi

if command -v ss > /dev/null 2>&1; then
    ss -tulpn 2>/dev/null | grep :3000 || echo "Port 3000 is free (ss)"
fi
echo ""

# Step 3: Find processes by name pattern
echo "Step 3: Processes matching 'ipmp' or 'server.js':"
echo "----------------------------------------"
ps aux | grep -iE "ipmp|server.js" | grep -v grep || echo "No matching processes found"
echo ""

# Step 4: Interactive kill
echo "Step 4: Ready to kill processes"
echo "----------------------------------------"
echo ""

# Get PIDs of processes using port 3000
PORT_PIDS=""
if command -v lsof > /dev/null 2>&1; then
    PORT_PIDS=$(lsof -ti :3000 2>/dev/null)
elif command -v fuser > /dev/null 2>&1; then
    PORT_PIDS=$(fuser 3000/tcp 2>/dev/null | tr -d ' ')
fi

# Get PIDs of node processes
NODE_PIDS=$(ps aux | grep -E "node.*dist/server|npm.*start" | grep -v grep | awk '{print $2}')

ALL_PIDS=$(echo -e "$PORT_PIDS\n$NODE_PIDS" | sort -u | tr '\n' ' ')

if [ -z "$ALL_PIDS" ] || [ "$ALL_PIDS" = " " ]; then
    echo "✅ No processes found to kill"
    echo ""
    echo "Verification:"
    curl -s http://localhost:3000 > /dev/null 2>&1 && echo "⚠️  App is still responding on port 3000" || echo "✅ App is not responding on port 3000"
else
    echo "Found processes to kill: $ALL_PIDS"
    echo ""
    for PID in $ALL_PIDS; do
        if [ ! -z "$PID" ]; then
            echo "Killing process $PID..."
            kill -9 $PID 2>/dev/null && echo "✅ Killed PID $PID" || echo "⚠️  Failed to kill PID $PID"
        fi
    done
    echo ""
    echo "Waiting 2 seconds..."
    sleep 2
    echo ""
    echo "Verification:"
    ps aux | grep -E "node|npm|dist/server" | grep -v grep && echo "⚠️  Some processes still running" || echo "✅ No Node.js processes found"
    curl -s http://localhost:3000 > /dev/null 2>&1 && echo "⚠️  App is still responding on port 3000" || echo "✅ App is not responding on port 3000"
fi

echo ""
echo "=========================================="
echo "  Done!"
echo "=========================================="
