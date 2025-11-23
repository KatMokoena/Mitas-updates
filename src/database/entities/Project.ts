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

  @Column({ type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}








