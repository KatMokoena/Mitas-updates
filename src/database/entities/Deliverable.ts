import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('deliverables')
export class DeliverableEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ type: 'datetime' })
  dueDate!: Date;

  @Column({ default: false })
  completed!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}














