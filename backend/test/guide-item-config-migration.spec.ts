import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749910800000-CreateGuideItemConfigTable — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749910800000-CreateGuideItemConfigTable.ts',
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

  it('stores related IDs as text', () => {
    expect(content).toMatch(/name:\s*'related_policy_ids'[\s\S]*?type:\s*'text'/);
    expect(content).toMatch(/name:\s*'related_faq_ids'[\s\S]*?type:\s*'text'/);
  });

  it('uses smallint for is_hot, is_recommend, is_visible', () => {
    expect(content).toMatch(/name:\s*'is_hot'[\s\S]*?type:\s*'smallint'/);
    expect(content).toMatch(/name:\s*'is_recommend'[\s\S]*?type:\s*'smallint'/);
    expect(content).toMatch(/name:\s*'is_visible'[\s\S]*?type:\s*'smallint'/);
  });

  it('platform_item_id 使用 isUnique: true 全局唯一索引', () => {
    expect(content).toContain('uk_guide_item_config_platform_item_id');
    expect(content).toMatch(
      /name:\s*'uk_guide_item_config_platform_item_id'[\s\S]*?columnNames:\s*\['platform_item_id'\][\s\S]*?isUnique:\s*true/,
    );
  });

  it('includes deleted_at for logical delete', () => {
    expect(content).toContain("name: 'deleted_at'");
  });

  it('down() drops guide_item_config', () => {
    expect(content).toContain("dropTable('guide_item_config')");
  });
});
