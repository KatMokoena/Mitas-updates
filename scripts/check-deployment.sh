#!/bin/bash
# Deployment Health Check Script

echo "=== IPMP Deployment Health Check ==="
echo ""

echo "1. Checking Node.js version..."
node --version || echo "❌ Node.js not found"

echo ""
echo "2. Checking if dist/ exists..."
if [ -d "dist" ]; then
    echo "✅ dist/ exists"
    FILE_COUNT=$(find dist -type f | wc -l)
    echo "   Files: $FILE_COUNT"
    if [ -f "dist/server.js" ]; then
        echo "   ✅ dist/server.js exists"
    else
        echo "   ❌ dist/server.js missing"
    fi
    if [ -d "dist/src/api/routes" ]; then
        ROUTE_COUNT=$(ls dist/src/api/routes/*.js 2>/dev/null | wc -l)
        echo "   ✅ dist/src/api/routes/ exists ($ROUTE_COUNT route files)"
    else
        echo "   ❌ dist/src/api/routes/ missing"
    fi
else
    echo "❌ dist/ missing - need to run: npm run build"
fi

echo ""
echo "3. Checking if database exists..."
if [ -f "ipmp.db" ]; then
    echo "✅ ipmp.db exists"
    DB_SIZE=$(du -h ipmp.db | cut -f1)
    echo "   Size: $DB_SIZE"
    if [ -r "ipmp.db" ]; then
        echo "   ✅ Readable"
    else
        echo "   ❌ Not readable"
    fi
    if [ -w "ipmp.db" ]; then
        echo "   ✅ Writable"
    else
        echo "   ❌ Not writable (chmod 644 ipmp.db)"
    fi
else
    echo "❌ ipmp.db missing"
fi

echo ""
echo "4. Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    pm2 list | grep ipmp || echo "   ⚠️  ipmp process not found in PM2"
else
    echo "   ⚠️  PM2 not installed"
fi

echo ""
echo "5. Checking recent logs for errors..."
if command -v pm2 &> /dev/null; then
    ERROR_COUNT=$(pm2 logs ipmp --lines 50 --nostream 2>/dev/null | grep -i error | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo "   ⚠️  Found $ERROR_COUNT error(s) in recent logs:"
        pm2 logs ipmp --lines 50 --nostream 2>/dev/null | grep -i error | tail -3
    else
        echo "   ✅ No errors in recent logs"
    fi
else
    echo "   ⚠️  Cannot check logs (PM2 not available)"
fi

echo ""
echo "6. Testing API health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ API responding (HTTP $HEALTH_RESPONSE)"
elif [ "$HEALTH_RESPONSE" = "000" ]; then
    echo "   ❌ API not responding (server may be down)"
else
    echo "   ⚠️  API returned HTTP $HEALTH_RESPONSE"
fi

echo ""
echo "7. Checking node_modules..."
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls node_modules | wc -l)
    echo "   ✅ node_modules exists ($MODULE_COUNT packages)"
    if [ -d "node_modules/better-sqlite3" ]; then
        echo "   ✅ better-sqlite3 installed"
    else
        echo "   ❌ better-sqlite3 missing (run: npm install)"
    fi
else
    echo "   ❌ node_modules missing (run: npm install)"
fi

echo ""
echo "8. Checking package.json..."
if [ -f "package.json" ]; then
    echo "   ✅ package.json exists"
else
    echo "   ❌ package.json missing"
fi

echo ""
echo "=== Check Complete ==="
echo ""
echo "If issues found, try:"
echo "  1. npm run build"
echo "  2. pm2 restart ipmp"
echo "  3. Check: pm2 logs ipmp"
