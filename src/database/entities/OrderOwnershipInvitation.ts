import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { InvitationStatus } from './TaskInvitation';

/**
 * Entity for order ownership transfer invitations
 * Similar to ProjectOwnershipInvitation but for orders
 */
@Entity('order_ownership_invitations')
export class OrderOwnershipInvitationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string;

  @Column('uuid')
  inviterId!: string; // User who sent the invitation (current owner)

  @Column({ nullable: true })
  inviterName?: string; // Name of user who sent the invitation

  @Column({ nullable: true })
  inviterSurname?: string; // Surname of user who sent the invitation

  @Column({ nullable: true })
  inviterEmail?: string; // Email of user who sent the invitation

  @Column('uuid')
  inviteeId!: string; // User who is invited to become the new owner

  @Column({ nullable: true })
  inviteeName?: string; // Name of user who is invited

  @Column({ nullable: true })
  inviteeSurname?: string; // Surname of user who is invited

  @Column({ nullable: true })
  inviteeEmail?: string; // Email of user who is invited

  @Column({
    type: 'text',
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column('text', { nullable: true })
  message?: string; // Optional message from inviter

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

