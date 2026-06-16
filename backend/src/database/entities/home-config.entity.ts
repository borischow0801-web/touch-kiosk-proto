import { Column, Entity, Index } from 'typeorm';
import { BaseBusinessEntity } from './base-business.entity';

@Entity('home_config')
@Index('idx_home_config_config_name', ['configName'])
@Index('idx_home_config_status', ['status'])
@Index('idx_home_config_current_version_id', ['currentVersionId'])
export class HomeConfig extends BaseBusinessEntity {
  @Column({ name: 'config_name', type: 'varchar', length: 50, default: 'default' })
  configName: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'current_version_id', type: 'varchar', length: 36, nullable: true })
  currentVersionId: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy: string | null;
}
