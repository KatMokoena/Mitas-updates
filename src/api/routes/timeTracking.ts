import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { TimeTrackingService } from '../../services/timeTrackingService';
import { AuditService } from '../../services/auditService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { TimeEntryType } from '../../database/entities/TimeEntry';

const router = Router();
const timeTrackingService = new TimeTrackingService();
const auditService = new AuditService();

router.use(authMiddleware);

// Get running timer for current user
router.get('/timer/running', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const runningTimer = await timeTrackingService.getRunningTimer(userId);
    
    if (!runningTimer) {
      return res.json(null);
    }

    res.json(runningTimer);
  } catch (error) {
    console.error('Failed to get running timer:', error);
    res.status(500).json({ error: 'Failed to get running timer' });
  }
});

// Start a timer
router.post('/timer/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { projectId, taskId, orderId, description } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const timeEntry = await timeTrackingService.startTimer(
      userId,
      projectId,
      taskId,
      orderId,
      description
    );

    // Log audit event
    await auditService.log(AuditAction.CREATE, AuditEntityType.TIME_ENTRY, {
      userId,
      entityId: timeEntry.id,
      entityName: `Time Entry for Project ${projectId}`,
      description: 'Started timer',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { projectId, taskId, entryType: TimeEntryType.TIMER },
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Failed to start timer:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to start timer' });
    }
  }
});

// Stop a timer
router.post('/timer/stop', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timeEntryId } = req.body;

    // timeEntryId is optional - if not provided, stopTimer will find the running timer
    const timeEntry = await timeTrackingService.stopTimer(userId, timeEntryId);

    // Log audit event
    await auditService.log(AuditAction.UPDATE, AuditEntityType.TIME_ENTRY, {
      userId,
      entityId: timeEntry.id,
      entityName: `Time Entry ${timeEntry.id}`,
      description: `Stopped timer - ${timeEntry.durationHours} hours`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { durationHours: timeEntry.durationHours, endTime: timeEntry.endTime },
    });

    res.json(timeEntry);
  } catch (error) {
    console.error('Failed to stop timer:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to stop timer' });
    }
  }
});

// Create manual time entry
router.post('/entries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { projectId, taskId, orderId, startTime, durationHours, description, notes } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!startTime) {
      return res.status(400).json({ error: 'Start time is required' });
    }

    if (!durationHours || durationHours <= 0) {
      return res.status(400).json({ error: 'Duration hours must be greater than 0' });
    }

    const timeEntry = await timeTrackingService.createManualEntry(
      userId,
      projectId,
      new Date(startTime),
      parseFloat(durationHours),
      taskId,
      orderId,
      description,
      notes
    );

    // Log audit event
    await auditService.log(AuditAction.CREATE, AuditEntityType.TIME_ENTRY, {
      userId,
      entityId: timeEntry.id,
      entityName: `Manual Time Entry for Project ${projectId}`,
      description: `Created manual entry - ${timeEntry.durationHours} hours`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { projectId, taskId, durationHours: timeEntry.durationHours, entryType: TimeEntryType.MANUAL },
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Failed to create manual time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create manual time entry' });
    }
  }
});

// Get time entries for current user
router.get('/entries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.query.projectId as string | undefined;

    const entries = await timeTrackingService.getUserTimeEntries(userId, projectId);
    res.json(entries);
  } catch (error) {
    console.error('Failed to get time entries:', error);
    res.status(500).json({ error: 'Failed to get time entries' });
  }
});

// Get project time summary
router.get('/projects/:projectId/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = await timeTrackingService.getProjectTimeSummary(projectId);
    res.json(summary);
  } catch (error) {
    console.error('Failed to get project time summary:', error);
    res.status(500).json({ error: 'Failed to get project time summary' });
  }
});

// Update a time entry
router.put('/entries/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { durationHours, description, notes, startTime, endTime } = req.body;

    const updates: any = {};
    if (durationHours !== undefined) updates.durationHours = parseFloat(durationHours);
    if (description !== undefined) updates.description = description;
    if (notes !== undefined) updates.notes = notes;
    if (startTime !== undefined) updates.startTime = new Date(startTime);
    if (endTime !== undefined) updates.endTime = new Date(endTime);

    const timeEntry = await timeTrackingService.updateTimeEntry(id, userId, updates);

    // Log audit event
    await auditService.log(AuditAction.UPDATE, AuditEntityType.TIME_ENTRY, {
      userId,
      entityId: timeEntry.id,
      entityName: `Time Entry ${timeEntry.id}`,
      description: 'Updated time entry',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: updates,
    });

    res.json(timeEntry);
  } catch (error) {
    console.error('Failed to update time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update time entry' });
    }
  }
});

// Delete a time entry
router.delete('/entries/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await timeTrackingService.deleteTimeEntry(id, userId);

    // Log audit event
    await auditService.log(AuditAction.DELETE, AuditEntityType.TIME_ENTRY, {
      userId,
      entityId: id,
      entityName: `Time Entry ${id}`,
      description: 'Deleted time entry',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete time entry' });
    }
  }
});

// Export project time summary as PDF
router.get('/projects/:projectId/export/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = await timeTrackingService.getProjectTimeSummary(projectId);
    const { PdfService } = require('../../services/pdfService');
    const pdfService = new PdfService();

    // Generate PDF for time tracking
    const pdfBuffer = await pdfService.generateTimeTrackingPDF(projectId, summary);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-time-report.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Failed to export time entries as PDF:', error);
    res.status(500).json({ error: 'Failed to export time entries' });
  }
});

export default router;

