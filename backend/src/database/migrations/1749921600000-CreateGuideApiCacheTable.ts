import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGuideApiCacheTable1749921600000 implements MigrationInterface {
  name = 'CreateGuideApiCacheTable1749921600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'guide_api_cache',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'cache_key', type: 'varchar', length: '255', isNullable: false },
          { name: 'api_name', type: 'varchar', length: '50', isNullable: false },
          { name: 'request_param', type: 'text', isNullable: true },
          { name: 'response_body', type: 'text', isNullable: false },
          { name: 'success_at', type: 'timestamp', isNullable: false },
          { name: 'expire_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({
            name: 'uk_guide_api_cache_cache_key',
            columnNames: ['cache_key'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_guide_api_cache_api_name',
            columnNames: ['api_name'],
          }),
        ],
      }),
      false,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('guide_api_cache');
  }
}
