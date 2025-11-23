import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../shared/types';

@Entity('configurations')
export class ConfigurationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
  })
  role!: UserRole;

  @Column('simple-array', { default: '' })
  allowedRoutes!: string[];

  @Column('text', { nullable: true, default: '{}' })
  permissions!: string; // JSON string storing permission flags like {"canDeleteOrders": true}

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

