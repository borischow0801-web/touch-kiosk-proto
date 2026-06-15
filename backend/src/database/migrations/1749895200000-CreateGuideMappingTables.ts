import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGuideMappingTables1749895200000 implements MigrationInterface {
  name = 'CreateGuideMappingTables1749895200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // guide_dept_mapping — dept_code globally unique (includes soft-deleted rows).
    await queryRunner.createTable(
      new Table({
        name: 'guide_dept_mapping',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'dept_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'dept_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'display_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'icon', type: 'varchar', length: '255', isNullable: true },
          { name: 'floor_text', type: 'varchar', length: '100', isNullable: true },
          { name: 'area_text', type: 'varchar', length: '100', isNullable: true },
          { name: 'is_visible', type: 'smallint', isNullable: false, default: 1 },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'active'" },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({
            name: 'uk_guide_dept_mapping_dept_code',
            columnNames: ['dept_code'],
            isUnique: true,
          }),
          new TableIndex({ name: 'idx_guide_dept_mapping_status', columnNames: ['status'] }),
          new TableIndex({ name: 'idx_guide_dept_mapping_sort_order', columnNames: ['sort_order'] }),
        ],
      }),
      false,
    );

    // guide_theme_mapping — theme_code globally unique (includes soft-deleted rows).
    await queryRunner.createTable(
      new Table({
        name: 'guide_theme_mapping',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'theme_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'theme_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'platform_param_json', type: 'text', isNullable: true },
          { name: 'icon', type: 'varchar', length: '255', isNullable: true },
          { name: 'is_visible', type: 'smallint', isNullable: false, default: 1 },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({
            name: 'uk_guide_theme_mapping_theme_code',
            columnNames: ['theme_code'],
            isUnique: true,
          }),
          new TableIndex({ name: 'idx_guide_theme_mapping_sort_order', columnNames: ['sort_order'] }),
        ],
      }),
      false,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('guide_theme_mapping');
    await queryRunner.dropTable('guide_dept_mapping');
  }
}
