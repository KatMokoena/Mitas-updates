import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { RequisitionStatus } from './Requisition';

/**
 * Tracks the complete history of requisition status changes
 * This table maintains a record of all requisitions and their status transitions
 * (pending, approved, rejected) for audit and reporting purposes
 */
@Entity('requisition_status_history')
export class RequisitionStatusHistoryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  requisitionId!: string; // Link to the requisition

  @Column('uuid')
  orderId!: string; // Link to the order/project

  @Column('uuid')
  requestedBy!: string; // User ID who created the requisition

  @Column({ nullable: true })
  requestedByName?: string; // Name of user who created the requisition

  @Column({ nullable: true })
  requestedBySurname?: string; // Surname of user who created the requisition

  @Column({ nullable: true })
  requestedByEmail?: string; // Email of user who created the requisition

  @Column('simple-array', { nullable: true })
  approverIds?: string[]; // User IDs who need to approve

  @Column('text', { nullable: true })
  approverNames?: string; // JSON string of approver names, surnames, emails

  @Column('simple-array', { nullable: true })
  approvedByIds?: string[]; // User IDs who have approved (at time of status change)

  @Column('text', { nullable: true })
  approvedByNames?: string; // JSON string of approver names, surnames, emails

  @Column('simple-array', { nullable: true })
  rejectedByIds?: string[]; // User IDs who have rejected (at time of status change)

  @Column('text', { nullable: true })
  rejectedByNames?: string; // JSON string of rejector names, surnames, emails

  @Column({
    type: 'text',
  })
  status!: RequisitionStatus; // Current status at this point in time

  @Column({
    type: 'text',
    nullable: true,
  })
  previousStatus?: RequisitionStatus; // Previous status (for status transitions)

  @Column('uuid', { nullable: true })
  changedBy?: string; // User ID who caused this status change (approver/rejector)

  @Column({ nullable: true })
  changedByName?: string; // Name of user who caused this status change

  @Column({ nullable: true })
  changedBySurname?: string; // Surname of user who caused this status change

  @Column({ nullable: true })
  changedByEmail?: string; // Email of user who caused this status change

  @Column('text', { nullable: true })
  rejectionReason?: string; // Reason if rejected

  @Column('text', { nullable: true })
  notes?: string; // Additional notes

  @Column('text', { nullable: true })
  description?: string; // Description of the status change

  @CreateDateColumn()
  createdAt!: Date; // When this status was recorded
}





