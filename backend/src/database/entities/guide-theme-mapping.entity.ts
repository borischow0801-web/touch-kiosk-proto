import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('guide_theme_mapping')
@Index('uk_guide_theme_mapping_theme_code', ['themeCode'], { unique: true })
@Index('idx_guide_theme_mapping_sort_order', ['sortOrder'])
export class GuideThemeMapping extends BaseBusinessEntity {
  @Column({ name: 'theme_name', type: 'varchar', length: 100 })
  themeName: string;

  @Column({ name: 'theme_code', type: 'varchar', length: 50 })
  themeCode: string;

  @Column({ name: 'platform_param_json', type: 'text', nullable: true })
  platformParamJson: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string | null;

  @Column({ name: 'is_visible', type: 'smallint', default: 1 })
  isVisible: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
