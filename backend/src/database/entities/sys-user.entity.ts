import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('sys_user')
@Index('idx_sys_user_status', ['status'])
@Index('idx_sys_user_deleted_at', ['deletedAt'])
export class SysUser extends BaseBusinessEntity {
  @Index('uk_sys_user_username', { unique: true })
  @Column({ name: 'username', type: 'varchar', length: 64 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'real_name', type: 'varchar', length: 64, nullable: true })
  realName: string | null;

  @Column({ name: 'mobile', type: 'varchar', length: 20, nullable: true })
  mobile: string | null;

  @Column({ name: 'email', type: 'varchar', length: 128, nullable: true })
  email: string | null;

  // Status values: active | disabled
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;
}
