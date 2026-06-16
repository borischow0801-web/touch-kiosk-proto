import * as fs from 'fs';
import * as path from 'path';

describe('Migration 1749925200000-CreateHomeConfigTables — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749925200000-CreateHomeConfigTables.ts',
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

  it('does not use triggers or stored procedures', () => {
    expect(content).not.toMatch(/trigger/i);
    expect(content).not.toMatch(/stored\s+procedure/i);
  });

  it('uses TypeORM Table API (createTable)', () => {
    expect(content).toContain('createTable');
  });

  it('creates exactly 3 home config tables', () => {
    expect(content).toContain("name: 'home_config'");
    expect(content).toContain("name: 'home_config_version'");
    expect(content).toContain("name: 'home_module'");
    const createTableCount = (content.match(/createTable\s*\(/g) ?? []).length;
    expect(createTableCount).toBe(3);
  });

  it('uses varchar(36) primary key without auto increment', () => {
    expect(content).toMatch(/name:\s*'id'[\s\S]*?type:\s*'varchar'[\s\S]*?length:\s*'36'[\s\S]*?isPrimary:\s*true/);
  });

  it('stores top_banner_json and theme_json as text', () => {
    expect(content).toMatch(/name:\s*'top_banner_json'[\s\S]*?type:\s*'text'/);
    expect(content).toMatch(/name:\s*'theme_json'[\s\S]*?type:\s*'text'/);
  });

  it('home_module uses home_config_version_id not home_config_id', () => {
    const moduleBlock = content.slice(content.indexOf("name: 'home_module'"));
    expect(moduleBlock).toContain("name: 'home_config_version_id'");
    expect(moduleBlock).not.toContain("name: 'home_config_id'");
    expect(content).toContain('fk_home_module_home_config_version_id');
  });

  it('uses smallint for is_visible', () => {
    expect(content).toMatch(/name:\s*'is_visible'[\s\S]*?type:\s*'smallint'/);
    expect(content).not.toMatch(/type:\s*'tinyint'/);
  });

  it('config_name uses non-unique index only (no partial unique singleton constraint)', () => {
    expect(content).toMatch(
      /new TableIndex\(\{ name: 'idx_home_config_config_name', columnNames: \['config_name'\] \}\)/,
    );
    expect(content).not.toContain('uk_home_config_config_name');
  });

  it('enforces (home_config_id, version_no) unique on home_config_version', () => {
    expect(content).toContain('uk_home_config_version_config_version_no');
    expect(content).toMatch(
      /name:\s*'uk_home_config_version_config_version_no'[\s\S]*?columnNames:\s*\['home_config_id',\s*'version_no'\][\s\S]*?isUnique:\s*true/,
    );
  });

  it('includes deleted_at on home_config and home_module', () => {
    const deletedAtCount = (content.match(/name:\s*'deleted_at'/g) ?? []).length;
    expect(deletedAtCount).toBe(2);
  });

  it('adds fk_home_config_current_version_id', () => {
    expect(content).toContain('fk_home_config_current_version_id');
  });

  it('down() drops tables in dependency order', () => {
    expect(content).toContain("dropTable('home_module')");
    expect(content).toContain("dropTable('home_config_version')");
    expect(content).toContain("dropTable('home_config')");
  });
});
