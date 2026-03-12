import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { OrderEntity, OrderStatus } from '../../database/entities/Order';

const router = Router();

// Example: Webhook endpoint that other systems can call
// This shows how external systems can send data TO your IPMP system

// POST /api/webhooks/order-update
// External system (like ERP) can call this to update order status
router.post('/order-update', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // In production, validate webhook signature/API key
    const { orderNumber, status, externalId } = req.body;

    if (!orderNumber || !status) {
      return res.status(400).json({ error: 'orderNumber and status are required' });
    }

    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { orderNumber } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status from external system
    order.status = status as OrderStatus;
    if (status === OrderStatus.COMPLETED && !order.completedDate) {
      order.completedDate = new Date();
    }

    await orderRepository.save(order);

    res.json({ 
      success: true, 
      message: 'Order updated successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Example: Webhook endpoint to receive task updates
router.post('/task-update', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, status, progress } = req.body;

    // Process task update from external system
    // Similar to order-update above

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
