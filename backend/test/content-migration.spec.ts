import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749859200000-CreateContentTables — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749859200000-CreateContentTables.ts',
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

  it('does not contain standalone KEY (MySQL index shorthand)', () => {
    expect(content).not.toMatch(/\bKEY\s+[a-zA-Z_`"]/);
  });

  it('does not use CREATE TABLE IF NOT EXISTS', () => {
    expect(content).not.toMatch(/IF\s+NOT\s+EXISTS/i);
  });

  it('does not use ENUM column type', () => {
    expect(content).not.toMatch(/type:\s*['"]enum['"]/i);
    expect(content).not.toMatch(/\bENUM\s*\(/i);
  });

  it('does not use JSON column type', () => {
    expect(content).not.toMatch(/type:\s*['"]json['"]/i);
  });

  it('does not use auto increment', () => {
    expect(content).not.toMatch(/AUTO_INCREMENT/i);
    expect(content).not.toMatch(/isGenerated:\s*true/i);
    expect(content).not.toMatch(/generationStrategy/i);
  });

  it('uses TypeORM Table API (createTable)', () => {
    expect(content).toContain('createTable');
  });

  it('uses TableIndex', () => {
    expect(content).toContain('TableIndex');
  });

  it('uses TableForeignKey', () => {
    expect(content).toContain('TableForeignKey');
  });

  it('creates exactly 4 content tables', () => {
    expect(content).toContain("name: 'content_category'");
    expect(content).toContain("name: 'content_item'");
    expect(content).toContain("name: 'content_version'");
    expect(content).toContain("name: 'content_relation'");
    const createTableCount = (content.match(/createTable\s*\(/g) ?? []).length;
    expect(createTableCount).toBe(4);
  });

  it('uses NO ACTION for onDelete (no cascade physical delete)', () => {
    expect(content).toContain('NO ACTION');
  });

  it('stores extra_json as text not JSON type', () => {
    expect(content).toMatch(/name:\s*'extra_json'[\s\S]*?type:\s*'text'/);
  });

  it('uses smallint for is_top and is_recommend (HighGo compatible)', () => {
    expect(content).toMatch(/name:\s*'is_top'[\s\S]*?type:\s*'smallint'/);
    expect(content).toMatch(/name:\s*'is_recommend'[\s\S]*?type:\s*'smallint'/);
    expect(content).not.toMatch(/type:\s*'tinyint'/);
  });

  it('does not create Alter-owned unique index uk_content_version_content_version_no', () => {
    expect(content).not.toContain('uk_content_version_content_version_no');
  });

  it('does not create Alter-owned FK fk_content_item_current_version_id', () => {
    expect(content).not.toContain('fk_content_item_current_version_id');
  });
});

describe('Migration 1749873600000-AlterContentTablesIntegrity — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749873600000-AlterContentTablesIntegrity.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('does not use raw queryRunner.query', () => {
    expect(content).not.toContain('queryRunner.query(');
  });

  it('normalizes is_top and is_recommend to smallint in up()', () => {
    const upBlock = content.slice(content.indexOf('async up('), content.indexOf('async down('));
    expect(upBlock).toMatch(/name:\s*'is_top'[\s\S]*?type:\s*'smallint'/);
    expect(upBlock).toMatch(/name:\s*'is_recommend'[\s\S]*?type:\s*'smallint'/);
  });

  it('creates uk_content_version_content_version_no when missing', () => {
    expect(content).toContain('uk_content_version_content_version_no');
  });

  it('creates fk_content_item_current_version_id when missing', () => {
    expect(content).toContain('fk_content_item_current_version_id');
  });

  it('clears draft current_version_id in up()', () => {
    expect(content).toContain('currentVersionId: null');
  });

  it('down() does not revert columns to tinyint', () => {
    const downBlock = content.slice(content.indexOf('async down('));
    expect(downBlock).not.toMatch(/type:\s*['"]tinyint['"]/);
    expect(downBlock).not.toContain('changeColumn');
  });

  it('down() checks existence before dropping index and FK', () => {
    const downBlock = content.slice(content.indexOf('async down('));
    expect(downBlock).toContain('if (versionFk)');
    expect(downBlock).toContain('if (versionUnique)');
  });
});

describe('Migration 1749859200000-CreateContentTables — foreign keys', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749859200000-CreateContentTables.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('contains fk_content_category_parent_id', () => {
    expect(content).toContain('fk_content_category_parent_id');
  });

  it('contains fk_content_item_category_id', () => {
    expect(content).toContain('fk_content_item_category_id');
  });

  it('contains fk_content_version_content_id', () => {
    expect(content).toContain('fk_content_version_content_id');
  });

  it('contains fk_content_relation_source_id and fk_content_relation_target_id', () => {
    expect(content).toContain('fk_content_relation_source_id');
    expect(content).toContain('fk_content_relation_target_id');
  });

  it('down() drops all 4 tables in dependency order', () => {
    expect(content).toContain("dropTable('content_relation')");
    expect(content).toContain("dropTable('content_version')");
    expect(content).toContain("dropTable('content_item')");
    expect(content).toContain("dropTable('content_category')");
  });
});
