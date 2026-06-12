import { Column, Entity, Index } from 'typeorm';
import { BaseRelationEntity } from './base-relation.entity';

@Entity('content_relation')
@Index('idx_content_relation_source_id', ['sourceId'])
@Index('idx_content_relation_target_id', ['targetId'])
@Index('uk_content_relation_triple', ['sourceId', 'targetId', 'relationType'], { unique: true })
export class ContentRelation extends BaseRelationEntity {
  @Column({ name: 'source_id', type: 'varchar', length: 36 })
  sourceId: string;

  @Column({ name: 'target_id', type: 'varchar', length: 36 })
  targetId: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 50 })
  relationType: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
