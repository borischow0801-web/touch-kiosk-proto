import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('home_module')
@Index('idx_home_module_home_config_version_id', ['homeConfigVersionId'])
@Index('idx_home_module_sort_order', ['sortOrder'])
export class HomeModule extends BaseBusinessEntity {
  @Column({ name: 'home_config_version_id', type: 'varchar', length: 36 })
  homeConfigVersionId: string;

  @Column({ name: 'module_code', type: 'varchar', length: 50 })
  moduleCode: string;

  @Column({ name: 'module_name', type: 'varchar', length: 100 })
  moduleName: string;

  @Column({ name: 'module_type', type: 'varchar', length: 50 })
  moduleType: string;

  @Column({ name: 'icon', type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ name: 'color', type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @Column({ name: 'layout_type', type: 'varchar', length: 50, nullable: true })
  layoutType: string | null;

  @Column({ name: 'is_visible', type: 'smallint', default: 1 })
  isVisible: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  targetType: string;

  @Column({ name: 'target_value', type: 'varchar', length: 500 })
  targetValue: string;
}
