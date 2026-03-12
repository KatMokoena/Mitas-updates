# Production Setup - Ensuring Parity with Development

## Changes Made to Align Production with Development

### 1. Database Path Fix ✅
**Issue:** Production was using `dist\ipmp.db` instead of project root `ipmp.db`
**Fix:** Updated `src/database/config.ts` to correctly resolve project root:
- From `dist/src/database`, goes up 3 levels to project root
- Both dev and production now use the same database file: `ipmp.db` in project root

### 2. Static Files (Public Folder) ✅
**Issue:** Images and assets from `public/` folder weren't loading in production
**Fix:** Added static file serving in `server.ts`:
- Serves `public/` folder before serving React app
- Images like `/Mitas logo.jpeg` and `/Mitas Corp Pic.png` now work in production

### 3. Environment Variables ✅
**Issue:** Production wasn't setting `NODE_ENV=production`
**Fix:** Updated `package.json` start script to include `NODE_ENV=production`

### 4. Port Configuration ✅
**Issue:** Production was trying to use port 3001 instead of 3000
**Fix:** Port logic now correctly uses 3000 in production mode

## Current Configuration

### Database
- **Location:** `ipmp.db` in project root (same for dev and production)
- **Path Resolution:** Automatically finds project root by looking for `package.json`

### Static Files
- **Public Folder:** Served from project root `public/` directory
- **React App:** Served from `dist/renderer/` in production

### Email Scheduler
- **Schedule:** 12:50 PM every day (Johannesburg time)
- **Configuration:** From `.env` file
- **Works in:** Both dev and production modes

## Verification Checklist

After running `npm start`, verify:
- ✅ Database path shows project root (not `dist\ipmp.db`)
- ✅ Images load correctly (logo, background images)
- ✅ All your development data appears
- ✅ Email scheduler starts automatically
- ✅ Server runs on port 3000

## Files Modified

1. `src/database/config.ts` - Database path resolution
2. `server.ts` - Added public folder static serving
3. `package.json` - Added `NODE_ENV=production` to start script

## Next Steps

1. Rebuild: `npm run build:server`
2. Start: `npm start`
3. Verify: Check that database path is correct and images load












