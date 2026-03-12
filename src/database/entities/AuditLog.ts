import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  APPROVE = 'approve',
  REJECT = 'reject',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  TRANSFER = 'transfer',
}

export enum AuditEntityType {
  ORDER = 'order',
  PROJECT = 'project',
  TASK = 'task',
  USER = 'user',
  REQUISITION = 'requisition',
  RESOURCE = 'resource',
  DEPARTMENT = 'department',
  CONFIGURATION = 'configuration',
  TIME_ENTRY = 'time_entry',
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  userId?: string; // User who performed the action

  @Column({ nullable: true })
  userName?: string; // Name of user who performed the action

  @Column({ nullable: true })
  userSurname?: string; // Surname of user who performed the action

  @Column({ nullable: true })
  userEmail?: string; // Email of user who performed the action

  @Column('text')
  action!: AuditAction; // Action performed

  @Column('text')
  entityType!: AuditEntityType; // Type of entity affected

  @Column('uuid', { nullable: true })
  entityId?: string; // ID of the entity affected

  @Column('text', { nullable: true })
  entityName?: string; // Name/description of the entity for easier reference

  @Column('text', { nullable: true })
  description?: string; // Detailed description of the action

  @Column('text', { nullable: true })
  ipAddress?: string; // IP address of the user

  @Column('text', { nullable: true })
  userAgent?: string; // User agent/browser info

  @Column('text', { nullable: true })
  oldValues?: string; // JSON string of old values (for updates)

  @Column('text', { nullable: true })
  newValues?: string; // JSON string of new values (for updates)

  @Column('text', { nullable: true })
  metadata?: string; // Additional metadata as JSON string

  @CreateDateColumn()
  createdAt!: Date;
}








