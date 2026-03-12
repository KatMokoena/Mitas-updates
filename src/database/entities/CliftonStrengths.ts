import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clifton_strengths')
export class CliftonStrengthsEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string; // User this strength profile belongs to

  @Column({ nullable: true })
  userName?: string; // Name of user this profile belongs to

  @Column({ nullable: true })
  userSurname?: string; // Surname of user this profile belongs to

  @Column({ nullable: true })
  userEmail?: string; // Email of user this profile belongs to

  @Column('simple-array')
  topStrengths!: string[]; // Array of top 6 strength names

  @Column('uuid', { nullable: true })
  createdBy?: string; // Admin who created/updated this profile

  @Column({ nullable: true })
  createdByName?: string; // Name of admin who created this profile

  @Column({ nullable: true })
  createdBySurname?: string; // Surname of admin who created this profile

  @Column({ nullable: true })
  createdByEmail?: string; // Email of admin who created this profile

  @Column('uuid', { nullable: true })
  updatedBy?: string; // Admin who last updated this profile

  @Column({ nullable: true })
  updatedByName?: string; // Name of admin who last updated this profile

  @Column({ nullable: true })
  updatedBySurname?: string; // Surname of admin who last updated this profile

  @Column({ nullable: true })
  updatedByEmail?: string; // Email of admin who last updated this profile

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Re-export from shared location for backend use
export { ALL_CLIFTON_STRENGTHS, STRENGTH_DETAILS } from '../../shared/cliftonStrengths';

