import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749895200000-CreateGuideMappingTables — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749895200000-CreateGuideMappingTables.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('does not use raw queryRunner.query', () => {
    expect(content).not.toContain('queryRunner.query(');
  });

  it('does not contain ENGINE=', () => {
    expect(content).not.toMatch(/ENGINE\s*=/i);
  });

  it('does not contain CHARSET=', () => {
    expect(content).not.toMatch(/CHARSET\s*=/i);
  });

  it('does not contain COLLATE', () => {
    expect(content).not.toMatch(/COLLATE/i);
  });

  it('does not contain backtick identifiers', () => {
    expect(content).not.toContain('`');
  });

  it('does not contain UNIQUE KEY (MySQL DDL)', () => {
    expect(content).not.toMatch(/UNIQUE\s+KEY/i);
  });

  it('does not use CREATE TABLE IF NOT EXISTS', () => {
    expect(content).not.toMatch(/IF\s+NOT\s+EXISTS/i);
  });

  it('does not use ENUM column type', () => {
    expect(content).not.toMatch(/type:\s*['"]enum['"]/i);
  });

  it('does not use JSON column type', () => {
    expect(content).not.toMatch(/type:\s*['"]json['"]/i);
  });

  it('does not use auto increment', () => {
    expect(content).not.toMatch(/AUTO_INCREMENT/i);
    expect(content).not.toMatch(/isGenerated:\s*true/i);
  });

  it('uses TypeORM Table API (createTable)', () => {
    expect(content).toContain('createTable');
  });

  it('creates exactly 2 guide mapping tables', () => {
    expect(content).toContain("name: 'guide_dept_mapping'");
    expect(content).toContain("name: 'guide_theme_mapping'");
    const createTableCount = (content.match(/createTable\s*\(/g) ?? []).length;
    expect(createTableCount).toBe(2);
  });

  it('uses varchar(36) primary key without auto increment', () => {
    expect(content).toMatch(/name:\s*'id'[\s\S]*?type:\s*'varchar'[\s\S]*?length:\s*'36'[\s\S]*?isPrimary:\s*true/);
  });

  it('stores platform_param_json as text not JSON type', () => {
    expect(content).toMatch(/name:\s*'platform_param_json'[\s\S]*?type:\s*'text'/);
  });

  it('uses smallint for is_visible (HighGo compatible)', () => {
    expect(content).toMatch(/name:\s*'is_visible'[\s\S]*?type:\s*'smallint'/);
    expect(content).not.toMatch(/type:\s*'tinyint'/);
  });

  it('includes soft-delete deleted_at column on both tables', () => {
    const deletedAtCount = (content.match(/name:\s*'deleted_at'/g) ?? []).length;
    expect(deletedAtCount).toBe(2);
  });

  it('dept_code 与 theme_code 使用 isUnique: true 的全局唯一索引', () => {
    expect(content).toContain('uk_guide_dept_mapping_dept_code');
    expect(content).toContain('uk_guide_theme_mapping_theme_code');
    expect(content).toMatch(
      /name:\s*'uk_guide_dept_mapping_dept_code'[\s\S]*?columnNames:\s*\['dept_code'\][\s\S]*?isUnique:\s*true/,
    );
    expect(content).toMatch(
      /name:\s*'uk_guide_theme_mapping_theme_code'[\s\S]*?columnNames:\s*\['theme_code'\][\s\S]*?isUnique:\s*true/,
    );
  });

  it('down() drops both tables', () => {
    expect(content).toContain("dropTable('guide_theme_mapping')");
    expect(content).toContain("dropTable('guide_dept_mapping')");
  });
});
