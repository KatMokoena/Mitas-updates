import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { OrderEntity, OrderStatus } from '../../database/entities/Order';
import { PurchaseEntity } from '../../database/entities/Purchase';
import { TaskEntity } from '../../database/entities/Task';
import { OrderOwnershipInvitationEntity } from '../../database/entities/OrderOwnershipInvitation';
import { OrderOwnershipTransferEntity } from '../../database/entities/OrderOwnershipTransfer';
import { UserEntity } from '../../database/entities/User';
import { InvitationStatus } from '../../database/entities/TaskInvitation';
import { PermissionService } from '../../auth/permissions';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { ProjectService } from '../../services/projectService';
import { PdfService } from '../../services/pdfService';
import { AuditService } from '../../services/auditService';
import { EmailService } from '../../services/emailService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { ProjectAnalysisService } from '../../services/projectAnalysisService';

let emailServiceInstance: EmailService | null = null;

// Allow email service to be set from server.ts
export function setOrdersEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

const router = Router();
const permissionService = new PermissionService();
const schedulingEngine = new SchedulingEngine();
const projectService = new ProjectService();
const pdfService = new PdfService();
const auditService = new AuditService();
const projectAnalysisService = new ProjectAnalysisService();

router.use(authMiddleware);

// Get all orders
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    const orderRepository = getDataSource().getRepository(OrderEntity);
    
    // Admin and Executives can see all orders
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    if (roleStr === UserRole.ADMIN || roleStr === 'ADMIN' || roleStr === UserRole.EXECUTIVES || roleStr === 'EXECUTIVES') {
      const orders = await orderRepository.find({
        order: { createdAt: 'DESC' },
      });
      return res.json(orders);
    }
    
    // For USER and PROJECT_MANAGER roles, filter orders based on access rules
    const allOrders = await orderRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    // Filter orders based on access control
    const accessibleOrders = [];
    for (const order of allOrders) {
      const canAccess = await projectService.canUserAccessOrder(
        userId,
        userRole,
        userDepartmentId,
        order.id
      );
      if (canAccess) {
        accessibleOrders.push(order);
      }
    }
    
    res.json(accessibleOrders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Helper function to check if user can access order (deprecated - use projectService.canUserAccessOrder)
const canUserAccessOrder = async (userId: string, userRole: string, userDepartmentId: string | undefined, order: OrderEntity): Promise<boolean> => {
  return projectService.canUserAccessOrder(userId, userRole, userDepartmentId, order.id);
};

// Get order by ID - Access control enforced
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;
    
    console.log(`[GET /api/orders/:id] Fetching order ${orderId} for user ${userId} (role: ${userRole})`);
    
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });
    
    if (!order) {
      console.log(`[GET /api/orders/:id] Order ${orderId} not found in database`);
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check access control
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      console.log(`[GET /api/orders/:id] Access denied for user ${userId} to order ${orderId}`);
      res.status(403).json({ error: 'Access denied. You do not have permission to view this order.' });
      return;
    }

    console.log(`[GET /api/orders/:id] Order ${orderId} found. Returning order to user ${userId}`);
    res.json(order);
  } catch (error) {
    console.error(`[GET /api/orders/:id] Error fetching order ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get order timeline with calculated dates
router.get('/:id/timeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access control
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view this order timeline.' });
      return;
    }

    const timeline = await schedulingEngine.recalculateOrderTimeline(orderId);
    res.json(timeline);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to calculate timeline' });
    }
  }
});

// Check if order can meet deadline
// Get AI analysis for a completed order
router.get('/:id/analysis', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access to order
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check if user can access this order
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get analysis
    const analysis = await projectAnalysisService.getAnalysis(orderId);

      if (!analysis) {
        res.status(404).json({ error: 'Analysis not found. Analysis is generated automatically when a project is marked as completed. Click "Generate Analysis" to create it now.' });
        return;
      }

    res.json(analysis);
  } catch (error) {
    console.error('Failed to fetch analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// Manually trigger AI analysis for a completed order
router.post('/:id/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access to order
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check if user can access this order
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if order is completed
    if (order.status !== OrderStatus.COMPLETED) {
      res.status(400).json({ error: 'Analysis can only be generated for completed projects' });
      return;
    }

    // Generate analysis (always available, no external dependencies)
    const analysis = await projectAnalysisService.analyzeProject(orderId);

    if (!analysis) {
      res.status(500).json({ error: 'Failed to generate analysis' });
      return;
    }

    res.json(analysis);
  } catch (error) {
    console.error('Failed to generate analysis:', error);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

router.get('/:id/deadline-check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access control
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view this order.' });
      return;
    }

    const check = await schedulingEngine.canMeetDeadline(orderId);
    res.json(check);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check deadline' });
  }
});

// Create order
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const canCreate = await permissionService.canCreateOrders(req.user!.role);
  if (!canCreate) {
    res.status(403).json({ error: 'Insufficient permissions. You do not have permission to create orders.' });
    return;
  }

  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    // Automatically set departmentId from the logged-in user's department
    // This ensures orders are always associated with the creator's department
    const { departmentId: _, ...orderData } = req.body; // Remove any departmentId from body
    const order = orderRepository.create({
      id: uuidv4(),
      ...orderData,
      departmentId: req.user!.departmentId, // Always use the logged-in user's department
      createdBy: req.user!.id, // Set the creator
      createdByName: req.user!.name || undefined,
      createdBySurname: req.user!.surname || undefined,
      createdByEmail: req.user!.email || undefined,
    });
    await orderRepository.save(order);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order - Department-based access control
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: req.params.id } });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Track status change for email notifications
    const previousStatus = order.status as string;
    const newStatus = req.body.status as string;
    const willBeCompleted = newStatus === 'completed' || newStatus === OrderStatus.COMPLETED;
    const wasPending = previousStatus === 'pending' || previousStatus === OrderStatus.PENDING;

    // All users can edit all orders - no restrictions

    // Track if this is a manual completion
    const wasJustCompleted = willBeCompleted && (previousStatus !== 'completed' && previousStatus !== OrderStatus.COMPLETED);

    // If marking as completed, set completedDate if not already set
    if (willBeCompleted && !order.completedDate) {
      order.completedDate = new Date();
    }
    // If unmarking as completed, clear completedDate
    if (!willBeCompleted && order.completedDate) {
      order.completedDate = undefined;
    }

    // Apply all updates from request body
    Object.assign(order, req.body);
    
    // Ensure completedDate is set if status is COMPLETED
    if (order.status === OrderStatus.COMPLETED && !order.completedDate) {
      order.completedDate = new Date();
    }
    
    // Save the order with completed status and completedDate
    await orderRepository.save(order);

    // Always recalculate timeline after order update to ensure status is accurate
    // The updateOrderStatus method will respect the completedDate and not overwrite COMPLETED status
    await schedulingEngine.recalculateOrderTimeline(order.id);
    
    // After recalculation, if order was manually completed, ensure it stays completed
    // This is a safeguard in case anything tries to change it
    if (wasJustCompleted) {
      const orderAfterRecalc = await orderRepository.findOne({ where: { id: order.id } });
      if (orderAfterRecalc && orderAfterRecalc.status !== OrderStatus.COMPLETED) {
        console.log(`[Order Update] Restoring COMPLETED status for manually completed order ${order.id}`);
        orderAfterRecalc.status = OrderStatus.COMPLETED;
        if (!orderAfterRecalc.completedDate) {
          orderAfterRecalc.completedDate = new Date();
        }
        await orderRepository.save(orderAfterRecalc);
      }
    }

    // Check final status after recalculation (in case it was auto-updated)
    const orderAfter = await orderRepository.findOne({ where: { id: order.id } });
    const finalStatus = orderAfter?.status as string | undefined;
    const isNowCompleted = finalStatus === 'completed' || finalStatus === OrderStatus.COMPLETED;

    // Trigger project analysis if project was just completed
    if (wasJustCompleted && isNowCompleted) {
      console.log(`[Project Analysis] Triggering analysis for completed order: ${order.id}`);
      // Run analysis asynchronously to not block the response
      projectAnalysisService.analyzeProject(order.id).catch((error) => {
        console.error('[Project Analysis] Error analyzing project:', error);
        // Don't fail the order update if analysis fails
      });
    }

    // Send email notification if order status changed from Pending to Completed
    const isEmailConfigured = emailServiceInstance?.isConfigured() ?? false;
    
    console.log(`[Order Completion Email] Previous status: ${previousStatus}, New status: ${newStatus}, Final status: ${finalStatus}, Will be completed: ${willBeCompleted}, Is now completed: ${isNowCompleted}, Was pending: ${wasPending}, Email configured: ${isEmailConfigured}`);
    
    if (isEmailConfigured && isNowCompleted && wasPending && emailServiceInstance && orderAfter) {
      console.log(`[Order Completion Email] Sending completion emails for order: ${orderAfter.orderNumber} (ID: ${orderAfter.id})`);
      try {
        const userRepository = getDataSource().getRepository(UserEntity);
        const taskRepository = getDataSource().getRepository(TaskEntity);
        
        // Get all users associated with this order (owner, task assignees)
        const orderTasks = await taskRepository.find({ where: { orderId: orderAfter.id } });
        const assigneeIds = new Set<string>();
        
        // Add order owner (always notify owner)
        if (orderAfter.createdBy) {
          assigneeIds.add(orderAfter.createdBy);
        }
        
        // Add all task assignees
        orderTasks.forEach(t => {
          if (t.assignedUserId) {
            assigneeIds.add(t.assignedUserId);
          }
        });
        
        // Send completion emails to all relevant users
        console.log(`[Order Completion Email] Sending to ${assigneeIds.size} users`);
        for (const userId of assigneeIds) {
          const user = await userRepository.findOne({ where: { id: userId } });
          if (user && user.email) {
            console.log(`[Order Completion Email] Sending email to ${user.email} (${user.name} ${user.surname})`);
            await emailServiceInstance.sendProjectCompletionEmail(
              user.email,
              `${user.name} ${user.surname}`,
              orderAfter.orderNumber,
              'order',
              orderAfter.orderNumber
            );
            console.log(`[Order Completion Email] Email sent successfully to ${user.email}`);
          } else {
            console.warn(`[Order Completion Email] User not found or no email for userId: ${userId}`);
          }
        }
        console.log(`[Order Completion Email] All completion emails sent for order: ${orderAfter.orderNumber}`);
      } catch (emailError) {
        console.error('[Order Completion Email] Failed to send order completion emails:', emailError);
        // Don't fail the order update if email fails
      }
    } else {
      if (!emailServiceInstance) {
        console.warn('[Order Completion Email] Email service instance is not available');
      } else if (!isEmailConfigured) {
        console.warn('[Order Completion Email] Email service is not configured (no transporter). Check SMTP settings.');
      }
      if (!isNowCompleted) {
        console.log(`[Order Completion Email] Order status is not completed (current: ${finalStatus})`);
      }
      if (!wasPending) {
        console.log(`[Order Completion Email] Previous status was not pending (was: ${previousStatus})`);
      }
    }

    res.json(orderAfter || order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Recalculate order timeline
router.post('/:id/recalculate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access control
    const canAccess = await projectService.canUserAccessOrder(
      userId,
      userRole,
      userDepartmentId,
      orderId
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Access denied. You do not have permission to recalculate this order timeline.' });
      return;
    }

    const timeline = await schedulingEngine.recalculateOrderTimeline(orderId);
    res.json(timeline);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to recalculate timeline' });
    }
  }
});

// Delete order
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  // Check if user has permission to delete orders based on role configuration
  const canDelete = await permissionService.canDeleteOrders(req.user!.role);
  if (!canDelete) {
    res.status(403).json({ error: 'Insufficient permissions to delete orders' });
    return;
  }

  try {
    const dataSource = getDataSource();
    const orderRepository = dataSource.getRepository(OrderEntity);
    const purchaseRepository = dataSource.getRepository(PurchaseEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);
    
    // Check if order exists
    const order = await orderRepository.findOne({ where: { id: req.params.id } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.log(`[Delete Order] Starting deletion for order ${order.orderNumber} (${req.params.id})`);

    // Delete all purchases linked to this order (orderId is required)
    try {
      const deletedPurchases = await purchaseRepository.delete({ orderId: req.params.id });
      console.log(`[Delete Order] Deleted ${deletedPurchases.affected || 0} purchase(s)`);
    } catch (purchaseError) {
      console.error('[Delete Order] Error deleting purchases:', purchaseError);
      throw new Error(`Failed to delete purchases: ${purchaseError instanceof Error ? purchaseError.message : String(purchaseError)}`);
    }

    // Clear orderId from tasks (orderId is optional, so we just remove the link)
    // Use raw query to set NULL properly in SQLite
    try {
      await dataSource.query(
        `UPDATE tasks SET orderId = NULL WHERE orderId = ?`,
        [req.params.id]
      );
      console.log(`[Delete Order] Cleared orderId from tasks`);
    } catch (taskError) {
      console.error('[Delete Order] Error updating tasks:', taskError);
      throw new Error(`Failed to update tasks: ${taskError instanceof Error ? taskError.message : String(taskError)}`);
    }

    // Finally, delete the order itself
    try {
      await orderRepository.delete(req.params.id);
      console.log(`[Delete Order] Order ${order.orderNumber} deleted successfully`);
    } catch (deleteError) {
      console.error('[Delete Order] Error deleting order:', deleteError);
      throw new Error(`Failed to delete order: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete order:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      // Return more detailed error in development, generic in production
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Failed to delete order' 
        : `Failed to delete order: ${error.message}`;
      res.status(500).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  }
});

// Download comprehensive PDF report for an order
router.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    // Check access control
    const canAccess = await projectService.canUserAccessOrder(userId, userRole, userDepartmentId, orderId);
    if (!canAccess) {
      res.status(403).json({ error: 'Access denied to this order' });
      return;
    }

    // Generate comprehensive PDF
    const pdfBuffer = await pdfService.generateOrderPDF(orderId);

    // Get order for filename
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });
    const filename = order 
      ? `Project-Report-${order.orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`
      : `Project-Report-${orderId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Create order ownership transfer invitation
router.post('/:id/transfer-ownership', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { newOwnerId, message } = req.body;

    if (!newOwnerId) {
      res.status(400).json({ error: 'New owner ID is required' });
      return;
    }

    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check if current user is the owner or has admin permissions
    const roleStr = typeof req.user!.role === 'string' ? req.user!.role.toUpperCase() : req.user!.role;
    const isAdmin = roleStr === UserRole.ADMIN || roleStr === 'ADMIN';
    const isOwner = order.createdBy === req.user!.id;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only the order owner or an admin can transfer ownership' });
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
    const invitationRepository = getDataSource().getRepository(OrderOwnershipInvitationEntity);
    const existingInvitation = await invitationRepository.findOne({
      where: {
        orderId,
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
      orderId,
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
        
        await emailServiceInstance.sendOrderOwnershipInvitationEmail(
          newOwner.email,
          inviteeName,
          inviterName,
          order.orderNumber,
          message || undefined
        );
      } catch (emailError) {
        console.error('Failed to send order ownership invitation email:', emailError);
        // Don't fail the invitation creation if email fails
      }
    }

    // Log audit event
    await auditService.log(
      AuditAction.CREATE,
      AuditEntityType.ORDER,
      {
        userId: req.user!.id,
        entityId: orderId,
        entityName: order.orderNumber,
        description: `Ownership transfer invitation sent to ${newOwner.name} ${newOwner.surname}`,
        metadata: {
          invitationId: invitation.id,
          fromUserId: order.createdBy,
          toUserId: newOwnerId,
        },
      }
    );

    res.status(201).json({
      ...invitation,
      order: { id: order.id, orderNumber: order.orderNumber },
      invitee: { id: newOwner.id, name: newOwner.name, surname: newOwner.surname, email: newOwner.email },
      inviter: { id: req.user!.id, name: req.user!.name, surname: req.user!.surname },
    });
  } catch (error) {
    console.error('Failed to create ownership transfer invitation:', error);
    res.status(500).json({ error: 'Failed to create ownership transfer invitation' });
  }
});

// Accept order ownership transfer invitation
router.post('/ownership-invitations/:id/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(OrderOwnershipInvitationEntity);
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

    // Get order and current owner
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: invitation.orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const userRepository = getDataSource().getRepository(UserEntity);
    const oldOwner = order.createdBy ? await userRepository.findOne({ where: { id: order.createdBy } }) : null;
    const newOwner = await userRepository.findOne({ where: { id: invitation.inviteeId } });

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    await invitationRepository.save(invitation);

    // Transfer ownership
    const oldOwnerId = order.createdBy;
    order.createdBy = invitation.inviteeId;
    order.createdByName = newOwner?.name || undefined;
    order.createdBySurname = newOwner?.surname || undefined;
    order.createdByEmail = newOwner?.email || undefined;
    await orderRepository.save(order);

    // Send email notification to inviter about acceptance
    if (emailServiceInstance) {
      try {
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        if (inviter && inviter.email) {
          const inviterName = `${inviter.name} ${inviter.surname}`;
          const newOwnerName = `${newOwner?.name} ${newOwner?.surname}`;
          
          await emailServiceInstance.sendEmail(
            inviter.email,
            `Project Ownership Transfer Accepted: ${order.orderNumber}`,
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
                        <h3 style="margin: 0; color: #2ECC71;">${order.orderNumber}</h3>
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
    const transferRepository = getDataSource().getRepository(OrderOwnershipTransferEntity);
    const oldOwnerUser = oldOwnerId ? await userRepository.findOne({ where: { id: oldOwnerId } }) : null;
    const inviterUser = await userRepository.findOne({ where: { id: invitation.inviterId } });
    
    const transfer = transferRepository.create({
      orderId: order.id,
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
      AuditEntityType.ORDER,
      {
        userId: req.user!.id,
        entityId: order.id,
        entityName: order.orderNumber,
        description: `Order ownership transferred from ${oldOwner ? `${oldOwner.name} ${oldOwner.surname}` : 'Unknown'} to ${newOwner ? `${newOwner.name} ${newOwner.surname}` : 'Unknown'}`,
        oldValues: { createdBy: oldOwnerId },
        newValues: { createdBy: invitation.inviteeId },
        metadata: {
          transferId: transfer.id,
          fromUserId: oldOwnerId,
          toUserId: invitation.inviteeId,
        },
      }
    );

    res.json({ message: 'Ownership transfer accepted', order, transfer });
  } catch (error) {
    console.error('Failed to accept ownership transfer:', error);
    res.status(500).json({ error: 'Failed to accept ownership transfer' });
  }
});

// Reject order ownership transfer invitation
router.post('/ownership-invitations/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invitationRepository = getDataSource().getRepository(OrderOwnershipInvitationEntity);
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

    // Get order and inviter details
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: invitation.orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
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
            `Project Ownership Transfer Declined: ${order.orderNumber}`,
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
                        <h3 style="margin: 0; color: #E74C3C;">${order.orderNumber}</h3>
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
      AuditEntityType.ORDER,
      {
        userId: req.user!.id,
        entityId: order.id,
        entityName: order.orderNumber,
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
    const invitationRepository = getDataSource().getRepository(OrderOwnershipInvitationEntity);
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
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const order = await orderRepository.findOne({ where: { id: invitation.orderId } });
        const inviter = await userRepository.findOne({ where: { id: invitation.inviterId } });
        const invitee = await userRepository.findOne({ where: { id: invitation.inviteeId } });

        return {
          ...invitation,
          order: order ? { id: order.id, orderNumber: order.orderNumber } : null,
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

export default router;



