import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { ContentItem } from '../entities/content-item.entity';

/**
 * Content table integrity revision — owns constraints NOT created by CreateContentTables.
 *
 * Ownership:
 *   CreateContentTables1749859200000:
 *     - content_item.is_top / is_recommend as smallint
 *     - all base tables, non-unique indexes, category/version/relation FKs
 *   AlterContentTablesIntegrity1749873600000 (this migration):
 *     - uk_content_version_content_version_no
 *     - fk_content_item_current_version_id
 *     - normalize legacy tinyint → smallint on existing dev databases
 *     - clear erroneous draft current_version_id values
 *
 * down() removes only this migration's index and FK; columns remain smallint (HighGo-safe).
 */
export class AlterContentTablesIntegrity1749873600000 implements MigrationInterface {
  name = 'AlterContentTablesIntegrity1749873600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'content_item',
      'is_top',
      new TableColumn({
        name: 'is_top',
        type: 'smallint',
        isNullable: false,
        default: 0,
      }),
    );
    await queryRunner.changeColumn(
      'content_item',
      'is_recommend',
      new TableColumn({
        name: 'is_recommend',
        type: 'smallint',
        isNullable: false,
        default: 0,
      }),
    );

    const versionTable = await queryRunner.getTable('content_version');
    const hasVersionUnique = versionTable?.indices.some(
      (idx) => idx.name === 'uk_content_version_content_version_no',
    );
    if (!hasVersionUnique) {
      await queryRunner.createIndex(
        'content_version',
        new TableIndex({
          name: 'uk_content_version_content_version_no',
          columnNames: ['content_id', 'version_no'],
          isUnique: true,
        }),
      );
    }

    // Draft-phase semantics: current_version_id is set only on publish (PublishModule).
    await queryRunner.manager
      .createQueryBuilder()
      .update(ContentItem)
      .set({ currentVersionId: null })
      .where('current_version_id IS NOT NULL')
      .execute();

    const itemTable = await queryRunner.getTable('content_item');
    const hasCurrentVersionFk = itemTable?.foreignKeys.some(
      (fk) => fk.name === 'fk_content_item_current_version_id',
    );
    if (!hasCurrentVersionFk) {
      await queryRunner.createForeignKey(
        'content_item',
        new TableForeignKey({
          name: 'fk_content_item_current_version_id',
          columnNames: ['current_version_id'],
          referencedTableName: 'content_version',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const itemTable = await queryRunner.getTable('content_item');
    const versionFk = itemTable?.foreignKeys.find(
      (fk) => fk.name === 'fk_content_item_current_version_id',
    );
    if (versionFk) {
      await queryRunner.dropForeignKey('content_item', versionFk);
    }

    const versionTable = await queryRunner.getTable('content_version');
    const versionUnique = versionTable?.indices.find(
      (idx) => idx.name === 'uk_content_version_content_version_no',
    );
    if (versionUnique) {
      await queryRunner.dropIndex('content_version', versionUnique);
    }
  }
}
