import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCUREMENT_IN_PROGRESS = 'procurement_in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ItemAvailability {
  AVAILABLE = 'available',
  NOT_AVAILABLE = 'not_available',
  PARTIAL = 'partial',
}

@Entity('requisitions')
export class RequisitionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string; // Project/Order this requisition is for

  @Column('uuid')
  requestedBy!: string; // User ID who created the requisition

  @Column({ nullable: true })
  requestedByName?: string; // Name of user who created the requisition

  @Column({ nullable: true })
  requestedBySurname?: string; // Surname of user who created the requisition

  @Column({ nullable: true })
  requestedByEmail?: string; // Email of user who created the requisition

  @Column('simple-array', { nullable: true })
  approverIds?: string[]; // User IDs who need to approve (multiple approvers)

  @Column('text', { nullable: true })
  approverNames?: string; // JSON string of approver names, surnames, emails

  @Column('simple-array', { nullable: true })
  approvedByIds?: string[]; // User IDs who have approved

  @Column('text', { nullable: true })
  approvedByNames?: string; // JSON string of approver names, surnames, emails

  @Column('simple-array', { nullable: true })
  rejectedByIds?: string[]; // User IDs who have rejected

  @Column('text', { nullable: true })
  rejectedByNames?: string; // JSON string of rejector names, surnames, emails

  @Column({
    type: 'text',
    default: RequisitionStatus.DRAFT,
  })
  status!: RequisitionStatus;

  @Column('text', { nullable: true })
  notes?: string; // Additional notes or comments

  @Column('text', { nullable: true })
  rejectionReason?: string; // Reason if rejected

  @Column('boolean', { default: false })
  taskAssignmentEnabled!: boolean; // Whether task assignment is enabled for this requisition

  @Column({ type: 'datetime', nullable: true })
  requesterViewedAt?: Date; // When the requester viewed the status update notification

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('requisition_items')
export class RequisitionItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  requisitionId!: string; // Link to requisition

  @Column('uuid')
  equipmentId!: string; // Equipment/Resource ID

  @Column('int')
  quantity!: number; // Requested quantity

  @Column({
    type: 'text',
    default: ItemAvailability.NOT_AVAILABLE,
  })
  availability!: ItemAvailability; // Availability status

  @Column('text', { nullable: true })
  availabilityNotes?: string; // Notes about availability

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

