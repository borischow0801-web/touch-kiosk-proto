import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateContentTables1749859200000 implements MigrationInterface {
  name = 'CreateContentTables1749859200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1 ── content_category (self FK → parent_id) ───────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'content_category',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'parent_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'category_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'content_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'active'" },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({ name: 'idx_content_category_parent_id', columnNames: ['parent_id'] }),
          new TableIndex({ name: 'idx_content_category_content_type', columnNames: ['content_type'] }),
          new TableIndex({ name: 'idx_content_category_status', columnNames: ['status'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_content_category_parent_id',
            columnNames: ['parent_id'],
            referencedTableName: 'content_category',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    // 2 ── content_item (FK → content_category) ─────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'content_item',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'content_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'subtitle', type: 'varchar', length: '255', isNullable: true },
          { name: 'summary', type: 'varchar', length: '500', isNullable: true },
          { name: 'category_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'cover_file_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'current_version_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'draft'" },
          { name: 'is_top', type: 'smallint', isNullable: false, default: 0 },
          { name: 'is_recommend', type: 'smallint', isNullable: false, default: 0 },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'publish_at', type: 'timestamp', isNullable: true },
          { name: 'source_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'source_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'updated_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({ name: 'idx_content_item_content_type', columnNames: ['content_type'] }),
          new TableIndex({ name: 'idx_content_item_category_id', columnNames: ['category_id'] }),
          new TableIndex({ name: 'idx_content_item_status', columnNames: ['status'] }),
          new TableIndex({ name: 'idx_content_item_current_version_id', columnNames: ['current_version_id'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_content_item_category_id',
            columnNames: ['category_id'],
            referencedTableName: 'content_category',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    // 3 ── content_version (FK → content_item) ──────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'content_version',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'content_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'version_no', type: 'int', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'summary', type: 'varchar', length: '500', isNullable: true },
          { name: 'body', type: 'text', isNullable: true },
          { name: 'extra_json', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'draft'" },
          { name: 'change_remark', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({ name: 'idx_content_version_content_id', columnNames: ['content_id'] }),
          new TableIndex({ name: 'idx_content_version_status', columnNames: ['status'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_content_version_content_id',
            columnNames: ['content_id'],
            referencedTableName: 'content_item',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    // 4 ── content_relation (FK → content_item × 2) ─────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'content_relation',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'source_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'target_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'relation_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({ name: 'idx_content_relation_source_id', columnNames: ['source_id'] }),
          new TableIndex({ name: 'idx_content_relation_target_id', columnNames: ['target_id'] }),
          new TableIndex({
            name: 'uk_content_relation_triple',
            columnNames: ['source_id', 'target_id', 'relation_type'],
            isUnique: true,
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_content_relation_source_id',
            columnNames: ['source_id'],
            referencedTableName: 'content_item',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
          new TableForeignKey({
            name: 'fk_content_relation_target_id',
            columnNames: ['target_id'],
            referencedTableName: 'content_item',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('content_relation');
    await queryRunner.dropTable('content_version');
    await queryRunner.dropTable('content_item');
    await queryRunner.dropTable('content_category');
  }
}
