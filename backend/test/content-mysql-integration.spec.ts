import 'reflect-metadata';
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { buildMysqlTestDataSourceOptions } from './helpers/mysql-test-env';
import { deleteContentItemsWithVersions } from './helpers/content-test-cleanup';
import { ensureDedicatedTestDatabaseReady } from './helpers/ensure-test-db-ready';
import { CategoriesService } from '../src/content/categories.service';
import { ItemsService } from '../src/content/items.service';
import { ContentCategory } from '../src/database/entities/content-category.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';

const RUN_MYSQL_CONTENT_INTEGRATION = process.env.RUN_MYSQL_CONTENT_INTEGRATION === 'true';
const describeMysqlContent = RUN_MYSQL_CONTENT_INTEGRATION ? describe : describe.skip;

const TEST_USER_ID = '00000000-0000-0000-0000-00000000c0de';

if (!RUN_MYSQL_CONTENT_INTEGRATION) {
  // eslint-disable-next-line no-console
  console.warn(
    'Content MySQL integration tests skipped. Enable RUN_MYSQL_CONTENT_INTEGRATION with the dedicated MYSQL_TEST_* settings.',
  );
}

describeMysqlContent('MySQL integration — ContentModule phase 1', () => {
  let dataSource: DataSource;
  let categoriesService: CategoriesService;
  let itemsService: ItemsService;

  const createdCategoryIds: string[] = [];
  const createdItemIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource(buildMysqlTestDataSourceOptions({ migrationsRun: true }));
    await dataSource.initialize();
    await ensureDedicatedTestDatabaseReady(dataSource);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        ItemsService,
        {
          provide: getRepositoryToken(ContentCategory),
          useValue: dataSource.getRepository(ContentCategory),
        },
        {
          provide: getRepositoryToken(ContentItem),
          useValue: dataSource.getRepository(ContentItem),
        },
        {
          provide: getRepositoryToken(ContentVersion),
          useValue: dataSource.getRepository(ContentVersion),
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    categoriesService = module.get<CategoriesService>(CategoriesService);
    itemsService = module.get<ItemsService>(ItemsService);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await deleteContentItemsWithVersions(dataSource, createdItemIds);
    if (createdCategoryIds.length > 0) {
      await dataSource.manager.delete(ContentCategory, createdCategoryIds);
    }

    await dataSource.destroy();
  });

  it('创建内容后 current_version_id 为 null，并生成 versionNo=1', async () => {
    const suffix = Date.now();
    const category = await categoriesService.create({
      categoryName: `集成测试分类_${suffix}`,
      contentType: 'policy_file',
    });
    createdCategoryIds.push(category.id);

    const item = await itemsService.create(
      {
        contentType: 'policy_file',
        title: `集成测试内容_${suffix}`,
        categoryId: category.id,
        body: '正文 A',
      },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    expect(item.currentVersionId).toBeNull();

    const row = await dataSource.manager.findOne(ContentItem, { where: { id: item.id } });
    expect(row?.currentVersionId).toBeNull();

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].versionNo).toBe(1);
    expect(versions[0].body).toBe('正文 A');
  });

  it('编辑内容追加新版本，current_version_id 保持 null', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `追加版本_${suffix}`, body: 'v1 body' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    const updated = await itemsService.update(
      item.id,
      { title: `追加版本_${suffix}_v2`, body: 'v2 body' },
      TEST_USER_ID,
    );
    expect(updated.currentVersionId).toBeNull();

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].versionNo).toBe(1);
    expect(versions[0].body).toBe('v1 body');
    expect(versions[1].versionNo).toBe(2);
    expect(versions[1].body).toBe('v2 body');
    expect(versions[1].title).toBe(`追加版本_${suffix}_v2`);
  });

  it('内容与分类 contentType 不一致时返回 400', async () => {
    const suffix = Date.now();
    const category = await categoriesService.create({
      categoryName: `解读分类_${suffix}`,
      contentType: 'policy_interpretation',
    });
    createdCategoryIds.push(category.id);

    await expect(
      itemsService.create(
        {
          contentType: 'policy_file',
          title: '类型冲突',
          categoryId: category.id,
        },
        TEST_USER_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('父子分类 contentType 不一致时返回 400', async () => {
    const suffix = Date.now();
    const parent = await categoriesService.create({
      categoryName: `父分类_${suffix}`,
      contentType: 'policy_file',
    });
    createdCategoryIds.push(parent.id);

    await expect(
      categoriesService.create({
        parentId: parent.id,
        categoryName: `子分类_${suffix}`,
        contentType: 'policy_interpretation',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('content_version(content_id, version_no) 唯一约束生效', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `唯一约束_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
    });
    expect(versions).toHaveLength(1);

    const duplicate = dataSource.manager.create(ContentVersion, {
      contentId: item.id,
      versionNo: versions[0].versionNo,
      title: '重复版本号',
      status: 'draft',
      createdBy: TEST_USER_ID,
    });
    await expect(dataSource.manager.save(ContentVersion, duplicate)).rejects.toBeInstanceOf(
      QueryFailedError,
    );
  });

  it('软删除内容后 deleted_at 非空', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `软删除_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    await itemsService.remove(item.id);

    const deleted = await dataSource.manager.findOne(ContentItem, {
      where: { id: item.id },
      withDeleted: true,
    });
    expect(deleted?.deletedAt).not.toBeNull();
  });

  it('事务失败时回滚，不残留内容或版本', async () => {
    const suffix = Date.now();
    const title = `回滚测试_${suffix}`;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const item = queryRunner.manager.create(ContentItem, {
        contentType: 'policy_file',
        title,
        status: 'draft',
        sortOrder: 0,
        isTop: 0,
        isRecommend: 0,
        createdBy: TEST_USER_ID,
        updatedBy: TEST_USER_ID,
      });
      await queryRunner.manager.save(ContentItem, item);

      const version = queryRunner.manager.create(ContentVersion, {
        contentId: item.id,
        versionNo: 1,
        title,
        status: 'draft',
        createdBy: TEST_USER_ID,
      });
      await queryRunner.manager.save(ContentVersion, version);

      throw new Error('simulated transaction failure');
    } catch (err) {
      if ((err as Error).message !== 'simulated transaction failure') {
        await queryRunner.rollbackTransaction();
        throw err;
      }
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    const orphanItems = await dataSource.manager.count(ContentItem, { where: { title } });
    expect(orphanItems).toBe(0);
  });

  it('非法 content_type 返回 400 而非 403', async () => {
    await expect(
      itemsService.create({ contentType: 'invalid_type', title: 'x' }, TEST_USER_ID),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      categoriesService.create({ categoryName: '非法', contentType: 'invalid_type' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
