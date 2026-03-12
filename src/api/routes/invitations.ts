import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { TaskInvitationEntity, InvitationStatus } from '../../database/entities/TaskInvitation';
import { TaskEntity } from '../../database/entities/Task';
import { UserEntity } from '../../database/entities/User';
import { OrderEntity } from '../../database/entities/Order';
import { EmailService } from '../../services/emailService';
import { setEmailService } from './email';
import { v4 as uuidv4 } from 'uuid';

let emailServiceInstance: EmailService | null = null;

// Allow email service to be set from server.ts
export function setInvitationsEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

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

    // Get inviter info
    const inviter = await userRepository.findOne({ where: { id: req.user!.id } });
    
    // Create invitation
    const invitation = invitationRepository.create({
      taskId,
      inviterId: req.user!.id,
      inviterName: inviter?.name || undefined,
      inviterSurname: inviter?.surname || undefined,
      inviterEmail: inviter?.email || undefined,
      inviteeId: invitee.id,
      inviteeName: invitee.name || undefined,
      inviteeSurname: invitee.surname || undefined,
      inviteeEmail: invitee.email || undefined,
      status: InvitationStatus.PENDING,
      message: message || undefined,
    });
    invitation.id = uuidv4();

    await invitationRepository.save(invitation);

    // Send email notification
    if (emailServiceInstance && invitee.email) {
      try {
        const inviterName = inviter ? `${inviter.name} ${inviter.surname}` : 'A team member';
        const inviteeName = `${invitee.name} ${invitee.surname}`;
        
        // Get order number if task has an orderId
        let orderNumber: string | undefined;
        if (task.orderId) {
          const orderRepository = getDataSource().getRepository(OrderEntity);
          const order = await orderRepository.findOne({ where: { id: task.orderId } });
          orderNumber = order?.orderNumber;
        }

        await emailServiceInstance.sendTaskInvitationEmail(
          invitee.email,
          inviteeName,
          inviterName,
          task.title,
          orderNumber,
          message || undefined
        );
      } catch (emailError) {
        console.error('Failed to send task invitation email:', emailError);
        // Don't fail the invitation creation if email fails
      }
    }

    // Return with details
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

    // Send email notification to inviter about acceptance
    if (emailServiceInstance) {
      try {
        const userRepository = getDataSource().getRepository(UserEntity);
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });
        
        if (inviter && inviter.email && invitee) {
          const inviteeName = `${invitee.name} ${invitee.surname}`;
          const inviterName = `${inviter.name} ${inviter.surname}`;
          
          await emailServiceInstance.sendEmail(
            inviter.email,
            `Task Invitation Accepted: ${task?.title || 'Task'}`,
            `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                      <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                      <h2 style="color: #333; margin-top: 0;">Task Invitation Accepted</h2>
                      <p>Dear ${inviterName},</p>
                      <p><strong>${inviteeName}</strong> has accepted your invitation to work on the task:</p>
                      <div style="background: white; padding: 15px; border-left: 4px solid #2ECC71; margin: 15px 0;">
                        <h3 style="margin: 0; color: #2ECC71;">${task?.title || 'Task'}</h3>
                      </div>
                      <p>Best regards,<br>MITAS IPMP System</p>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
                      <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          );
        }
      } catch (emailError) {
        console.error('Failed to send invitation acceptance email:', emailError);
      }
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

    // Send email notification to inviter about rejection
    if (emailServiceInstance) {
      try {
        const userRepository = getDataSource().getRepository(UserEntity);
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });
        const taskRepository = getDataSource().getRepository(TaskEntity);
        const task = await taskRepository.findOne({ where: { id: invitation.taskId } });
        
        if (inviter && inviter.email && invitee) {
          const inviteeName = `${invitee.name} ${invitee.surname}`;
          const inviterName = `${inviter.name} ${inviter.surname}`;
          
          await emailServiceInstance.sendEmail(
            inviter.email,
            `Task Invitation Declined: ${task?.title || 'Task'}`,
            `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                      <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                      <h2 style="color: #333; margin-top: 0;">Task Invitation Declined</h2>
                      <p>Dear ${inviterName},</p>
                      <p><strong>${inviteeName}</strong> has declined your invitation to work on the task:</p>
                      <div style="background: white; padding: 15px; border-left: 4px solid #E74C3C; margin: 15px 0;">
                        <h3 style="margin: 0; color: #E74C3C;">${task?.title || 'Task'}</h3>
                      </div>
                      <p>You may want to invite another team member to work on this task.</p>
                      <p>Best regards,<br>MITAS IPMP System</p>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
                      <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          );
        }
      } catch (emailError) {
        console.error('Failed to send invitation rejection email:', emailError);
      }
    }

    res.json({ message: 'Invitation rejected', invitation });
  } catch (error) {
    console.error('Failed to reject invitation:', error);
    res.status(500).json({ error: 'Failed to reject invitation' });
  }
});

export default router;

