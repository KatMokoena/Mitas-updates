# Mitas Internal Project Management Platform (IPMP)

A comprehensive web application for project visibility and dynamic timeline management.

## Features

- **Project Management**: Full CRUD operations with support for multiple solution components
- **Dynamic Gantt Chart**: Interactive timeline with drag-and-drop task adjustments
- **Resource Tracking**: Labour and equipment allocation with timeline tracking
- **Role-Based Access Control**: Admin, Project Manager, and User roles
- **REST API**: Internal API layer for future integrations
- **Modern Web UI**: Clean, responsive interface built with React

## Tech Stack

- **Node.js + Express**: Backend server and REST API
- **TypeScript**: Type-safe development
- **React**: Modern UI framework
- **SQLite**: Local database (swappable for PostgreSQL/MySQL)
- **TypeORM**: Database ORM
- **Webpack**: Frontend bundling

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (with hot-reload)
npm run dev
```

This will:
- Start the Express server on `http://localhost:3000`
- Start the webpack dev server for hot-reloading
- Open your browser to `http://localhost:3000`

### Production Build

```bash
# Build both server and frontend
npm run build

# Start the production server
npm start
```

The application will be available at `http://localhost:3000`

## Default Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Project Manager**: username: `pm`, password: `pm123`

## Project Structure

```
src/
  api/           # REST API routes (Express)
  auth/          # Authentication and permissions
  database/      # Database entities and configuration
  renderer/      # React UI application
  shared/        # Shared types and utilities
  services/      # Business logic layer
server.ts        # Main server entry point
```

## Database

The application uses SQLite with TypeORM. The database file (`ipmp.db`) is stored in the project root directory.

## API Endpoints

All API endpoints are prefixed with `/api`:

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `GET /api/resources` - List resources

## Deployment

### Local Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

### Production Deployment

For production deployment, you can:

1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name mitas-ipmp
   ```

2. Use Docker (create a Dockerfile)
3. Deploy to cloud platforms (Heroku, AWS, Azure, etc.)

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Troubleshooting

### Database errors
- Delete the `ipmp.db` file and restart the application to recreate it
- Check that the project directory is writable

### Build errors
- Ensure all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed
- Check that TypeScript is properly configured

### Port already in use
- Change the PORT environment variable: `PORT=3001 npm start`
- Or stop the process using port 3000

## License

MIT
