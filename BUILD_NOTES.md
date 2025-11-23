# Build Notes - Development vs Production

## Important: When Making Code Changes

**Always ensure fixes work in BOTH development and production modes!**

## Development Mode

- **Command:** `npm run dev`
- **API Server:** Port 3001 (runs with `ts-node-dev` - auto-reloads on changes)
- **Frontend:** Port 8080 (webpack dev server with hot reload)
- **Access:** `http://localhost:8080`
- **No build required** - TypeScript is compiled on-the-fly

## Production Mode

- **Command:** `npm start` (after building)
- **Build Command:** `npm run build` (builds both server and renderer)
- **API Server:** Port 3000 (serves both API and frontend)
- **Frontend:** Port 3000 (served as static files)
- **Access:** `http://localhost:3000`
- **Requires build** - Must run `npm run build` after code changes

## Build Process

1. **Build Server:** `npm run build:server` - Compiles TypeScript to JavaScript in `dist/`
2. **Build Renderer:** `npm run build:renderer` - Bundles React app with webpack
3. **Build Both:** `npm run build` - Builds server and renderer together
4. **Start Production:** `npm start` - Runs the compiled production build

## After Making Code Changes

### For Development:
- Changes are automatically picked up (hot reload)
- No action needed

### For Production:
1. Stop the production server (Ctrl+C)
2. Run `npm run build` to rebuild both server and renderer
3. Run `npm start` to start the production server
4. Test at `http://localhost:3000`

## Quick Reference

| Mode | Command | API Port | Frontend Port | Build Required |
|------|---------|----------|---------------|----------------|
| Development | `npm run dev` | 3001 | 8080 | No |
| Production | `npm start` | 3000 | 3000 | Yes (run `npm run build` first) |

## Troubleshooting

- **404 errors in production:** Make sure you ran `npm run build` after code changes
- **TypeScript errors:** Fix all TypeScript errors before building for production
- **Port already in use:** Stop any running servers before starting a new one

