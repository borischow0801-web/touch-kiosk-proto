import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRbacTables1749686400000 implements MigrationInterface {
  name = 'CreateRbacTables1749686400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1 ── sys_user ────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sys_user',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'username', type: 'varchar', length: '64', isNullable: false },
          { name: 'password_hash', type: 'varchar', length: '255', isNullable: false },
          { name: 'real_name', type: 'varchar', length: '64', isNullable: true },
          { name: 'mobile', type: 'varchar', length: '20', isNullable: true },
          { name: 'email', type: 'varchar', length: '128', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'active'" },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({ name: 'uk_sys_user_username', columnNames: ['username'], isUnique: true }),
          new TableIndex({ name: 'idx_sys_user_status', columnNames: ['status'] }),
          new TableIndex({ name: 'idx_sys_user_deleted_at', columnNames: ['deleted_at'] }),
        ],
      }),
      false,
    );

    // 2 ── sys_role ────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sys_role',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'role_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'role_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'active'" },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        indices: [
          new TableIndex({ name: 'uk_sys_role_role_code', columnNames: ['role_code'], isUnique: true }),
          new TableIndex({ name: 'idx_sys_role_status', columnNames: ['status'] }),
          new TableIndex({ name: 'idx_sys_role_deleted_at', columnNames: ['deleted_at'] }),
        ],
      }),
      false,
    );

    // 3 ── sys_permission ──────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sys_permission',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'permission_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'permission_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'module_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'permission_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({ name: 'uk_sys_permission_code', columnNames: ['permission_code'], isUnique: true }),
          new TableIndex({ name: 'idx_sys_permission_module_code', columnNames: ['module_code'] }),
        ],
      }),
      false,
    );

    // 4 ── sys_user_role (FK → sys_user, sys_role) ─────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sys_user_role',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'user_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'role_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({ name: 'uk_sys_user_role_pair', columnNames: ['user_id', 'role_id'], isUnique: true }),
          new TableIndex({ name: 'idx_sys_user_role_user_id', columnNames: ['user_id'] }),
          new TableIndex({ name: 'idx_sys_user_role_role_id', columnNames: ['role_id'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_sys_user_role_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'sys_user',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
          new TableForeignKey({
            name: 'fk_sys_user_role_role_id',
            columnNames: ['role_id'],
            referencedTableName: 'sys_role',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
        ],
      }),
      false,
    );

    // 5 ── sys_role_permission (FK → sys_role, sys_permission) ─────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sys_role_permission',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'role_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'permission_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({ name: 'uk_sys_role_permission_pair', columnNames: ['role_id', 'permission_id'], isUnique: true }),
          new TableIndex({ name: 'idx_sys_role_permission_role_id', columnNames: ['role_id'] }),
          new TableIndex({ name: 'idx_sys_role_permission_perm_id', columnNames: ['permission_id'] }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_sys_role_permission_role_id',
            columnNames: ['role_id'],
            referencedTableName: 'sys_role',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }),
          new TableForeignKey({
            name: 'fk_sys_role_permission_permission_id',
            columnNames: ['permission_id'],
            referencedTableName: 'sys_permission',
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
    // Drop FK-referencing join tables first, then referenced tables
    await queryRunner.dropTable('sys_role_permission');
    await queryRunner.dropTable('sys_user_role');
    await queryRunner.dropTable('sys_permission');
    await queryRunner.dropTable('sys_role');
    await queryRunner.dropTable('sys_user');
  }
}
