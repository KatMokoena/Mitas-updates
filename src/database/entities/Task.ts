import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TaskStatus } from '../../shared/types';

@Entity('tasks')
export class TaskEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  @Column('uuid', { nullable: true })
  orderId?: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({
    type: 'text',
    default: TaskStatus.NOT_STARTED,
  })
  status!: TaskStatus;

  @Column({ type: 'datetime' })
  startDate!: Date;

  @Column({ type: 'datetime' })
  endDate!: Date;

  @Column({ type: 'datetime', nullable: true })
  plannedStartDateTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  plannedEndDateTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  actualStartDateTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  actualEndDateTime?: Date;

  @Column('int')
  estimatedDays!: number;

  @Column('int', { nullable: true })
  actualDays?: number;

  @Column('uuid', { nullable: true })
  assignedUserId?: string;

  @Column('simple-array', { default: '', nullable: true })
  resourceIds?: string[];

  @Column('simple-array', { default: '', nullable: true })
  purchaseIds?: string[];

  @Column('simple-array', { default: '', nullable: true })
  deliverableIds?: string[];

  @Column('simple-array', { default: '' })
  dependencies!: string[];

  @Column({ default: false })
  isCritical!: boolean;

  @Column('int', { nullable: true })
  slackDays?: number;

  @Column({ default: false })
  milestone!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

