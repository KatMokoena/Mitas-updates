import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('task_invitations')
export class TaskInvitationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  taskId!: string;

  @Column('uuid')
  inviterId!: string; // User who sent the invitation

  @Column('uuid')
  inviteeId!: string; // User who is invited

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




