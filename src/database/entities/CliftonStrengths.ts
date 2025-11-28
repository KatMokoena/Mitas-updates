import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clifton_strengths')
export class CliftonStrengthsEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string; // User this strength profile belongs to

  @Column('simple-array')
  topStrengths!: string[]; // Array of top 6 strength names

  @Column('uuid', { nullable: true })
  createdBy?: string; // Admin who created/updated this profile

  @Column('uuid', { nullable: true })
  updatedBy?: string; // Admin who last updated this profile

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Re-export from shared location for backend use
export { ALL_CLIFTON_STRENGTHS, STRENGTH_DETAILS } from '../../shared/cliftonStrengths';

