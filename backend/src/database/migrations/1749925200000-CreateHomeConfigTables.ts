import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateHomeConfigTables1749925200000 implements MigrationInterface {
  name = 'CreateHomeConfigTables1749925200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'home_config',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'config_name', type: 'varchar', length: '50', isNullable: false, default: "'default'" },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'draft'" },
          { name: 'current_version_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'created_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'updated_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({ name: 'idx_home_config_config_name', columnNames: ['config_name'] }),
          new TableIndex({ name: 'idx_home_config_status', columnNames: ['status'] }),
          new TableIndex({ name: 'idx_home_config_current_version_id', columnNames: ['current_version_id'] }),
        ],
      }),
      false,
    );

    await queryRunner.createTable(
      new Table({
        name: 'home_config_version',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'home_config_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'version_no', type: 'int', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'subtitle', type: 'varchar', length: '255', isNullable: true },
          { name: 'top_banner_json', type: 'text', isNullable: true },
          { name: 'theme_json', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'draft'" },
          { name: 'change_remark', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_by', type: 'varchar', length: '36', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({
            name: 'idx_home_config_version_home_config_id',
            columnNames: ['home_config_id'],
          }),
          new TableIndex({ name: 'idx_home_config_version_status', columnNames: ['status'] }),
          new TableIndex({
            name: 'uk_home_config_version_config_version_no',
            columnNames: ['home_config_id', 'version_no'],
            isUnique: true,
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_home_config_version_home_config_id',
            columnNames: ['home_config_id'],
            referencedTableName: 'home_config',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    await queryRunner.createTable(
      new Table({
        name: 'home_module',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'home_config_version_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'module_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'module_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'module_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'icon', type: 'varchar', length: '100', isNullable: true },
          { name: 'color', type: 'varchar', length: '50', isNullable: true },
          { name: 'layout_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'is_visible', type: 'smallint', isNullable: false, default: 1 },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'target_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'target_value', type: 'varchar', length: '500', isNullable: false },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({
            name: 'idx_home_module_home_config_version_id',
            columnNames: ['home_config_version_id'],
          }),
          new TableIndex({ name: 'idx_home_module_sort_order', columnNames: ['sort_order'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_home_module_home_config_version_id',
            columnNames: ['home_config_version_id'],
            referencedTableName: 'home_config_version',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    await queryRunner.createForeignKey(
      'home_config',
      new TableForeignKey({
        name: 'fk_home_config_current_version_id',
        columnNames: ['current_version_id'],
        referencedTableName: 'home_config_version',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const homeConfigTable = await queryRunner.getTable('home_config');
    const currentVersionFk = homeConfigTable?.foreignKeys.find(
      (fk) => fk.name === 'fk_home_config_current_version_id',
    );
    if (currentVersionFk) {
      await queryRunner.dropForeignKey('home_config', currentVersionFk);
    }

    await queryRunner.dropTable('home_module');
    await queryRunner.dropTable('home_config_version');
    await queryRunner.dropTable('home_config');
  }
}
