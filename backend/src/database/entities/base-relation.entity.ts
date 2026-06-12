import { BeforeInsert, CreateDateColumn, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base for many-to-many join table entities.
 * Fields: id (varchar 36 UUID), created_at only.
 */
export abstract class BaseRelationEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
