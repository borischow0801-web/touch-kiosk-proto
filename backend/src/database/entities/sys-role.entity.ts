import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('sys_role')
@Index('idx_sys_role_status', ['status'])
@Index('idx_sys_role_deleted_at', ['deletedAt'])
export class SysRole extends BaseBusinessEntity {
  // Fixed role codes: SUPER_ADMIN | CONTENT_EDITOR | PUBLISH_REVIEWER
  @Index('uk_sys_role_role_code', { unique: true })
  @Column({ name: 'role_code', type: 'varchar', length: 50 })
  roleCode: string;

  @Column({ name: 'role_name', type: 'varchar', length: 100 })
  roleName: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Status values: active | disabled
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;
}
