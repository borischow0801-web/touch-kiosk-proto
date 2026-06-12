import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('content_item')
@Index('idx_content_item_content_type', ['contentType'])
@Index('idx_content_item_category_id', ['categoryId'])
@Index('idx_content_item_status', ['status'])
@Index('idx_content_item_current_version_id', ['currentVersionId'])
export class ContentItem extends BaseBusinessEntity {
  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'subtitle', type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ name: 'summary', type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @Column({ name: 'cover_file_id', type: 'varchar', length: 36, nullable: true })
  coverFileId: string | null;

  @Column({ name: 'current_version_id', type: 'varchar', length: 36, nullable: true })
  currentVersionId: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'is_top', type: 'smallint', default: 0 })
  isTop: number;

  @Column({ name: 'is_recommend', type: 'smallint', default: 0 })
  isRecommend: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'publish_at', type: 'timestamp', nullable: true })
  publishAt: Date | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy: string | null;
}
