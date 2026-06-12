import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749880800000-CreatePublishRecordTable — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749880800000-CreatePublishRecordTable.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('does not use raw queryRunner.query', () => {
    expect(content).not.toContain('queryRunner.query(');
  });

  it('creates publish_record with database.md fields only', () => {
    expect(content).toContain("name: 'publish_record'");
    expect(content).toContain("name: 'biz_type'");
    expect(content).toContain("name: 'biz_id'");
    expect(content).toContain("name: 'version_id'");
    expect(content).toContain("name: 'action'");
    expect(content).toContain("name: 'from_status'");
    expect(content).toContain("name: 'to_status'");
    expect(content).toContain("name: 'comment'");
    expect(content).toContain("name: 'operator_id'");
    expect(content).toContain("name: 'operated_at'");
  });

  it('does not use ENUM or JSON column types', () => {
    expect(content).not.toMatch(/type:\s*['"]enum['"]/i);
    expect(content).not.toMatch(/type:\s*['"]json['"]/i);
  });

  it('defines query indexes for biz, version, operator, operated_at', () => {
    expect(content).toContain('idx_publish_record_biz');
    expect(content).toContain('idx_publish_record_version_id');
    expect(content).toContain('idx_publish_record_operator_id');
    expect(content).toContain('idx_publish_record_operated_at');
  });
});
