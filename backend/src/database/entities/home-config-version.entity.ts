import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('home_config_version')
@Index('idx_home_config_version_home_config_id', ['homeConfigId'])
@Index('idx_home_config_version_status', ['status'])
@Index('uk_home_config_version_config_version_no', ['homeConfigId', 'versionNo'], { unique: true })
export class HomeConfigVersion {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'home_config_id', type: 'varchar', length: 36 })
  homeConfigId: string;

  @Column({ name: 'version_no', type: 'int' })
  versionNo: number;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'subtitle', type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ name: 'top_banner_json', type: 'text', nullable: true })
  topBannerJson: string | null;

  @Column({ name: 'theme_json', type: 'text', nullable: true })
  themeJson: string | null;

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
