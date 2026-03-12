import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Audit trail entity for order ownership transfers
 * Records every ownership transfer with details of from/to users
 */
@Entity('order_ownership_transfers')
export class OrderOwnershipTransferEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string;

  @Column('uuid')
  fromUserId!: string; // User who transferred ownership (previous owner)

  @Column({ nullable: true })
  fromUserName?: string; // Name of previous owner

  @Column({ nullable: true })
  fromUserSurname?: string; // Surname of previous owner

  @Column({ nullable: true })
  fromUserEmail?: string; // Email of previous owner

  @Column('uuid')
  toUserId!: string; // User who received ownership (new owner)

  @Column({ nullable: true })
  toUserName?: string; // Name of new owner

  @Column({ nullable: true })
  toUserSurname?: string; // Surname of new owner

  @Column({ nullable: true })
  toUserEmail?: string; // Email of new owner

  @Column('uuid')
  transferredBy!: string; // User who initiated the transfer (may be different from fromUserId if admin)

  @Column({ nullable: true })
  transferredByName?: string; // Name of user who initiated transfer

  @Column({ nullable: true })
  transferredBySurname?: string; // Surname of user who initiated transfer

  @Column({ nullable: true })
  transferredByEmail?: string; // Email of user who initiated transfer

  @Column('text', { nullable: true })
  reason?: string; // Optional reason for transfer

  @CreateDateColumn()
  createdAt!: Date;
}

