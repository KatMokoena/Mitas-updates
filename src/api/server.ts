import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import resourcesRoutes from './routes/resources';
import usersRoutes from './routes/users';
import ordersRoutes from './routes/orders';
import purchasesRoutes from './routes/purchases';
import departmentsRoutes from './routes/departments';
import configurationsRoutes from './routes/configurations';
import emailRoutes, { setEmailService } from './routes/email';
import invitationsRoutes from './routes/invitations';
import requisitionsRoutes from './routes/requisitions';
import timeTrackingRoutes from './routes/timeTracking';
import cliftonStrengthsRoutes from './routes/cliftonStrengths';

export const apiRouter = express.Router();

// Enable CORS for all routes
apiRouter.use(cors());
apiRouter.use(express.json());

// Mount route handlers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/projects', projectsRoutes);
apiRouter.use('/tasks', tasksRoutes);
apiRouter.use('/resources', resourcesRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/purchases', purchasesRoutes);
apiRouter.use('/departments', departmentsRoutes);
apiRouter.use('/configurations', configurationsRoutes);
apiRouter.use('/email', emailRoutes);
apiRouter.use('/invitations', invitationsRoutes);
apiRouter.use('/requisitions', requisitionsRoutes);
apiRouter.use('/time-tracking', timeTrackingRoutes);
apiRouter.use('/clifton-strengths', cliftonStrengthsRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export function to start API server (for Electron main process)
// Note: In development, the server is started by server.ts
// This function is for Electron main process compatibility
export function startApiServer(): void {
  // The server is started by the main server.ts file when running in dev mode
  // In Electron production, this would start an internal Express server
  // For now, it's a no-op since server.ts handles the server startup
}
