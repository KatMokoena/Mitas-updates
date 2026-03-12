import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { RequisitionEntity, RequisitionItemEntity, RequisitionStatus, ItemAvailability } from '../../database/entities/Requisition';
import { RequisitionProofEntity } from '../../database/entities/RequisitionProof';
import { RequisitionDocumentEntity } from '../../database/entities/RequisitionDocument';
import { ProcurementDocumentEntity } from '../../database/entities/ProcurementDocument';
import { OrderEntity } from '../../database/entities/Order';
import { UserEntity } from '../../database/entities/User';
import { AuditService } from '../../services/auditService';
import { RequisitionStatusHistoryService } from '../../services/requisitionStatusHistoryService';
import { EmailService } from '../../services/emailService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';

const router = Router();
const auditService = new AuditService();
const statusHistoryService = new RequisitionStatusHistoryService();

let emailServiceInstance: EmailService | null = null;

// Allow email service to be set from server.ts
export function setRequisitionsEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

router.use(authMiddleware);

// Configure multer for file uploads
const getUploadsPath = (): string => {
  // Get project root (same logic as database config)
  let projectRoot = process.cwd();
  
  // If running from dist, go up to project root
  if (__dirname.includes('dist')) {
    projectRoot = path.resolve(__dirname, '../../..');
  } else {
    projectRoot = path.resolve(__dirname, '../..');
  }
  
  const uploadsPath = path.join(projectRoot, 'public', 'uploads', 'requisitions');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  return uploadsPath;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadsPath());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `requisition-${uniqueSuffix}-${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, PNG, JPG, DOC, DOCX'));
    }
  },
});

// Memory storage for procurement document uploads (stored in database)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, PNG, JPG, DOC, DOCX'));
    }
  },
});

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

// Create a new requisition (with optional file uploads)
router.post('/', uploadMemory.array('documents', 10), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, items, notes, approverIds, documentLabels } = req.body;
    const userId = req.user?.id;
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    
    // Parse items and approverIds if they're JSON strings (from FormData)
    let parsedItems: any[] = [];
    let parsedApproverIds: string[] = [];
    let parsedDocumentLabels: string[] = [];
    
    try {
      if (typeof items === 'string') {
        parsedItems = JSON.parse(items);
      } else if (Array.isArray(items)) {
        parsedItems = items;
      }
      
      if (typeof approverIds === 'string') {
        parsedApproverIds = JSON.parse(approverIds);
      } else if (Array.isArray(approverIds)) {
        parsedApproverIds = approverIds;
      }
      
      // Parse document labels if provided
      if (documentLabels) {
        if (typeof documentLabels === 'string') {
          parsedDocumentLabels = JSON.parse(documentLabels);
        } else if (Array.isArray(documentLabels)) {
          parsedDocumentLabels = documentLabels;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse form data:', parseError);
      return res.status(400).json({ error: 'Invalid form data format' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!orderId || !parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ error: 'Order ID and items are required' });
    }

    if (!parsedApproverIds || !Array.isArray(parsedApproverIds) || parsedApproverIds.length === 0) {
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
      where: { id: In(parsedApproverIds) }
    });
    
    // Check if all approver IDs were found
    if (approvers.length !== parsedApproverIds.length) {
      return res.status(400).json({ error: 'One or more approvers not found' });
    }
    
    const invalidApprovers = approvers.filter(u => !u.email || !u.email.toLowerCase().endsWith('@tracesol.co.za'));
    if (invalidApprovers.length > 0) {
      return res.status(400).json({ error: 'All approvers must have @tracesol.co.za email domain' });
    }

    // Check if a requisition already exists for this order
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    let requisition = await requisitionRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    const wasUpdate = !!requisition;

    const previousStatus = requisition?.status;
    
    if (requisition) {
      // Update existing requisition - preserve rejection history
      // Preserve rejectedByIds if it exists (for traceability)
      let existingRejectedByIds: string[] = [];
      const rejectedByIdsValue: string[] | string | undefined = requisition.rejectedByIds as any;
      if (Array.isArray(rejectedByIdsValue)) {
        existingRejectedByIds = [...rejectedByIdsValue];
      } else if (rejectedByIdsValue && typeof rejectedByIdsValue === 'string') {
        existingRejectedByIds = rejectedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
      
      // Reset approvedByIds if adding new approvers (they need to approve)
      requisition.approverIds = parsedApproverIds;
      requisition.approvedByIds = [];
      requisition.rejectedByIds = existingRejectedByIds; // Preserve rejection history for traceability
      requisition.status = RequisitionStatus.PENDING_APPROVAL;
      requisition.notes = notes || requisition.notes;
      requisition.rejectionReason = undefined; // Clear rejection reason when adding new approvers
      
      await requisitionRepository.save(requisition);
      
      // Log status change to history table
      await statusHistoryService.logStatusChange(
        requisition,
        previousStatus,
        userId,
        wasUpdate 
          ? `Requisition updated and reset to pending approval. Previous rejection history preserved.`
          : undefined
      );
    } else {
      // Get requester info
      const requester = await userRepository.findOne({ where: { id: userId } });
      
      // Get approver info for JSON storage
      const approverUserInfo = approvers.map(a => ({
        id: a.id,
        name: a.name || null,
        surname: a.surname || null,
        email: a.email || undefined,
      }));
      
      // Create new requisition
      requisition = requisitionRepository.create({
        orderId,
        requestedBy: userId,
        requestedByName: requester?.name || undefined,
        requestedBySurname: requester?.surname || undefined,
        requestedByEmail: requester?.email || undefined,
        approverIds: parsedApproverIds,
        approverNames: JSON.stringify(approverUserInfo),
        approvedByIds: [],
        rejectedByIds: [],
        status: RequisitionStatus.PENDING_APPROVAL,
        notes: notes || '',
        taskAssignmentEnabled: false, // Task assignment disabled until explicitly enabled after approval
      });
      requisition.id = uuidv4();
      await requisitionRepository.save(requisition);
      
      // Log initial status to history table
      await statusHistoryService.logStatusChange(
        requisition,
        undefined,
        userId,
        'Requisition created and awaiting approval'
      );
    }

    // Delete existing items if updating requisition, then create new items
    const itemRepository = getDataSource().getRepository(RequisitionItemEntity);
    if (wasUpdate && requisition.id) {
      // Check if this is an update (requisition already existed)
      const existingItems = await itemRepository.find({
        where: { requisitionId: requisition.id },
      });
      if (existingItems.length > 0) {
        // Delete existing items
        await itemRepository.delete({ requisitionId: requisition.id });
      }
    }
    
    // Create requisition items
    const requisitionItems = parsedItems.map((item: any) => {
      const itemEntity = itemRepository.create({
        requisitionId: requisition.id,
        equipmentId: item.equipmentId,
        quantity: item.quantity || 1,
        availability: item.availability || ItemAvailability.NOT_AVAILABLE,
        availabilityNotes: item.availabilityNotes || '',
      });
      itemEntity.id = uuidv4();
      return itemEntity;
    });

    await itemRepository.save(requisitionItems);

    // Save uploaded documents if any
    if (uploadedFiles && uploadedFiles.length > 0) {
      const requisitionDocRepository = getDataSource().getRepository(RequisitionDocumentEntity);
      const requester = await userRepository.findOne({ where: { id: userId } });
      
      const documentEntities = uploadedFiles.map((file, index) => {
        // Get the label for this document (by index), or use filename as fallback
        const label = parsedDocumentLabels[index] || file.originalname;
        
        const doc = requisitionDocRepository.create({
          requisitionId: requisition.id,
          uploadedBy: userId,
          uploadedByName: requester?.name || undefined,
          uploadedBySurname: requester?.surname || undefined,
          uploadedByEmail: requester?.email || undefined,
          fileName: file.originalname,
          fileData: Buffer.from(file.buffer),
          fileSize: file.size,
          mimeType: file.mimetype,
          description: label, // Save the label as description
        });
        doc.id = uuidv4();
        return doc;
      });
      
      await requisitionDocRepository.save(documentEntities);
    }

    // Send email notifications to approvers
    if (emailServiceInstance) {
      try {
        const requester = await userRepository.findOne({ where: { id: userId } });
        const requesterName = requester ? `${requester.name} ${requester.surname}` : 'A team member';
        
        // Send emails to all approvers
        for (const approverId of parsedApproverIds) {
          const approver = approvers.find(a => a.id === approverId);
          if (approver && approver.email) {
            await emailServiceInstance.sendRequisitionNotificationEmail(
              approver.email,
              `${approver.name} ${approver.surname}`,
              requesterName,
              order.orderNumber,
              requisition.id
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send requisition notification emails:', emailError);
        // Don't fail the requisition creation if email fails
      }
    }

    // Log audit event
    await auditService.log(wasUpdate ? AuditAction.UPDATE : AuditAction.CREATE, AuditEntityType.REQUISITION, {
      userId,
      entityId: requisition.id,
      entityName: `Requisition for Order ${order.orderNumber}`,
      description: wasUpdate 
        ? `Updated requisition with ${parsedItems.length} items, awaiting approval from ${parsedApproverIds.length} approver(s). Previous rejection history preserved for traceability.`
        : `Created requisition with ${parsedItems.length} items, awaiting approval from ${parsedApproverIds.length} approver(s)`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { orderId, itemsCount: parsedItems.length, approverIds: parsedApproverIds, rejectedByIds: requisition.rejectedByIds },
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

    // Store previous status for history tracking
    const previousStatus = requisition.status;

    // Get user info for approver/rejector
    const userRepository = getDataSource().getRepository(UserEntity);
    const currentUser = await userRepository.findOne({ where: { id: userId } });
    
    // Update approval status
    if (status === RequisitionStatus.APPROVED) {
      if (!approvedByIds.includes(userId)) {
        approvedByIds.push(userId);
        requisition.approvedByIds = approvedByIds;
        
        // Update approver names JSON
        const approverUserInfo = await userRepository.find({ where: { id: In(approvedByIds) } });
        const approverInfoArray = approverUserInfo.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || undefined,
        }));
        requisition.approvedByNames = JSON.stringify(approverInfoArray);
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
      
      // Track who rejected
      let rejectedByIds: string[] = [];
      const rejectedByIdsValue: string[] | string | undefined = requisition.rejectedByIds as any;
      if (Array.isArray(rejectedByIdsValue)) {
        rejectedByIds = [...rejectedByIdsValue];
      } else if (rejectedByIdsValue && typeof rejectedByIdsValue === 'string') {
        rejectedByIds = rejectedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
      
      if (!rejectedByIds.includes(userId)) {
        rejectedByIds.push(userId);
        requisition.rejectedByIds = rejectedByIds;
        
        // Update rejector names JSON
        const rejectorUserInfo = await userRepository.find({ where: { id: In(rejectedByIds) } });
        const rejectorInfoArray = rejectorUserInfo.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || undefined,
        }));
        requisition.rejectedByNames = JSON.stringify(rejectorInfoArray);
      }
      
      // Reset viewed flag when status changes to rejected (so notification appears)
      if (!wasRejected) {
        requisition.requesterViewedAt = undefined;
      }
    }

    await requisitionRepository.save(requisition);

    // Log status change to history table
    await statusHistoryService.logStatusChange(
      requisition,
      previousStatus,
      userId,
      status === RequisitionStatus.APPROVED 
        ? `Approved by user (${approvedByIds.length}/${approverIds.length} approvals)`
        : `Rejected by user: ${rejectionReason || 'No reason provided'}`
    );

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

// Get requisition status history for a specific requisition
router.get('/:id/status-history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const history = await statusHistoryService.getStatusHistory(id);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch requisition status history:', error);
    res.status(500).json({ error: 'Failed to fetch requisition status history' });
  }
});

// Get requisition status history for all requisitions in an order
router.get('/order/:orderId/status-history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const history = await statusHistoryService.getStatusHistoryByOrder(orderId);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch requisition status history by order:', error);
    res.status(500).json({ error: 'Failed to fetch requisition status history by order' });
  }
});

// Get all requisitions by status (pending, approved, rejected)
router.get('/status/:status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.params;
    
    // Validate status
    const validStatuses = Object.values(RequisitionStatus);
    if (!validStatuses.includes(status as RequisitionStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const history = await statusHistoryService.getRequisitionsByStatus(status as RequisitionStatus);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch requisitions by status:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions by status' });
  }
});

// Upload proof document for a requisition
router.post('/:id/proof', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const file = req.file;
    const description = req.body.description;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id } });

    if (!requisition) {
      // Delete uploaded file if requisition doesn't exist
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Verify user is an approver
    let approverIds: string[] = [];
    const approverIdsValue: string[] | string | undefined = requisition.approverIds as any;
    if (Array.isArray(approverIdsValue)) {
      approverIds = approverIdsValue;
    } else if (approverIdsValue && typeof approverIdsValue === 'string') {
      approverIds = approverIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }

    if (!approverIds.includes(userId)) {
      // Delete uploaded file if user is not authorized
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(403).json({ error: 'You are not authorized to upload proof for this requisition' });
    }

    // Save proof document record
    const proofRepository = getDataSource().getRepository(RequisitionProofEntity);
    const proof = proofRepository.create({
      requisitionId: id,
      uploadedBy: userId,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      description: description || undefined,
    });
    proof.id = uuidv4();
    await proofRepository.save(proof);

    // Log audit event
    await auditService.log(AuditAction.CREATE, AuditEntityType.REQUISITION, {
      userId,
      entityId: requisition.id,
      entityName: `Requisition ${id}`,
      description: `Uploaded proof document: ${file.originalname}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      newValues: { proofId: proof.id, fileName: file.originalname },
    });

    res.status(201).json(proof);
  } catch (error) {
    console.error('Failed to upload proof document:', error);
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload proof document' });
  }
});

// Get proof documents for a requisition
router.get('/:id/proofs', async (req: AuthenticatedRequest, res: Response) => {
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

    // Check access - user must be requester, approver, or have project access
    const orderRepository = getDataSource().getRepository(OrderEntity);
    const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
    
    const hasAccess = 
      requisition.requestedBy === userId ||
      (requisition.approverIds && (
        Array.isArray(requisition.approverIds) 
          ? requisition.approverIds.includes(userId)
          : (requisition.approverIds as string).split(',').includes(userId)
      ));

    if (!hasAccess && order) {
      // Check project access via projectService
      const { ProjectService } = await import('../../services/projectService');
      const projectService = new ProjectService();
      const user = await getDataSource().getRepository(UserEntity).findOne({ where: { id: userId } });
      if (user) {
        const canAccess = await projectService.canUserAccessOrder(
          userId,
          user.role,
          user.departmentId,
          requisition.orderId
        );
        if (!canAccess) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const proofRepository = getDataSource().getRepository(RequisitionProofEntity);
    const proofs = await proofRepository.find({
      where: { requisitionId: id },
      order: { uploadedAt: 'DESC' },
    });

    // Enrich with user information
    const userRepository = getDataSource().getRepository(UserEntity);
    const proofsWithUsers = await Promise.all(
      proofs.map(async (proof) => {
        const uploader = await userRepository.findOne({ where: { id: proof.uploadedBy } });
        return {
          ...proof,
          uploadedByName: uploader ? `${uploader.name} ${uploader.surname}` : 'Unknown',
        };
      })
    );

    res.json(proofsWithUsers);
  } catch (error) {
    console.error('Failed to fetch proof documents:', error);
    res.status(500).json({ error: 'Failed to fetch proof documents' });
  }
});

// Download proof document
router.get('/proofs/:proofId/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proofId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const proofRepository = getDataSource().getRepository(RequisitionProofEntity);
    const proof = await proofRepository.findOne({ where: { id: proofId } });

    if (!proof) {
      return res.status(404).json({ error: 'Proof document not found' });
    }

    // Check access
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id: proof.requisitionId } });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const hasAccess = 
      requisition.requestedBy === userId ||
      proof.uploadedBy === userId ||
      (requisition.approverIds && (
        Array.isArray(requisition.approverIds) 
          ? requisition.approverIds.includes(userId)
          : (requisition.approverIds as string).split(',').includes(userId)
      ));

    if (!hasAccess) {
      const orderRepository = getDataSource().getRepository(OrderEntity);
      const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
      if (order) {
        const { ProjectService } = await import('../../services/projectService');
        const projectService = new ProjectService();
        const user = await getDataSource().getRepository(UserEntity).findOne({ where: { id: userId } });
        if (user) {
          const canAccess = await projectService.canUserAccessOrder(
            userId,
            user.role,
            user.departmentId,
            requisition.orderId
          );
          if (!canAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        } else {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Resolve file path - handle both absolute and relative paths
    let filePath: string;
    if (path.isAbsolute(proof.filePath)) {
      filePath = proof.filePath;
    } else {
      // If relative, resolve from project root
      let projectRoot = process.cwd();
      if (__dirname.includes('dist')) {
        projectRoot = path.resolve(__dirname, '../../..');
      } else {
        projectRoot = path.resolve(__dirname, '../..');
      }
      filePath = path.resolve(projectRoot, proof.filePath);
    }

    // Normalize the path (handle Windows/Unix differences)
    filePath = path.normalize(filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      console.error(`Original stored path: ${proof.filePath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Send file
    res.setHeader('Content-Type', proof.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(proof.fileName)}"`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download proof document' });
        }
      }
    });
  } catch (error) {
    console.error('Failed to download proof document:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    if (!res.headersSent) {
    res.status(500).json({ error: 'Failed to download proof document' });
    }
  }
});

// Generate Procurement Request PDF (with optional file upload)
router.post('/generate-procurement-pdf', uploadMemory.single('uploadedFile'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemName, itemCode, itemDescription, quantity, customerNumber, additionalCriteria, taggedUsers, orderId } = req.body;
    const userId = req.user?.id;
    const uploadedFile = req.file;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!itemCode || !itemDescription || !quantity || !customerNumber) {
      return res.status(400).json({ error: 'Item code, item description, quantity, and customer number are required' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Parse taggedUsers if it's a JSON string (from FormData)
    let parsedTaggedUsers: string[] = [];
    if (taggedUsers) {
      try {
        if (typeof taggedUsers === 'string') {
          parsedTaggedUsers = JSON.parse(taggedUsers);
        } else if (Array.isArray(taggedUsers)) {
          parsedTaggedUsers = taggedUsers;
        }
      } catch (parseError) {
        console.warn('Failed to parse taggedUsers:', parseError);
        parsedTaggedUsers = [];
      }
    }

    // Parse quantity to number (FormData sends it as string)
    const parsedQuantity = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;

    // Get requesting user information
    const userRepository = getDataSource().getRepository(UserEntity);
    const requestingUser = await userRepository.findOne({ where: { id: userId } });

    // Import PdfService
    const { PdfService } = await import('../../services/pdfService');
    const pdfService = new PdfService();

    // Generate PDF
    const pdfBuffer = await pdfService.generateProcurementRequestPDF({
      itemName: itemName || itemDescription,
      itemCode,
      itemDescription,
      quantity: parsedQuantity,
      customerNumber,
      additionalCriteria: additionalCriteria || '',
      taggedUsers: parsedTaggedUsers || [],
      orderId: orderId || '',
      requestedBy: userId,
      requestedByName: requestingUser ? `${requestingUser.name} ${requestingUser.surname}` : 'Unknown User',
    });

    // Generate filename
    const fileName = `Procurement-Request-${(itemName || itemDescription).replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Save to database
    let savedDocId: string | null = null;
    try {
      const procurementDocRepository = getDataSource().getRepository(ProcurementDocumentEntity);
      
      // Ensure pdfBuffer is a Buffer
      const pdfBufferData = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      
      // Get tagged user info
      let taggedUserInfoArray: any[] = [];
      if (parsedTaggedUsers && parsedTaggedUsers.length > 0) {
        const taggedUserEntities = await userRepository.find({ where: { id: In(parsedTaggedUsers) } });
        taggedUserInfoArray = taggedUserEntities.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || undefined,
        }));
      }
      
      // Handle uploaded file if present
      let uploadedFileData: Buffer | undefined;
      let uploadedFileName: string | undefined;
      let uploadedFileSize: number | undefined;
      let uploadedFileMimeType: string | undefined;

      if (uploadedFile) {
        uploadedFileData = Buffer.from(uploadedFile.buffer);
        uploadedFileName = uploadedFile.originalname;
        uploadedFileSize = uploadedFile.size;
        uploadedFileMimeType = uploadedFile.mimetype;
      }

      const procurementDoc = procurementDocRepository.create({
        orderId,
        createdBy: userId,
        createdByName: requestingUser?.name || undefined,
        createdBySurname: requestingUser?.surname || undefined,
        createdByEmail: requestingUser?.email || undefined,
        itemName: itemName || itemDescription,
        itemCode,
        itemDescription,
        quantity: parsedQuantity,
        customerNumber,
        additionalCriteria: additionalCriteria || undefined,
        fileName,
        pdfData: pdfBufferData,
        fileSize: pdfBufferData.length,
        taggedUsers: parsedTaggedUsers && parsedTaggedUsers.length > 0 ? parsedTaggedUsers : undefined,
        taggedUserNames: taggedUserInfoArray.length > 0 ? JSON.stringify(taggedUserInfoArray) : undefined,
        uploadedFileName,
        uploadedFileData,
        uploadedFileSize,
        uploadedFileMimeType,
      });
      procurementDoc.id = uuidv4();
      await procurementDocRepository.save(procurementDoc);
      savedDocId = procurementDoc.id;
      console.log('Procurement document saved successfully:', savedDocId);

      // Log audit event
      try {
        await auditService.log(
          AuditAction.CREATE,
          AuditEntityType.REQUISITION,
          {
            userId,
            entityId: procurementDoc.id,
            entityName: `Procurement Document: ${fileName}`,
            description: `Generated procurement request PDF for ${itemCode}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          newValues: { orderId, itemCode, fileName },
        });
      } catch (auditError) {
        console.error('Error logging audit event:', auditError);
        // Continue anyway - audit logging failure shouldn't block PDF generation
      }
    } catch (saveError) {
      console.error('Error saving procurement document to database:', saveError);
      const saveErrorMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
      const saveErrorStack = saveError instanceof Error ? saveError.stack : undefined;
      console.error('Save error details:', { saveErrorMessage, saveErrorStack });
      // Continue anyway - PDF generation succeeded, just database save failed
      // This allows the user to still download the PDF
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Failed to generate procurement PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    res.status(500).json({ 
      error: 'Failed to generate procurement PDF',
      details: errorMessage 
    });
  }
});

// Get all procurement documents for an order
router.get('/procurement-documents/:orderId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const procurementDocRepository = getDataSource().getRepository(ProcurementDocumentEntity);
    const documents = await procurementDocRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    // Return metadata without PDF data
    const documentsMetadata = documents.map(doc => ({
      id: doc.id,
      orderId: doc.orderId,
      createdBy: doc.createdBy,
      itemName: doc.itemName,
      itemCode: doc.itemCode,
      itemDescription: doc.itemDescription,
      quantity: doc.quantity,
      customerNumber: doc.customerNumber,
      additionalCriteria: doc.additionalCriteria,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      taggedUsers: doc.taggedUsers,
      uploadedFileName: doc.uploadedFileName,
      uploadedFileSize: doc.uploadedFileSize,
      uploadedFileMimeType: doc.uploadedFileMimeType,
      createdAt: doc.createdAt,
      documentType: 'procurement', // Flag to identify procurement documents
    }));

    // Also fetch requisition documents from all requisitions for this order
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisitions = await requisitionRepository.find({
      where: { orderId },
    });

    const requisitionDocRepository = getDataSource().getRepository(RequisitionDocumentEntity);
    const requisitionDocuments: any[] = [];

    for (const requisition of requisitions) {
      const reqDocs = await requisitionDocRepository.find({
        where: { requisitionId: requisition.id },
        order: { uploadedAt: 'DESC' },
      });

      // Add requisition documents with metadata
      requisitionDocuments.push(...reqDocs.map(doc => ({
        id: doc.id,
        requisitionId: doc.requisitionId,
        orderId: orderId, // Add orderId for consistency
        uploadedBy: doc.uploadedBy,
        uploadedByName: doc.uploadedByName,
        uploadedBySurname: doc.uploadedBySurname,
        uploadedByEmail: doc.uploadedByEmail,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        description: doc.description,
        uploadedAt: doc.uploadedAt,
        createdAt: doc.uploadedAt, // Use uploadedAt as createdAt for consistency
        documentType: 'requisition', // Flag to identify requisition documents
        // Use description (label) as itemName if available, otherwise use fileName
        itemName: doc.description || doc.fileName,
        itemCode: 'N/A', // Requisition documents don't have item codes
        itemDescription: doc.description || doc.fileName,
        quantity: 1, // Default quantity
      })));
    }

    // Combine both types of documents and sort by creation date
    const allDocuments = [...documentsMetadata, ...requisitionDocuments].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.uploadedAt).getTime();
      const dateB = new Date(b.createdAt || b.uploadedAt).getTime();
      return dateB - dateA; // Most recent first
    });

    res.json(allDocuments);
  } catch (error) {
    console.error('Failed to fetch procurement documents:', error);
    res.status(500).json({ error: 'Failed to fetch procurement documents' });
  }
});

// Download a saved procurement document (the generated requisition PDF)
router.get('/procurement-documents/:documentId/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const procurementDocRepository = getDataSource().getRepository(ProcurementDocumentEntity);
    const document = await procurementDocRepository.findOne({ where: { id: documentId } });

    if (!document) {
      return res.status(404).json({ error: 'Procurement document not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
    res.send(document.pdfData);
  } catch (error) {
    console.error('Failed to download procurement document:', error);
    res.status(500).json({ error: 'Failed to download procurement document' });
  }
});

// Download the uploaded document for a procurement document
router.get('/procurement-documents/:documentId/download-uploaded', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const procurementDocRepository = getDataSource().getRepository(ProcurementDocumentEntity);
    const document = await procurementDocRepository.findOne({ where: { id: documentId } });

    if (!document) {
      return res.status(404).json({ error: 'Procurement document not found' });
    }

    if (!document.uploadedFileData || !document.uploadedFileName) {
      return res.status(404).json({ error: 'No uploaded file found for this procurement document' });
    }

    const mimeType = document.uploadedFileMimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.uploadedFileName)}"`);
    res.send(document.uploadedFileData);
  } catch (error) {
    console.error('Failed to download uploaded document:', error);
    res.status(500).json({ error: 'Failed to download uploaded document' });
  }
});

// Get all documents for a requisition
router.get('/:id/documents', async (req: AuthenticatedRequest, res: Response) => {
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

    // Check access - user must be requester, approver, or have access to the order
    const hasAccess = requisition.requestedBy === userId ||
      (requisition.approverIds && (
        Array.isArray(requisition.approverIds) 
          ? requisition.approverIds.includes(userId)
          : (requisition.approverIds as string).split(',').includes(userId)
      ));

    if (!hasAccess) {
      const orderRepository = getDataSource().getRepository(OrderEntity);
      const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
      if (order) {
        const { ProjectService } = await import('../../services/projectService');
        const projectService = new ProjectService();
        const user = await getDataSource().getRepository(UserEntity).findOne({ where: { id: userId } });
        if (user) {
          const canAccess = await projectService.canUserAccessOrder(
            userId,
            user.role,
            user.departmentId,
            requisition.orderId
          );
          if (!canAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        } else {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const requisitionDocRepository = getDataSource().getRepository(RequisitionDocumentEntity);
    const documents = await requisitionDocRepository.find({
      where: { requisitionId: id },
      order: { uploadedAt: 'DESC' },
    });

    // Return metadata without file data
    const documentsMetadata = documents.map(doc => ({
      id: doc.id,
      requisitionId: doc.requisitionId,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      uploadedBySurname: doc.uploadedBySurname,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      description: doc.description,
      uploadedAt: doc.uploadedAt,
    }));

    res.json(documentsMetadata);
  } catch (error) {
    console.error('Failed to fetch requisition documents:', error);
    res.status(500).json({ error: 'Failed to fetch requisition documents' });
  }
});

// Download a requisition document
router.get('/documents/:documentId/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requisitionDocRepository = getDataSource().getRepository(RequisitionDocumentEntity);
    const document = await requisitionDocRepository.findOne({ where: { id: documentId } });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    const requisitionRepository = getDataSource().getRepository(RequisitionEntity);
    const requisition = await requisitionRepository.findOne({ where: { id: document.requisitionId } });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const hasAccess = requisition.requestedBy === userId ||
      (requisition.approverIds && (
        Array.isArray(requisition.approverIds) 
          ? requisition.approverIds.includes(userId)
          : (requisition.approverIds as string).split(',').includes(userId)
      ));

    if (!hasAccess) {
      const orderRepository = getDataSource().getRepository(OrderEntity);
      const order = await orderRepository.findOne({ where: { id: requisition.orderId } });
      if (order) {
        const { ProjectService } = await import('../../services/projectService');
        const projectService = new ProjectService();
        const user = await getDataSource().getRepository(UserEntity).findOne({ where: { id: userId } });
        if (user) {
          const canAccess = await projectService.canUserAccessOrder(
            userId,
            user.role,
            user.departmentId,
            requisition.orderId
          );
          if (!canAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        } else {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
    res.send(document.fileData);
  } catch (error) {
    console.error('Failed to download requisition document:', error);
    res.status(500).json({ error: 'Failed to download requisition document' });
  }
});

export default router;

