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

  @Column({ nullable: true })
  inviterName?: string; // Name of user who sent the invitation

  @Column({ nullable: true })
  inviterSurname?: string; // Surname of user who sent the invitation

  @Column({ nullable: true })
  inviterEmail?: string; // Email of user who sent the invitation

  @Column('uuid')
  inviteeId!: string; // User who is invited

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












