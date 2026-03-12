import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProjectStatus, ComponentType } from '../../shared/types';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({
    type: 'text',
    default: ProjectStatus.PLANNING,
  })
  status!: ProjectStatus;

  @Column('simple-array')
  components!: ComponentType[];

  @Column('simple-array', { default: '' })
  assignedTeamIds!: string[];

  @Column('uuid', { nullable: true })
  departmentId?: string;

  @Column('uuid', { nullable: true })
  ownerId?: string; // User ID who owns/created the project

  @Column({ nullable: true })
  ownerName?: string; // Name of project owner

  @Column({ nullable: true })
  ownerSurname?: string; // Surname of project owner

  @Column({ nullable: true })
  ownerEmail?: string; // Email of project owner

  @Column({ type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}














