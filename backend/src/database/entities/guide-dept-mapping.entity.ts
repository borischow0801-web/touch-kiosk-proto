import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('guide_dept_mapping')
@Index('uk_guide_dept_mapping_dept_code', ['deptCode'], { unique: true })
@Index('idx_guide_dept_mapping_status', ['status'])
@Index('idx_guide_dept_mapping_sort_order', ['sortOrder'])
export class GuideDeptMapping extends BaseBusinessEntity {
  @Column({ name: 'dept_name', type: 'varchar', length: 100 })
  deptName: string;

  @Column({ name: 'dept_code', type: 'varchar', length: 50 })
  deptCode: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string | null;

  @Column({ name: 'floor_text', type: 'varchar', length: 100, nullable: true })
  floorText: string | null;

  @Column({ name: 'area_text', type: 'varchar', length: 100, nullable: true })
  areaText: string | null;

  @Column({ name: 'is_visible', type: 'smallint', default: 1 })
  isVisible: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;
}
