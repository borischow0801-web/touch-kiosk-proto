import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/** Infrastructure cache table — no logical delete (see dev-log 038). */
@Entity('guide_api_cache')
@Index('uk_guide_api_cache_cache_key', ['cacheKey'], { unique: true })
@Index('idx_guide_api_cache_api_name', ['apiName'])
export class GuideApiCache {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'cache_key', type: 'varchar', length: 255 })
  cacheKey: string;

  @Column({ name: 'api_name', type: 'varchar', length: 50 })
  apiName: string;

  @Column({ name: 'request_param', type: 'text', nullable: true })
  requestParam: string | null;

  @Column({ name: 'response_body', type: 'text' })
  responseBody: string;

  @Column({ name: 'success_at', type: 'timestamp' })
  successAt: Date;

  @Column({ name: 'expire_at', type: 'timestamp', nullable: true })
  expireAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
