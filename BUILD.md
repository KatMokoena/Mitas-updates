# Build Instructions

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run dev
```

This will:
- Start the webpack dev server for the renderer process
- Launch Electron with hot-reload enabled
- Open DevTools automatically

## Building for Production

1. Build the application:
```bash
npm run build
```

This compiles both the main and renderer processes.

2. Package as Windows .exe:
```bash
npm run package:win
```

The executable will be created in the `release` directory.

## Project Structure

```
src/
  main/          # Electron main process (Node.js)
  renderer/      # React UI application
  shared/        # Shared types and utilities
  database/      # Database entities and configuration
  api/           # REST API server (Express)
  services/      # Business logic layer
  auth/          # Authentication and permissions
```

## Database

The application uses SQLite with TypeORM. The database file is stored in the user's app data directory:
- Windows: `%APPDATA%/mitas-ipmp/ipmp.db`

## Default Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Project Manager**: username: `pm`, password: `pm123`

## Update System

The application includes an auto-update system using `electron-updater`. Configure the update server URL in `package.json` under `build.publish.url`.

## Troubleshooting

### Database errors
- Delete the database file and restart the application to recreate it
- Check that the app data directory is writable

### Build errors
- Ensure all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed
- Check that TypeScript is properly configured

### Runtime errors
- Check the console for error messages
- Ensure the API server is running on port 3001
- Verify database initialization completed successfully
















