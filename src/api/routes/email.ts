import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { EmailService } from '../../services/emailService';
import { SchedulerService } from '../../services/schedulerService';
import { UserRole } from '../../shared/types';
import { PermissionService } from '../../auth/permissions';

const router = Router();
const permissionService = new PermissionService();

// Email service instance (should be initialized in server.ts)
let emailServiceInstance: EmailService | null = null;
let schedulerServiceInstance: SchedulerService | null = null;

export function setEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

export function setSchedulerService(service: SchedulerService): void {
  schedulerServiceInstance = service;
}

router.use(authMiddleware);

// Get email configuration (Admin only)
router.get('/config', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  if (!emailServiceInstance) {
    res.status(500).json({ error: 'Email service not initialized' });
    return;
  }

  try {
    const config = emailServiceInstance.getConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get email configuration' });
  }
});

// Update email configuration (Admin only)
router.post('/config', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  if (!emailServiceInstance) {
    res.status(500).json({ error: 'Email service not initialized' });
    return;
  }

  try {
    const { host, port, secure, auth, from, to } = req.body;

    if (!host || !port || !auth?.user || !auth?.password || !from || !to) {
      res.status(400).json({
        error: 'Missing required fields: host, port, auth.user, auth.password, from, to',
      });
      return;
    }

    emailServiceInstance.configure({
      host,
      port: parseInt(port, 10),
      secure: secure === true,
      auth: {
        user: auth.user,
        password: auth.password,
      },
      from,
      to: Array.isArray(to) ? to : [to],
    });

    // Test the configuration
    const isValid = await emailServiceInstance.testConnection();
    if (!isValid) {
      res.status(400).json({ error: 'Email configuration test failed. Please check your SMTP settings.' });
      return;
    }

    res.json({ message: 'Email configuration updated successfully', config: emailServiceInstance.getConfig() });
  } catch (error) {
    console.error('Failed to update email configuration:', error);
    res.status(500).json({ error: 'Failed to update email configuration' });
  }
});

// Test email connection (Admin only)
router.post('/test', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  if (!emailServiceInstance) {
    res.status(500).json({ error: 'Email service not initialized' });
    return;
  }

  try {
    const isValid = await emailServiceInstance.testConnection();
    if (isValid) {
      res.json({ message: 'Email connection test successful' });
    } else {
      res.status(400).json({ error: 'Email connection test failed' });
    }
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ error: 'Email test failed' });
  }
});

// Manually trigger daily reports email (Admin only)
router.post('/send-reports', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  if (!schedulerServiceInstance) {
    res.status(500).json({ error: 'Scheduler service not initialized' });
    return;
  }

  if (!emailServiceInstance) {
    res.status(500).json({ error: 'Email service not initialized' });
    return;
  }

  // Check if email is configured
  const emailConfig = emailServiceInstance.getConfig();
  if (!emailConfig) {
    res.status(400).json({ 
      error: 'Email service not configured. Please configure email settings first.' 
    });
    return;
  }

  try {
    console.log('Manual email trigger requested by admin user:', req.user!.email);
    
    // Trigger the daily reports sending
    await schedulerServiceInstance.sendDailyReports();
    
    res.json({ 
      message: 'Daily reports email sent successfully. Check the server logs for details.' 
    });
  } catch (error) {
    console.error('Failed to send daily reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to send daily reports',
      details: errorMessage 
    });
  }
});

export default router;


