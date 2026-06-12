import { Column, Entity, Index } from 'typeorm';
import { BaseRelationEntity } from './base-relation.entity';

@Entity('sys_role_permission')
@Index('idx_sys_role_permission_role_id', ['roleId'])
@Index('idx_sys_role_permission_perm_id', ['permissionId'])
@Index('uk_sys_role_permission_pair', ['roleId', 'permissionId'], { unique: true })
export class SysRolePermission extends BaseRelationEntity {
  @Column({ name: 'role_id', type: 'varchar', length: 36 })
  roleId: string;

  @Column({ name: 'permission_id', type: 'varchar', length: 36 })
  permissionId: string;
}
