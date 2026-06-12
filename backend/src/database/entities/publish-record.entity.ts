import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('publish_record')
@Index('idx_publish_record_biz', ['bizType', 'bizId'])
@Index('idx_publish_record_version_id', ['versionId'])
@Index('idx_publish_record_operator_id', ['operatorId'])
@Index('idx_publish_record_operated_at', ['operatedAt'])
export class PublishRecord {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 50 })
  bizType: string;

  @Column({ name: 'biz_id', type: 'varchar', length: 36 })
  bizId: string;

  @Column({ name: 'version_id', type: 'varchar', length: 36 })
  versionId: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', length: 20 })
  fromStatus: string;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: string;

  @Column({ name: 'comment', type: 'varchar', length: 500, nullable: true })
  comment: string | null;

  @Column({ name: 'operator_id', type: 'varchar', length: 36 })
  operatorId: string;

  @Column({ name: 'operated_at', type: 'timestamp' })
  operatedAt: Date;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
