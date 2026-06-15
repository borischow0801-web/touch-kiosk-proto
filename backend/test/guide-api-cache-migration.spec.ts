import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749921600000-CreateGuideApiCacheTable — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749921600000-CreateGuideApiCacheTable.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('does not use raw queryRunner.query', () => {
    expect(content).not.toContain('queryRunner.query(');
  });

  it('does not use ENUM or JSON column types', () => {
    expect(content).not.toMatch(/type:\s*['"]enum['"]/i);
    expect(content).not.toMatch(/type:\s*['"]json['"]/i);
  });

  it('uses varchar(36) primary key without auto increment', () => {
    expect(content).toMatch(/name:\s*'id'[\s\S]*?type:\s*'varchar'[\s\S]*?length:\s*'36'[\s\S]*?isPrimary:\s*true/);
  });

  it('stores request_param and response_body as text', () => {
    expect(content).toMatch(/name:\s*'request_param'[\s\S]*?type:\s*'text'/);
    expect(content).toMatch(/name:\s*'response_body'[\s\S]*?type:\s*'text'/);
  });

  it('cache_key has unique index', () => {
    expect(content).toContain('uk_guide_api_cache_cache_key');
    expect(content).toMatch(
      /name:\s*'uk_guide_api_cache_cache_key'[\s\S]*?columnNames:\s*\['cache_key'\][\s\S]*?isUnique:\s*true/,
    );
  });

  it('does not include deleted_at (infrastructure cache table)', () => {
    expect(content).not.toContain("name: 'deleted_at'");
  });

  it('down() drops guide_api_cache', () => {
    expect(content).toContain("dropTable('guide_api_cache')");
  });
});
