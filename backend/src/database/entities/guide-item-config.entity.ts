import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('guide_item_config')
@Index('uk_guide_item_config_platform_item_id', ['platformItemId'], { unique: true })
@Index('idx_guide_item_config_dept_code', ['deptCode'])
@Index('idx_guide_item_config_theme_code', ['themeCode'])
@Index('idx_guide_item_config_sort_order', ['sortOrder'])
export class GuideItemConfig extends BaseBusinessEntity {
  @Column({ name: 'platform_item_id', type: 'varchar', length: 100 })
  platformItemId: string;

  @Column({ name: 'item_name', type: 'varchar', length: 255 })
  itemName: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'dept_code', type: 'varchar', length: 50, nullable: true })
  deptCode: string | null;

  @Column({ name: 'theme_code', type: 'varchar', length: 50, nullable: true })
  themeCode: string | null;

  @Column({ name: 'is_hot', type: 'smallint', default: 0 })
  isHot: number;

  @Column({ name: 'is_recommend', type: 'smallint', default: 0 })
  isRecommend: number;

  @Column({ name: 'is_visible', type: 'smallint', default: 1 })
  isVisible: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'related_policy_ids', type: 'text', nullable: true })
  relatedPolicyIds: string | null;

  @Column({ name: 'related_faq_ids', type: 'text', nullable: true })
  relatedFaqIds: string | null;
}
