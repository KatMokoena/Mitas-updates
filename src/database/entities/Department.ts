import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('departments')
export class DepartmentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
















