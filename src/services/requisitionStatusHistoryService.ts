import { getDataSource } from '../database/config';
import { RequisitionStatusHistoryEntity } from '../database/entities/RequisitionStatusHistory';
import { RequisitionEntity, RequisitionStatus } from '../database/entities/Requisition';
import { UserEntity } from '../database/entities/User';
import { In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage requisition status history
 * Tracks all status changes (pending, approved, rejected) for audit and reporting
 */
export class RequisitionStatusHistoryService {
  /**
   * Log a requisition status change to the history table
   * This creates a record of the requisition's status at a specific point in time
   */
  async logStatusChange(
    requisition: RequisitionEntity,
    previousStatus: RequisitionStatus | undefined,
    changedBy?: string,
    description?: string
  ): Promise<void> {
    try {
      const historyRepository = getDataSource().getRepository(RequisitionStatusHistoryEntity);

      // Handle simple-array fields: TypeORM stores as comma-separated string or array
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
        approvedByIds = approvedByIdsValue;
      } else if (approvedByIdsValue && typeof approvedByIdsValue === 'string') {
        approvedByIds = approvedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }

      let rejectedByIds: string[] = [];
      const rejectedByIdsValue: string[] | string | undefined = requisition.rejectedByIds as any;
      if (Array.isArray(rejectedByIdsValue)) {
        rejectedByIds = rejectedByIdsValue;
      } else if (rejectedByIdsValue && typeof rejectedByIdsValue === 'string') {
        rejectedByIds = rejectedByIdsValue.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }

      // Get user info for traceability
      const userRepository = getDataSource().getRepository(UserEntity);
      const requester = await userRepository.findOne({ where: { id: requisition.requestedBy } });
      
      // Get approver info
      let approverInfoArray: any[] = [];
      if (approverIds.length > 0) {
        const approverUsers = await userRepository.find({ where: { id: In(approverIds) } });
        approverInfoArray = approverUsers.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || null,
        }));
      }
      
      // Get approver/rejector info
      let approvedByInfoArray: any[] = [];
      if (approvedByIds.length > 0) {
        const approvedByUsers = await userRepository.find({ where: { id: In(approvedByIds) } });
        approvedByInfoArray = approvedByUsers.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || null,
        }));
      }
      
      let rejectedByInfoArray: any[] = [];
      if (rejectedByIds.length > 0) {
        const rejectedByUsers = await userRepository.find({ where: { id: In(rejectedByIds) } });
        rejectedByInfoArray = rejectedByUsers.map(u => ({
          id: u.id,
          name: u.name || null,
          surname: u.surname || null,
          email: u.email || null,
        }));
      }
      
      // Get changedBy user info
      let changedByUser: UserEntity | null = null;
      if (changedBy) {
        changedByUser = await userRepository.findOne({ where: { id: changedBy } });
      }
      
      // Create history record
      const historyRecord = historyRepository.create({
        requisitionId: requisition.id,
        orderId: requisition.orderId,
        requestedBy: requisition.requestedBy,
        requestedByName: requester?.name || undefined,
        requestedBySurname: requester?.surname || undefined,
        requestedByEmail: requester?.email || undefined,
        approverIds: approverIds.length > 0 ? approverIds : undefined,
        approverNames: approverInfoArray.length > 0 ? JSON.stringify(approverInfoArray) : undefined,
        approvedByIds: approvedByIds.length > 0 ? approvedByIds : undefined,
        approvedByNames: approvedByInfoArray.length > 0 ? JSON.stringify(approvedByInfoArray) : undefined,
        rejectedByIds: rejectedByIds.length > 0 ? rejectedByIds : undefined,
        rejectedByNames: rejectedByInfoArray.length > 0 ? JSON.stringify(rejectedByInfoArray) : undefined,
        status: requisition.status,
        previousStatus: previousStatus,
        changedBy: changedBy,
        changedByName: changedByUser?.name || undefined,
        changedBySurname: changedByUser?.surname || undefined,
        changedByEmail: changedByUser?.email || undefined,
        rejectionReason: requisition.rejectionReason,
        notes: requisition.notes,
        description: description || this.generateStatusDescription(requisition.status, approvedByIds, approverIds, rejectedByIds),
      });
      historyRecord.id = uuidv4();
      await historyRepository.save(historyRecord);
    } catch (error) {
      console.error('Failed to log requisition status change:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Generate a human-readable description of the status change
   */
  private generateStatusDescription(
    status: RequisitionStatus,
    approvedByIds: string[],
    approverIds: string[],
    rejectedByIds: string[]
  ): string {
    switch (status) {
      case RequisitionStatus.DRAFT:
        return 'Requisition created as draft';
      case RequisitionStatus.PENDING_APPROVAL:
        if (approvedByIds.length > 0) {
          return `Pending approval (${approvedByIds.length}/${approverIds.length} approvals received)`;
        }
        return 'Pending approval from all approvers';
      case RequisitionStatus.APPROVED:
        return `Approved by all approvers (${approvedByIds.length}/${approverIds.length})`;
      case RequisitionStatus.REJECTED:
        if (rejectedByIds.length > 0) {
          return `Rejected by ${rejectedByIds.length} approver(s)`;
        }
        return 'Requisition rejected';
      case RequisitionStatus.PROCUREMENT_IN_PROGRESS:
        return 'Procurement process started';
      case RequisitionStatus.COMPLETED:
        return 'Requisition completed';
      case RequisitionStatus.CANCELLED:
        return 'Requisition cancelled';
      default:
        return `Status changed to ${status}`;
    }
  }

  /**
   * Get status history for a specific requisition
   */
  async getStatusHistory(requisitionId: string): Promise<RequisitionStatusHistoryEntity[]> {
    try {
      const historyRepository = getDataSource().getRepository(RequisitionStatusHistoryEntity);
      return await historyRepository.find({
        where: { requisitionId },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      console.error('Failed to fetch requisition status history:', error);
      return [];
    }
  }

  /**
   * Get status history for all requisitions in an order
   */
  async getStatusHistoryByOrder(orderId: string): Promise<RequisitionStatusHistoryEntity[]> {
    try {
      const historyRepository = getDataSource().getRepository(RequisitionStatusHistoryEntity);
      return await historyRepository.find({
        where: { orderId },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      console.error('Failed to fetch requisition status history by order:', error);
      return [];
    }
  }

  /**
   * Get all requisitions with a specific status (pending, approved, rejected)
   * Useful for reporting and filtering
   */
  async getRequisitionsByStatus(status: RequisitionStatus): Promise<RequisitionStatusHistoryEntity[]> {
    try {
      const historyRepository = getDataSource().getRepository(RequisitionStatusHistoryEntity);
      
      // Get the most recent status for each requisition
      const allHistory = await historyRepository.find({
        where: { status },
        order: { createdAt: 'DESC' },
      });

      // Group by requisitionId and keep only the latest record for each
      const latestByRequisition = new Map<string, RequisitionStatusHistoryEntity>();
      for (const record of allHistory) {
        if (!latestByRequisition.has(record.requisitionId)) {
          latestByRequisition.set(record.requisitionId, record);
        }
      }

      return Array.from(latestByRequisition.values());
    } catch (error) {
      console.error('Failed to fetch requisitions by status:', error);
      return [];
    }
  }
}





