import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('project_analysis')
export class ProjectAnalysisEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string; // Link to the completed order/project

  @Column('text')
  recommendations!: string; // AI-generated recommendations for future projects

  @Column('text')
  weaknesses!: string; // AI-identified weaknesses in the project

  @Column('text')
  faults!: string; // AI-identified faults and issues

  @Column('text')
  mistakes!: string; // AI-identified mistakes made during the project

  @Column('text', { nullable: true })
  summary?: string; // Overall summary of the analysis

  @Column('text', { nullable: true })
  rawData?: string; // JSON string of the data used for analysis

  @Column('uuid', { nullable: true })
  analyzedBy?: string; // User ID who triggered the analysis (if manual)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
