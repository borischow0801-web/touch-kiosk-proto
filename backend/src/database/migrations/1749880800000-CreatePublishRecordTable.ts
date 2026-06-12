import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePublishRecordTable1749880800000 implements MigrationInterface {
  name = 'CreatePublishRecordTable1749880800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'publish_record',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, isNullable: false },
          { name: 'biz_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'biz_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'version_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'action', type: 'varchar', length: '50', isNullable: false },
          { name: 'from_status', type: 'varchar', length: '20', isNullable: false },
          { name: 'to_status', type: 'varchar', length: '20', isNullable: false },
          { name: 'comment', type: 'varchar', length: '500', isNullable: true },
          { name: 'operator_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'operated_at', type: 'timestamp', isNullable: false },
        ],
        indices: [
          new TableIndex({
            name: 'idx_publish_record_biz',
            columnNames: ['biz_type', 'biz_id'],
          }),
          new TableIndex({
            name: 'idx_publish_record_version_id',
            columnNames: ['version_id'],
          }),
          new TableIndex({
            name: 'idx_publish_record_operator_id',
            columnNames: ['operator_id'],
          }),
          new TableIndex({
            name: 'idx_publish_record_operated_at',
            columnNames: ['operated_at'],
          }),
        ],
      }),
      false,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('publish_record');
  }
}
