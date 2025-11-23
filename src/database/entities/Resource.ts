import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('resources')
export class ResourceEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'text',
  })
  type!: 'labour' | 'equipment';

  @Column({ type: 'text', nullable: true })
  category?: string; // 'technology' | 'solution' for equipment

  @Column('simple-array', { default: '' })
  allocatedTaskIds!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


