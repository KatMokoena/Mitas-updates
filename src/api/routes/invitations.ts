import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { TaskInvitationEntity, InvitationStatus } from '../../database/entities/TaskInvitation';
import { TaskEntity } from '../../database/entities/Task';
import { UserEntity } from '../../database/entities/User';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);

// Get all invitations for the current user (as invitee) - including all statuses
router.get('/my-invitations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
    const status = req.query.status as string;
    const whereClause: any = { inviteeId: req.user!.id };
    if (status) {
      whereClause.status = status;
    }
    const invitations = await invitationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    // Fetch related data
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const task = await taskRepository.findOne({ where: { id: invitation.taskId } });
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });
        
        return {
          ...invitation,
          task: task ? { id: task.id, title: task.title, orderId: task.orderId } : null,
          inviter: inviter ? { id: inviter.id, name: inviter.name, surname: inviter.surname, email: inviter.email } : null,
          invitee: invitee ? { id: invitee.id, name: invitee.name, surname: invitee.surname, email: invitee.email } : null,
        };
      })
    );

    res.json(invitationsWithDetails);
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get invitations sent by the current user - including all statuses
router.get('/sent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
    const status = req.query.status as string;
    const whereClause: any = { inviterId: req.user!.id };
    if (status) {
      whereClause.status = status;
    }
    const invitations = await invitationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    // Fetch related data
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const task = await taskRepository.findOne({ where: { id: invitation.taskId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        
        return {
          ...invitation,
          task: task ? { id: task.id, title: task.title, orderId: task.orderId } : null,
          invitee: invitee ? { id: invitee.id, name: invitee.name, surname: invitee.surname, email: invitee.email } : null,
          inviter: inviter ? { id: inviter.id, name: inviter.name, surname: inviter.surname, email: inviter.email } : null,
        };
      })
    );

    res.json(invitationsWithDetails);
  } catch (error) {
    console.error('Failed to fetch sent invitations:', error);
    res.status(500).json({ error: 'Failed to fetch sent invitations' });
  }
});

// Create invitation
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, inviteeEmail, message } = req.body;

    if (!taskId || !inviteeEmail) {
      res.status(400).json({ error: 'Task ID and invitee email are required' });
      return;
    }

    // Verify task exists
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: taskId } });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Find user by email
    const userRepository = getDataSource().getRepository(UserEntity);
    const invitee = await userRepository.findOne({ where: { email: inviteeEmail } });
    
    if (!invitee) {
      res.status(404).json({ error: 'User with this email not found in the database' });
      return;
    }

    // Check if invitation already exists
    const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
    const existingInvitation = await invitationRepository.findOne({
      where: {
        taskId,
        inviteeId: invitee.id,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      res.status(400).json({ error: 'An invitation has already been sent to this user for this task' });
      return;
    }

    // Create invitation
    const invitation = invitationRepository.create({
      id: uuidv4(),
      taskId,
      inviterId: req.user!.id,
      inviteeId: invitee.id,
      status: InvitationStatus.PENDING,
      message: message || null,
    });

    await invitationRepository.save(invitation);

    // Return with details
    const inviter = await userRepository.findOne({ where: { id: req.user!.id } });
    res.status(201).json({
      ...invitation,
      task: { id: task.id, title: task.title, orderId: task.orderId },
      invitee: { id: invitee.id, name: invitee.name, surname: invitee.surname, email: invitee.email },
      inviter: inviter ? { id: inviter.id, name: inviter.name, surname: inviter.surname } : null,
    });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Accept invitation
router.post('/:id/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
    const invitation = await invitationRepository.findOne({ where: { id: req.params.id } });
    
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    // Verify the current user is the invitee
    if (invitation.inviteeId !== req.user!.id) {
      res.status(403).json({ error: 'You can only accept invitations sent to you' });
      return;
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      res.status(400).json({ error: 'This invitation has already been processed' });
      return;
    }

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    await invitationRepository.save(invitation);

    // Assign task to the invitee (this replaces the original assignee)
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const task = await taskRepository.findOne({ where: { id: invitation.taskId } });
    
    if (task) {
      // Update task assignment to the invitee
      task.assignedUserId = invitation.inviteeId;
      await taskRepository.save(task);
    }

    res.json({ message: 'Invitation accepted', invitation });
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Reject invitation
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
    const invitation = await invitationRepository.findOne({ where: { id: req.params.id } });
    
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    // Verify the current user is the invitee
    if (invitation.inviteeId !== req.user!.id) {
      res.status(403).json({ error: 'You can only reject invitations sent to you' });
      return;
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      res.status(400).json({ error: 'This invitation has already been processed' });
      return;
    }

    // Update invitation status
    invitation.status = InvitationStatus.REJECTED;
    await invitationRepository.save(invitation);

    res.json({ message: 'Invitation rejected', invitation });
  } catch (error) {
    console.error('Failed to reject invitation:', error);
    res.status(500).json({ error: 'Failed to reject invitation' });
  }
});

export default router;

