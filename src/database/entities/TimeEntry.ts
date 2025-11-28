import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TimeEntryType {
  TIMER = 'timer', // Real-time tracking via in-app timer
  MANUAL = 'manual', // Manual entry for retroactive time
}

export enum TimeEntryStatus {
  RUNNING = 'running', // Timer is currently running
  COMPLETED = 'completed', // Entry is completed/stopped
}

@Entity('time_entries')
export class TimeEntryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string; // Required: every time entry must be linked to a project

  @Column('uuid', { nullable: true })
  taskId?: string; // Optional: can track time at task level

  @Column('uuid', { nullable: true })
  orderId?: string; // Optional: link to order if project is order-based

  @Column('uuid')
  userId!: string; // User who logged the time

  @Column({
    type: 'text',
    default: TimeEntryType.MANUAL,
  })
  entryType!: TimeEntryType; // timer or manual

  @Column({
    type: 'text',
    default: TimeEntryStatus.COMPLETED,
  })
  status!: TimeEntryStatus; // running or completed

  @Column({ type: 'datetime' })
  startTime!: Date; // When time tracking started

  @Column({ type: 'datetime', nullable: true })
  endTime?: Date; // When time tracking ended (null if running)

  @Column('decimal', { precision: 10, scale: 2 })
  durationHours!: number; // Total hours (calculated or manually entered)

  @Column('text', { nullable: true })
  description?: string; // Description of work performed

  @Column('text', { nullable: true })
  notes?: string; // Additional notes

  @Column('uuid', { nullable: true })
  departmentId?: string; // Department of the user (for reporting)

  @CreateDateColumn()
  createdAt!: Date; // When the entry was created

  @UpdateDateColumn()
  updatedAt!: Date; // When the entry was last updated
}

