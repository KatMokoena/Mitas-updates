import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { OrderEntity, OrderStatus } from '../../database/entities/Order';
import { PurchaseEntity } from '../../database/entities/Purchase';
import { TaskEntity } from '../../database/entities/Task';
import { PermissionService } from '../../auth/permissions';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const schedulingEngine = new SchedulingEngine();

router.use(authMiddleware);

// Get all orders
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const orders = await orderRepository.find({
      order: { createdAt: 'DESC' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Helper function to check if user can access order
const canUserAccessOrder = async (userId: string, userRole: string, userDepartmentId: string | undefined, order: OrderEntity): Promise<boolean> => {
  // Admin, Project Manager, and Executives always have access
  if (userRole === 'ADMIN' || userRole === 'admin' || 
      userRole === 'PROJECT_MANAGER' || userRole === 'project_manager' ||
      userRole === 'EXECUTIVES' || userRole === 'executives') {
    return true;
  }

  // Check if order belongs to user's department
  if (order.departmentId === userDepartmentId) {
    return true;
  }

  // Check if user is assigned to any task in this order
  const taskRepository = getDataSource().getRepository(TaskEntity);
  const tasks = await taskRepository.find({ where: { orderId: order.id } });
  const isAssignedToTask = tasks.some(task => task.assignedUserId === userId);
  
  if (isAssignedToTask) {
    return true;
  }

  // Check if user has accepted an invitation for any task in this order
  // Note: When an invitation is accepted, the task is assigned to the user,
  // so the isAssignedToTask check above should handle most cases.
  // This check is a backup for cases where assignment might not have happened yet.
  const { TaskInvitationEntity, InvitationStatus } = await import('../../database/entities/TaskInvitation');
  const invitationRepository = getDataSource().getRepository(TaskInvitationEntity);
  const taskIds = tasks.map(t => t.id);
  if (taskIds.length > 0) {
    // Get all invitations for this user
    const allInvitations = await invitationRepository.find({
      where: {
        inviteeId: userId,
      },
    });
    
    // Filter for accepted invitations - handle both enum and string values for robustness
    const hasAcceptedInvitation = allInvitations.some(inv => {
      const isForThisOrder = taskIds.includes(inv.taskId);
      const statusStr = String(inv.status).toLowerCase();
      const isAccepted = inv.status === InvitationStatus.ACCEPTED || 
                         statusStr === 'accepted';
      return isForThisOrder && isAccepted;
    });
    
    if (hasAcceptedInvitation) {
      console.log(`User ${userId} has accepted invitation for order ${order.id}`);
      return true;
    }
  }

  return false;
};

// Get order by ID - Department-based access control
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: req.params.id } });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check access - STRICT: Block access if user cannot access order
    const hasAccess = await canUserAccessOrder(
      req.user!.id,
      req.user!.role,
      req.user!.departmentId,
      order
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied. You can only access orders from your own department or orders where you are assigned to a task via invitation.' 
      });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get order timeline with calculated dates
router.get('/:id/timeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeline = await schedulingEngine.recalculateOrderTimeline(req.params.id);
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
router.get('/:id/deadline-check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const check = await schedulingEngine.canMeetDeadline(req.params.id);
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

    // Check if user can access this order
    const hasAccess = await canUserAccessOrder(
      req.user!.id,
      req.user!.role,
      req.user!.departmentId,
      order
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied. You can only edit orders from your own department or orders where you are assigned to a task.' 
      });
      return;
    }

    Object.assign(order, req.body);
    await orderRepository.save(order);

    // Always recalculate timeline after order update to ensure status is accurate
    await schedulingEngine.recalculateOrderTimeline(order.id);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Recalculate order timeline
router.post('/:id/recalculate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeline = await schedulingEngine.recalculateOrderTimeline(req.params.id);
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

    // Delete all purchases linked to this order (orderId is required)
    await purchaseRepository.delete({ orderId: req.params.id });

    // Clear orderId from tasks (orderId is optional, so we just remove the link)
    await taskRepository.update(
      { orderId: req.params.id },
      { orderId: undefined as any }
    );

    // Finally, delete the order itself
    await orderRepository.delete(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;



