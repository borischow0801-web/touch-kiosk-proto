import { Column, Entity, Index } from 'typeorm';
import { BaseRelationEntity } from './base-relation.entity';

@Entity('sys_user_role')
@Index('idx_sys_user_role_user_id', ['userId'])
@Index('idx_sys_user_role_role_id', ['roleId'])
@Index('uk_sys_user_role_pair', ['userId', 'roleId'], { unique: true })
export class SysUserRole extends BaseRelationEntity {
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'role_id', type: 'varchar', length: 36 })
  roleId: string;
}
