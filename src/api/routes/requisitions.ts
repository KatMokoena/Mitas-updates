import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { RequisitionEntity, RequisitionItemEntity, RequisitionStatus, ItemAvailability } from '../../database/entities/Requisition';
import { OrderEntity } from '../../database/entities/Order';
import { UserEntity } from '../../database/entities/User';
import { AuditService } from '../../services/auditService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const auditService = new AuditService();

router.use(authMiddleware);

// Get all requisitions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisitions = await requisitionRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['requestedBy', 'approvedBy'],
    });
    res.json(requisitions);
  } catch (error) {
    console.error('Failed to fetch requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// Get requisitions for a specific order
router.get('/order/:orderId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisitions = await requisitionRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    
    // Get items for each requisition
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);
    const requisitionsWithItems = await Promise.all(
      requisitions.map(async (req) => {
        const items = await itemRepository.find({
          where: { requisitionId: req.id },
        });
        return { ...req, items };
      })
    );
    
    res.json(requisitionsWithItems);
  } catch (error) {
    console.error('Failed to fetch requisitions for order:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions for order' });
  }
});

// Get pending requisitions for the current user (as approver)
router.get('/my-requisitions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const status = req.query.status as string;
    
    // Find requisitions where user is an approver
    const allRequisitions = await requisitionRepository.find({
      where: { status: RequisitionStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
    });

    // Filter to only those where current user is an approver and hasn't approved yet
    const userRequisitions = allRequisitions.filter(req => {
      // Handle simple-array: TypeORM stores as comma-separated string or array
      let approverIds: string[] = [];
      const approverIdsValue: string[] | string | undefined = req.approverIds as any;
      if (Array.isArray(approverIdsValue)) {
        approverIds = approverIdsValue;
      } else if (approverIdsValue && typeof approverIdsValue === 'string') {
        approverIds = approverIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
      
      let approvedByIds: string[] = [];
      const approvedByIdsValue: string[] | string | undefined = req.approvedByIds as any;
      if (Array.isArray(approvedByIdsValue)) {
        approvedByIds = approvedByIdsValue;
      } else if (approvedByIdsValue && typeof approvedByIdsValue === 'string') {
        approvedByIds = approvedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
      
      // Check if user is in approver list and hasn't approved yet
      const isApprover = approverIds.includes(userId);
      const hasApproved = approvedByIds.includes(userId);
      
      return isApprover && !hasApproved;
    });

    // If status filter is provided, apply it
    let filteredRequisitions = userRequisitions;
    if (status === 'pending') {
      filteredRequisitions = userRequisitions.filter(r => r.status === RequisitionStatus.PENDING_APPROVAL);
    }

    // Fetch related data
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const userRepository = getDataSource().getRepository(UserEntity);
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);

    const requisitionsWithDetails = await Promise.all(
      filteredRequisitions.map(async (requisition) => {
        const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
        const requester = await userRepository.findOne({ where: { id: requisition.requestedBy } });
        const items = await itemRepository.find({
          where: { requisitionId: requisition.id },
        });
        
        return {
          ...requisition,
          order: order ? { id: order.id, orderNumber: order.orderNumber, customerName: order.customerName } : null,
          requester: requester ? { id: requester.id, name: requester.name, surname: requester.surname, email: requester.email } : null,
          items,
        };
      })
    );

    res.json(requisitionsWithDetails);
  } catch (error) {
    console.error('Failed to fetch my requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch my requisitions' });
  }
});

// Get requisitions created by the current user (for status notifications)
router.get('/my-created-requisitions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const status = req.query.status as string;
    const includeViewed = req.query.includeViewed === 'true'; // Optional parameter to include viewed notifications
    
    const whereClause: any = { requestedBy: userId };
    if (status) {
      whereClause.status = status;
    }
    // By default, only show unviewed notifications (unless includeViewed is true)
    if (!includeViewed) {
      whereClause.requesterViewedAt = IsNull();
    }

    const requisitions = await requisitionRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    // Fetch related data
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);

    const requisitionsWithDetails = await Promise.all(
      requisitions.map(async (requisition) => {
        const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
        const items = await itemRepository.find({
          where: { requisitionId: requisition.id },
        });
        
        return {
          ...requisition,
          order: order ? { id: order.id, orderNumber: order.orderNumber, customerName: order.customerName } : null,
          items,
        };
      })
    );

    res.json(requisitionsWithDetails);
  } catch (error) {
    console.error('Failed to fetch my created requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch my created requisitions' });
  }
});

// Mark requisition status update as viewed by requester
router.patch('/:id/mark-viewed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id } });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Verify user is the requester
    if (requisition.requestedBy !== userId) {
      return res.status(403).json({ error: 'You can only mark your own requisitions as viewed' });
    }

    // Mark as viewed (only if not already viewed)
    if (!requisition.requesterViewedAt) {
      requisition.requesterViewedAt = new Date();
      await requisitionRepository.save(requisition);

      // Log audit event
      await auditService.log(AuditAction.VIEW, AuditEntityType.REQUISITION, {
        userId,
        entityId: requisition.id,
        entityName: `Requisition ${id}`,
        description: 'Requester viewed status update notification',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        newValues: { requesterViewedAt: requisition.requesterViewedAt },
      });
    }

    res.json(requisition);
  } catch (error) {
    console.error('Failed to mark requisition as viewed:', error);
    res.status(500).json({ error: 'Failed to mark requisition as viewed' });
  }
});

// Get a specific requisition
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({
      where: { id },
    });
    
    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }
    
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);
    const items = await itemRepository.find({
      where: { requisitionId: id },
    });
    
    res.json({ ...requisition, items });
  } catch (error) {
    console.error('Failed to fetch requisition:', error);
    res.status(500).json({ error: 'Failed to fetch requisition' });
  }
});

// Create a new requisition
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, items, notes, approverIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order ID and items are required' });
    }

    if (!approverIds || !Array.isArray(approverIds) || approverIds.length === 0) {
      return res.status(400).json({ error: 'At least one approver must be selected' });
    }

    // Verify order exists
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify all approvers exist and have @tracesol.co.za email
    const userRepository = getDataSource().getRepository(UserEntity);
    const approvers = await userRepository.find({
      where: { id: In(approverIds) }
    });
    
    // Check if all approver IDs were found
    if (approvers.length !== approverIds.length) {
      return res.status(400).json({ error: 'One or more approvers not found' });
    }
    
    const invalidApprovers = approvers.filter(u => !u.email || !u.email.toLowerCase().endsWith('@tracesol.co.za'));
    if (invalidApprovers.length > 0) {
      return res.status(400).json({ error: 'All approvers must have @tracesol.co.za email domain' });
    }

    // Create requisition
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = requisitionRepository.create({
      id: uuidv4(),
      orderId,
      requestedBy: userId,
      approverIds: approverIds,
      approvedByIds: [],
      status: RequisitionStatus.PENDING_APPROVAL,
      notes: notes || '',
      taskAssignmentEnabled: false, // Task assignment disabled until explicitly enabled after approval
    });

    await requisitionRepository.save(requisition);

    // Create requisition items
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);
    const requisitionItems = items.map((item: any) =>
      itemRepository.create({
        id: uuidv4(),
        requisitionId: requisition.id,
        equipmentId: item.equipmentId,
        quantity: item.quantity || 1,
        availability: item.availability || ItemAvailability.NOT_AVAILABLE,
        availabilityNotes: item.availabilityNotes || '',
      })
    );

    await itemRepository.save(requisitionItems);

    // Log audit event
    await auditService.log(AuditAction.CREATE, AuditEntityType.REQUISITION, {
      userId,
      entityId: requisition.id,
      entityName: `Requisition for Order ${order.orderNumber}`,
      description: `Created requisition with ${items.length} items, awaiting approval from ${approverIds.length} approver(s)`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { orderId, itemsCount: items.length, approverIds },
    });

    res.status(201).json({ ...requisition, items: requisitionItems });
  } catch (error) {
    console.error('Failed to create requisition:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// Update requisition status (approve/reject)
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id } });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Handle simple-array: TypeORM stores as comma-separated string or array
    let approverIds: string[] = [];
    const approverIdsValue: string[] | string | undefined = requisition.approverIds as any;
    if (Array.isArray(approverIdsValue)) {
      approverIds = approverIdsValue;
    } else if (approverIdsValue && typeof approverIdsValue === 'string') {
      approverIds = approverIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    let approvedByIds: string[] = [];
    const approvedByIdsValue: string[] | string | undefined = requisition.approvedByIds as any;
    if (Array.isArray(approvedByIdsValue)) {
      approvedByIds = [...approvedByIdsValue];
    } else if (approvedByIdsValue && typeof approvedByIdsValue === 'string') {
      approvedByIds = approvedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }

    // Verify user is in the approver list
    if (!approverIds.includes(userId)) {
      return res.status(403).json({ error: 'You are not authorized to approve this requisition' });
    }

    // Check if already approved by this user
    if (status === RequisitionStatus.APPROVED && approvedByIds.includes(userId)) {
      return res.status(400).json({ error: 'You have already approved this requisition' });
    }

    // Update approval status
    if (status === RequisitionStatus.APPROVED) {
      if (!approvedByIds.includes(userId)) {
        approvedByIds.push(userId);
        requisition.approvedByIds = approvedByIds;
      }

      // Check if all approvers have approved
      if (approvedByIds.length >= approverIds.length) {
        const wasApproved = requisition.status === RequisitionStatus.APPROVED;
        requisition.status = RequisitionStatus.APPROVED;
        // Reset viewed flag when status changes to approved (so notification appears)
        if (!wasApproved) {
          requisition.requesterViewedAt = undefined;
        }
      } else {
        requisition.status = RequisitionStatus.PENDING_APPROVAL; // Still waiting for others
      }
    } else if (status === RequisitionStatus.REJECTED) {
      const wasRejected = requisition.status === RequisitionStatus.REJECTED;
      requisition.status = RequisitionStatus.REJECTED;
      if (rejectionReason) {
        requisition.rejectionReason = rejectionReason;
      }
      // Reset viewed flag when status changes to rejected (so notification appears)
      if (!wasRejected) {
        requisition.requesterViewedAt = undefined;
      }
    }

    await requisitionRepository.save(requisition);

    // Log audit event
    await auditService.log(
      status === RequisitionStatus.APPROVED ? AuditAction.APPROVE : AuditAction.REJECT,
      AuditEntityType.REQUISITION,
      {
        userId,
        entityId: requisition.id,
        entityName: `Requisition ${id}`,
        description: status === RequisitionStatus.APPROVED 
          ? `Approved requisition (${approvedByIds.length}/${approverIds.length} approvals)`
          : `Rejected requisition: ${rejectionReason || 'No reason provided'}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        newValues: { status: requisition.status, approvedByIds },
      }
    );

    // If rejected, disable task assignment
    if (status === RequisitionStatus.REJECTED) {
      requisition.taskAssignmentEnabled = false;
      await requisitionRepository.save(requisition);
    }

    res.json(requisition);
  } catch (error) {
    console.error('Failed to update requisition status:', error);
    res.status(500).json({ error: 'Failed to update requisition status' });
  }
});

// Enable task assignment for an approved requisition
router.patch('/:id/enable-task-assignment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id } });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Verify user is the requester
    if (requisition.requestedBy !== userId) {
      return res.status(403).json({ error: 'You can only enable task assignment for requisitions you created' });
    }

    // Verify requisition is approved
    if (requisition.status !== RequisitionStatus.APPROVED) {
      return res.status(400).json({ error: 'Requisition must be approved before enabling task assignment' });
    }

    // Enable task assignment
    requisition.taskAssignmentEnabled = true;
    await requisitionRepository.save(requisition);

    // Log audit event
    await auditService.log(AuditAction.UPDATE, AuditEntityType.REQUISITION, {
      userId,
      entityId: requisition.id,
      entityName: `Requisition ${id}`,
      description: 'Enabled task assignment for approved requisition',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { taskAssignmentEnabled: true },
    });

    res.json(requisition);
  } catch (error) {
    console.error('Failed to enable task assignment:', error);
    res.status(500).json({ error: 'Failed to enable task assignment' });
  }
});

// Update item availability
router.patch('/items/:itemId/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { availability, availabilityNotes } = req.body;

    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);
    const item = await itemRepository.findOne({ where: { id: itemId } });

    if (!item) {
      return res.status(404).json({ error: 'Requisition item not found' });
    }

    item.availability = availability || item.availability;
    item.availabilityNotes = availabilityNotes || item.availabilityNotes;

    await itemRepository.save(item);

    res.json(item);
  } catch (error) {
    console.error('Failed to update item availability:', error);
    res.status(500).json({ error: 'Failed to update item availability' });
  }
});

export default router;

