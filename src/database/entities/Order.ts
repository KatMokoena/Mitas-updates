import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column()
  customerName!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'datetime' })
  deadline!: Date;

  @Column({
    type: 'text',
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: 'text',
    default: OrderPriority.MEDIUM,
  })
  priority!: OrderPriority;

  @Column('uuid', { nullable: true })
  departmentId?: string;

  @Column('uuid', { nullable: true })
  createdBy?: string; // User ID who created the order

  @Column({ nullable: true })
  createdByName?: string; // Name of user who created the order

  @Column({ nullable: true })
  createdBySurname?: string; // Surname of user who created the order

  @Column({ nullable: true })
  createdByEmail?: string; // Email of user who created the order

  @Column('simple-array', { default: '', nullable: true })
  equipmentIds?: string[];

  @Column({ type: 'datetime', nullable: true })
  completedDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}



