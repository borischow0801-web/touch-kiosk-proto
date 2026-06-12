import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('content_category')
@Index('idx_content_category_parent_id', ['parentId'])
@Index('idx_content_category_content_type', ['contentType'])
@Index('idx_content_category_status', ['status'])
export class ContentCategory extends BaseBusinessEntity {
  @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true })
  parentId: string | null;

  @Column({ name: 'category_name', type: 'varchar', length: 100 })
  categoryName: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;
}
