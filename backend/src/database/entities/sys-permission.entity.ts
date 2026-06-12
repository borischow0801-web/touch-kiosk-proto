import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// sys_permission has no deleted_at per database.md — not soft-deletable.
@Entity('sys_permission')
@Index('idx_sys_permission_module_code', ['moduleCode'])
export class SysPermission {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('uk_sys_permission_code', { unique: true })
  @Column({ name: 'permission_code', type: 'varchar', length: 100 })
  permissionCode: string;

  @Column({ name: 'permission_name', type: 'varchar', length: 100 })
  permissionName: string;

  @Column({ name: 'module_code', type: 'varchar', length: 50 })
  moduleCode: string;

  // permission_type values: menu | button | api
  @Column({ name: 'permission_type', type: 'varchar', length: 20 })
  permissionType: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
