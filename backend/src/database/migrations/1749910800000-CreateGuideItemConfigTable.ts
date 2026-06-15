import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGuideItemConfigTable1749910800000 implements MigrationInterface {
  name = 'CreateGuideItemConfigTable1749910800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // platform_item_id globally unique (includes soft-deleted rows).
    await queryRunner.createTable(
      new Table({
        name: 'guide_item_config',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'platform_item_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'item_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'display_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'dept_code', type: 'varchar', length: '50', isNullable: true },
          { name: 'theme_code', type: 'varchar', length: '50', isNullable: true },
          { name: 'is_hot', type: 'smallint', isNullable: false, default: 0 },
          { name: 'is_recommend', type: 'smallint', isNullable: false, default: 0 },
          { name: 'is_visible', type: 'smallint', isNullable: false, default: 1 },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'related_policy_ids', type: 'text', isNullable: true },
          { name: 'related_faq_ids', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({
            name: 'uk_guide_item_config_platform_item_id',
            columnNames: ['platform_item_id'],
            isUnique: true,
          }),
          new TableIndex({ name: 'idx_guide_item_config_dept_code', columnNames: ['dept_code'] }),
          new TableIndex({ name: 'idx_guide_item_config_theme_code', columnNames: ['theme_code'] }),
          new TableIndex({ name: 'idx_guide_item_config_sort_order', columnNames: ['sort_order'] }),
        ],
      }),
      false,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('guide_item_config');
  }
}
