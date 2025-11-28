import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { OrderEntity, OrderStatus } from '../../database/entities/Order';
import { PurchaseEntity } from '../../database/entities/Purchase';
import { TaskEntity } from '../../database/entities/Task';
import { PermissionService } from '../../auth/permissions';
import { SchedulingEngine } from '../../services/schedulingEngine';
import { ProjectService } from '../../services/projectService';
import { PdfService } from '../../services/pdfService';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const permissionService = new PermissionService();
const schedulingEngine = new SchedulingEngine();
const projectService = new ProjectService();
const pdfService = new PdfService();

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

    // All users can edit all orders - no restrictions

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

export default router;



