import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { ProjectEntity } from '../../database/entities/Project';
import { TaskEntity } from '../../database/entities/Task';
import { ProjectOwnershipInvitationEntity } from '../../database/entities/ProjectOwnershipInvitation';
import { ProjectOwnershipTransferEntity } from '../../database/entities/ProjectOwnershipTransfer';
import { UserEntity } from '../../database/entities/User';
import { InvitationStatus } from '../../database/entities/TaskInvitation';
import { PermissionService } from '../../auth/permissions';
import { ProjectService } from '../../services/projectService';
import { AuditService } from '../../services/auditService';
import { EmailService } from '../../services/emailService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { UserRole, ProjectStatus } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

let emailServiceInstance: EmailService | null = null;

// Allow email service to be set from server.ts
export function setProjectsEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

const router = Router();
const permissionService = new PermissionService();
const projectService = new ProjectService();
const auditService = new AuditService();

router.use(authMiddleware);

// Get all projects
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    
    // Admin and Executives can see all projects
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.ADMIN || roleStr === 'ADMIN' || roleStr === UserRole.EXECUTIVES || roleStr === 'EXECUTIVES') {
      const projects = await projectRepository.find({
        order: { createdAt: 'DESC' },
      });
      return res.json(projects);
    }
    
    // For USER and PROJECT_MANAGER roles, filter projects based on access rules
    const allProjects = await projectRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    // Filter projects based on access control
    const accessibleProjects = [];
    for (const project of allProjects) {
      const canAccess = await projectService.canUserAccessProject(
        userId,
        userRole,
        userDepartmentId,
        project.id
      );
      if (canAccess) {
        accessibleProjects.push(project);
      }
    }
    
    res.json(accessibleProjects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access control
    const canAccess = await projectService.canUserAccessProject(
      userId,
      userRole,
      userDepartmentId,
      projectId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view this project.' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    // Automatically set departmentId from the logged-in user's department
    const { departmentId: _, ownerId: __, ...projectData } = req.body; // Remove any departmentId or ownerId from body
    const project = projectRepository.create({
      id: uuidv4(),
      ...projectData,
      departmentId: req.user!.departmentId, // Always use the logged-in user's department
      ownerId: req.user!.id, // Set the creator as the owner
      ownerName: req.user!.name || undefined,
      ownerSurname: req.user!.surname || undefined,
      ownerEmail: req.user!.email || undefined,
    });
    await projectRepository.save(project);
    res.status(201).json(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: req.params.id } });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Track status change for email notifications
    const previousStatus = project.status as string;
    const newStatus = req.body.status as string;
    // Check if status is being changed to completed (handle both string and enum values)
    const willBeCompleted = newStatus === 'completed' || newStatus === ProjectStatus.COMPLETED;
    // Check if previous status was planning or in_progress (handle both string and enum values)
    const wasPendingOrInProgress = previousStatus === 'planning' || previousStatus === 'in_progress' || 
                                    previousStatus === ProjectStatus.PLANNING || previousStatus === ProjectStatus.IN_PROGRESS;

    // Prevent direct ownerId updates - ownership can only be transferred through the invitation system
    const { ownerId: _, ...updateData } = req.body;
    Object.assign(project, updateData);
    await projectRepository.save(project);

    // Send email notification if project status changed from Pending/In Progress to Completed
    // Check if email service is configured
    const isEmailConfigured = emailServiceInstance?.isConfigured() ?? false;
    
    // Also check the actual saved project status in case it was updated
    const finalStatus = project.status as string;
    const isNowCompleted = finalStatus === 'completed' || finalStatus === ProjectStatus.COMPLETED;
    
    console.log(`[Project Completion Email] Previous status: ${previousStatus}, New status: ${newStatus}, Final status: ${finalStatus}, Will be completed: ${willBeCompleted}, Is now completed: ${isNowCompleted}, Was pending/in progress: ${wasPendingOrInProgress}, Email service available: ${!!emailServiceInstance}, Email configured: ${isEmailConfigured}`);
    
    if (isEmailConfigured && isNowCompleted && wasPendingOrInProgress && emailServiceInstance) {
      console.log(`[Project Completion Email] Sending completion emails for project: ${project.title} (ID: ${project.id})`);
      try {
        const userRepository = getDataSource().getRepository(UserEntity);
        const taskRepository = getDataSource().getRepository(TaskEntity);
        
        // Get all users associated with this project (owner, task assignees)
        const projectTasks = await taskRepository.find({ where: { projectId: project.id } });
        const assigneeIds = new Set<string>();
        
        // Add project owner (always notify owner)
        if (project.ownerId) {
          assigneeIds.add(project.ownerId);
        }
        
        // Add all task assignees
        projectTasks.forEach(t => {
          if (t.assignedUserId) {
            assigneeIds.add(t.assignedUserId);
          }
        });
        
        // Send completion emails to all relevant users
        console.log(`[Project Completion Email] Sending to ${assigneeIds.size} users`);
        for (const userId of assigneeIds) {
          const user = await userRepository.findOne({ where: { id: userId } });
          if (user && user.email) {
            console.log(`[Project Completion Email] Sending email to ${user.email} (${user.name} ${user.surname})`);
            await emailServiceInstance.sendProjectCompletionEmail(
              user.email,
              `${user.name} ${user.surname}`,
              project.title,
              'project'
            );
            console.log(`[Project Completion Email] Email sent successfully to ${user.email}`);
          } else {
            console.warn(`[Project Completion Email] User not found or no email for userId: ${userId}`);
          }
        }
        console.log(`[Project Completion Email] All completion emails sent for project: ${project.title}`);
      } catch (emailError) {
        console.error('[Project Completion Email] Failed to send project completion emails:', emailError);
        // Don't fail the project update if email fails
      }
    } else {
      if (!emailServiceInstance) {
        console.warn('[Project Completion Email] Email service instance is not available');
      } else if (!isEmailConfigured) {
        console.warn('[Project Completion Email] Email service is not configured (no transporter). Check SMTP settings.');
      }
      if (!isNowCompleted) {
        console.log(`[Project Completion Email] Project status is not completed (current: ${finalStatus})`);
      }
      if (!wasPendingOrInProgress) {
        console.log(`[Project Completion Email] Previous status was not pending/in progress (was: ${previousStatus})`);
      }
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageProjects(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    
    // Check if project exists
    const project = await projectRepository.findOne({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    console.log(`[Delete Project] Starting deletion for project ${project.title} (${req.params.id})`);

    // Delete associated tasks
    try {
      const deletedTasks = await taskRepository.delete({ projectId: req.params.id });
      console.log(`[Delete Project] Deleted ${deletedTasks.affected || 0} task(s)`);
    } catch (taskError) {
      console.error('[Delete Project] Error deleting tasks:', taskError);
      throw new Error(`Failed to delete tasks: ${taskError instanceof Error ? taskError.message : String(taskError)}`);
    }
    
    // Delete project
    try {
      await projectRepository.delete(req.params.id);
      console.log(`[Delete Project] Project ${project.title} deleted successfully`);
    } catch (deleteError) {
      console.error('[Delete Project] Error deleting project:', deleteError);
      throw new Error(`Failed to delete project: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete project:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Failed to delete project' 
        : `Failed to delete project: ${error.message}`;
      res.status(500).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
});

// Get project tasks
router.get('/:id/tasks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const tasks = await taskRepository.find({
      where: { projectId: req.params.id },
      order: { startDate: 'ASC' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create project ownership transfer invitation
router.post('/:id/transfer-ownership', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const { newOwnerId, message } = req.body;

    if (!newOwnerId) {
      res.status(400).json({ error: 'New owner ID is required' });
      return;
    }

    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if current user is the owner or has admin permissions
    const roleStr = typeof req.user!.role === 'string' ? req.user!.role.toUpperCase() : req.user!.role;
    const isAdmin = roleStr === UserRole.ADMIN || roleStr === 'ADMIN';
    const isOwner = project.ownerId === req.user!.id;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only the project owner or an admin can transfer ownership' });
      return;
    }

    // Verify new owner exists
    const userRepository = getDataSource().getRepository(UserEntity);
    const newOwner = await userRepository.findOne({ where: { id: newOwnerId } });

    if (!newOwner) {
      res.status(404).json({ error: 'New owner not found' });
      return;
    }

    // Check if invitation already exists
    const invitationRepository = getDataSource().getRepository(ProjectOwnershipInvitationEntity);
    const existingInvitation = await invitationRepository.findOne({
      where: {
        projectId,
        inviteeId: newOwnerId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      res.status(400).json({ error: 'An ownership transfer invitation has already been sent to this user' });
      return;
    }

    // Create invitation
    const invitation = invitationRepository.create({
      projectId,
      inviterId: req.user!.id,
      inviterName: req.user!.name || undefined,
      inviterSurname: req.user!.surname || undefined,
      inviterEmail: req.user!.email || undefined,
      inviteeId: newOwnerId,
      inviteeName: newOwner.name || undefined,
      inviteeSurname: newOwner.surname || undefined,
      inviteeEmail: newOwner.email || undefined,
      status: InvitationStatus.PENDING,
      message: message || undefined,
    });
    invitation.id = uuidv4();

    await invitationRepository.save(invitation);

    // Send email notification
    if (emailServiceInstance && newOwner.email) {
      try {
        const inviterName = `${req.user!.name} ${req.user!.surname}`;
        const inviteeName = `${newOwner.name} ${newOwner.surname}`;
        
        await emailServiceInstance.sendProjectOwnershipInvitationEmail(
          newOwner.email,
          inviteeName,
          inviterName,
          project.title,
          message || undefined
        );
      } catch (emailError) {
        console.error('Failed to send project ownership invitation email:', emailError);
        // Don't fail the invitation creation if email fails
      }
    }

    // Log audit event
    await auditService.log(
      AuditAction.CREATE,
      AuditEntityType.PROJECT,
      {
        userId: req.user!.id,
        entityId: projectId,
        entityName: project.title,
        description: `Ownership transfer invitation sent to ${newOwner.name} ${newOwner.surname}`,
        metadata: {
          invitationId: invitation.id,
          fromUserId: project.ownerId,
          toUserId: newOwnerId,
        },
      }
    );

    res.status(201).json({
      ...invitation,
      project: { id: project.id, title: project.title },
      invitee: { id: newOwner.id, name: newOwner.name, surname: newOwner.surname, email: newOwner.email },
      inviter: { id: req.user!.id, name: req.user!.name, surname: req.user!.surname },
    });
  } catch (error) {
    console.error('Failed to create ownership transfer invitation:', error);
    res.status(500).json({ error: 'Failed to create ownership transfer invitation' });
  }
});

// Accept project ownership transfer invitation
router.post('/ownership-invitations/:id/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(ProjectOwnershipInvitationEntity);
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

    // Get project and current owner
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: invitation.projectId } });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const userRepository = getDataSource().getRepository(UserEntity);
    const oldOwner = project.ownerId ? await userRepository.findOne({ where: { id: project.ownerId } }) : null;
    const newOwner = await userRepository.findOne({ where: { id: invitation.inviteeId } });

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    await invitationRepository.save(invitation);

    // Transfer ownership
    const oldOwnerId = project.ownerId;
    project.ownerId = invitation.inviteeId;
    if (newOwner) {
      project.ownerName = newOwner.name || undefined;
      project.ownerSurname = newOwner.surname || undefined;
      project.ownerEmail = newOwner.email || undefined;
    }
    await projectRepository.save(project);

    // Send email notification to inviter about acceptance
    if (emailServiceInstance) {
      try {
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        if (inviter && inviter.email && newOwner) {
          const inviterName = `${inviter.name} ${inviter.surname}`;
          const newOwnerName = `${newOwner.name} ${newOwner.surname}`;
          
          await emailServiceInstance.sendEmail(
            inviter.email,
            `Project Ownership Transfer Accepted: ${project.title}`,
            `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                      <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                      <h2 style="color: #333; margin-top: 0;">Project Ownership Transfer Accepted</h2>
                      <p>Dear ${inviterName},</p>
                      <p><strong>${newOwnerName}</strong> has accepted the ownership transfer for the project:</p>
                      <div style="background: white; padding: 15px; border-left: 4px solid #2ECC71; margin: 15px 0;">
                        <h3 style="margin: 0; color: #2ECC71;">${project.title}</h3>
                      </div>
                      <p>The project ownership has been successfully transferred. You will still have access to the project, but ${newOwnerName} is now the project owner.</p>
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
        console.error('Failed to send ownership transfer acceptance email:', emailError);
      }
    }

    // Create audit trail entry
    const transferRepository = getDataSource().getRepository(ProjectOwnershipTransferEntity);
    const oldOwnerUser = oldOwnerId ? await userRepository.findOne({ where: { id: oldOwnerId } }) : null;
    const inviterUser = await userRepository.findOne({ where: { id: invitation.inviterId } });
    
    const transfer = transferRepository.create({
      projectId: project.id,
      fromUserId: oldOwnerId || invitation.inviterId,
      fromUserName: oldOwnerUser?.name || inviterUser?.name || undefined,
      fromUserSurname: oldOwnerUser?.surname || inviterUser?.surname || undefined,
      fromUserEmail: oldOwnerUser?.email || inviterUser?.email || undefined,
      toUserId: invitation.inviteeId,
      toUserName: newOwner?.name || undefined,
      toUserSurname: newOwner?.surname || undefined,
      toUserEmail: newOwner?.email || undefined,
      transferredBy: invitation.inviterId,
      transferredByName: inviterUser?.name || undefined,
      transferredBySurname: inviterUser?.surname || undefined,
      transferredByEmail: inviterUser?.email || undefined,
      reason: invitation.message || undefined,
    });
    transfer.id = uuidv4();
    await transferRepository.save(transfer);

    // Log audit event
    await auditService.log(
      AuditAction.TRANSFER,
      AuditEntityType.PROJECT,
      {
        userId: req.user!.id,
        entityId: project.id,
        entityName: project.title,
        description: `Project ownership transferred from ${oldOwner ? `${oldOwner.name} ${oldOwner.surname}` : 'Unknown'} to ${newOwner ? `${newOwner.name} ${newOwner.surname}` : 'Unknown'}`,
        oldValues: { ownerId: oldOwnerId },
        newValues: { ownerId: invitation.inviteeId },
        metadata: {
          transferId: transfer.id,
          fromUserId: oldOwnerId,
          toUserId: invitation.inviteeId,
        },
      }
    );

    res.json({ message: 'Ownership transfer accepted', project, transfer });
  } catch (error) {
    console.error('Failed to accept ownership transfer:', error);
    res.status(500).json({ error: 'Failed to accept ownership transfer' });
  }
});

// Reject project ownership transfer invitation
router.post('/ownership-invitations/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(ProjectOwnershipInvitationEntity);
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

    // Get project and inviter details
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: invitation.projectId } });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const userRepository = getDataSource().getRepository(UserEntity);
    const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
    const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });

    // Update invitation status
    invitation.status = InvitationStatus.REJECTED;
    await invitationRepository.save(invitation);

    // Send email notification to inviter about rejection
    if (emailServiceInstance) {
      try {
        if (inviter && inviter.email && invitee) {
          const inviterName = `${inviter.name} ${inviter.surname}`;
          const inviteeName = `${invitee.name} ${invitee.surname}`;
          
          await emailServiceInstance.sendEmail(
            inviter.email,
            `Project Ownership Transfer Declined: ${project.title}`,
            `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                      <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                      <h2 style="color: #333; margin-top: 0;">Project Ownership Transfer Declined</h2>
                      <p>Dear ${inviterName},</p>
                      <p><strong>${inviteeName}</strong> has declined the ownership transfer for the project:</p>
                      <div style="background: white; padding: 15px; border-left: 4px solid #E74C3C; margin: 15px 0;">
                        <h3 style="margin: 0; color: #E74C3C;">${project.title}</h3>
                      </div>
                      <p>You may want to choose another team member to transfer ownership to.</p>
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
        console.error('Failed to send ownership transfer rejection email:', emailError);
      }
    }

    // Log audit event
    await auditService.log(
      AuditAction.REJECT,
      AuditEntityType.PROJECT,
      {
        userId: req.user!.id,
        entityId: project.id,
        entityName: project.title,
        description: `Ownership transfer invitation rejected by ${invitee ? `${invitee.name} ${invitee.surname}` : 'Unknown'}`,
        metadata: {
          invitationId: invitation.id,
          inviterId: invitation.inviterId,
          inviteeId: invitation.inviteeId,
        },
      }
    );

    res.json({ message: 'Ownership transfer invitation rejected', invitation });
  } catch (error) {
    console.error('Failed to reject ownership transfer:', error);
    res.status(500).json({ error: 'Failed to reject ownership transfer' });
  }
});

// Get ownership transfer invitations for current user (as invitee)
router.get('/ownership-invitations/my-invitations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(ProjectOwnershipInvitationEntity);
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
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const project = await projectRepository.findOne({ where: { id: invitation.projectId } });
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });

        return {
          ...invitation,
          project: project ? { id: project.id, title: project.title } : null,
          inviter: inviter ? { id: inviter.id, name: inviter.name, surname: inviter.surname, email: inviter.email } : null,
          invitee: invitee ? { id: invitee.id, name: invitee.name, surname: invitee.surname, email: invitee.email } : null,
        };
      })
    );

    res.json(invitationsWithDetails);
  } catch (error) {
    console.error('Failed to fetch ownership invitations:', error);
    res.status(500).json({ error: 'Failed to fetch ownership invitations' });
  }
});

// Get ownership transfer invitations sent by current user (as inviter)
router.get('/ownership-invitations/sent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(ProjectOwnershipInvitationEntity);
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
    const projectRepository = getDataSource().getRepository(ProjectEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const project = await projectRepository.findOne({ where: { id: invitation.projectId } });
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });

        return {
          ...invitation,
          project: project ? { id: project.id, title: project.title } : null,
          inviter: inviter ? { id: inviter.id, name: inviter.name, surname: inviter.surname, email: inviter.email } : null,
          invitee: invitee ? { id: invitee.id, name: invitee.name, surname: invitee.surname, email: invitee.email } : null,
        };
      })
    );

    res.json(invitationsWithDetails);
  } catch (error) {
    console.error('Failed to fetch sent ownership invitations:', error);
    res.status(500).json({ error: 'Failed to fetch sent ownership invitations' });
  }
});

export default router;

