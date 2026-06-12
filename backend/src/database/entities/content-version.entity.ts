import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('content_version')
@Index('idx_content_version_content_id', ['contentId'])
@Index('idx_content_version_status', ['status'])
@Index('uk_content_version_content_version_no', ['contentId', 'versionNo'], { unique: true })
export class ContentVersion {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'content_id', type: 'varchar', length: 36 })
  contentId: string;

  @Column({ name: 'version_no', type: 'int' })
  versionNo: number;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'summary', type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ name: 'body', type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'extra_json', type: 'text', nullable: true })
  extraJson: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'change_remark', type: 'varchar', length: 255, nullable: true })
  changeRemark: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
