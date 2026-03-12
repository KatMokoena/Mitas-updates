import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PurchaseStatus {
  PENDING = 'pending',
  ORDERED = 'ordered',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

@Entity('purchases')
export class PurchaseEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string;

  @Column('uuid', { nullable: true })
  taskId?: string;

  @Column()
  supplierName!: string;

  @Column({ nullable: true })
  purchaseOrderNumber?: string;

  @Column('text')
  itemDescription!: string;

  @Column({ type: 'datetime' })
  orderDate!: Date;

  @Column({ type: 'datetime' })
  expectedDeliveryDate!: Date;

  @Column({ type: 'datetime', nullable: true })
  actualDeliveryDate?: Date;

  @Column({
    type: 'text',
    default: PurchaseStatus.PENDING,
  })
  status!: PurchaseStatus;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column('int', { nullable: true })
  leadTimeDays?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
















