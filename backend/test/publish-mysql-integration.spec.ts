import 'reflect-metadata';
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ItemsService } from '../src/content/items.service';
import { PublishService } from '../src/publish/publish.service';
import { ContentPublishService } from '../src/publish/content-publish.service';
import { ContentCategory } from '../src/database/entities/content-category.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { PublishRecord } from '../src/database/entities/publish-record.entity';
import { buildMysqlTestDataSourceOptions } from './helpers/mysql-test-env';
import { deleteContentItemsWithVersions } from './helpers/content-test-cleanup';
import { ensureDedicatedTestDatabaseReady } from './helpers/ensure-test-db-ready';

// 与 content/lifecycle/fresh-install 集成测试共用专用库，必须串行执行（见 test:integration:mysql:serial）。

const RUN_MYSQL_PUBLISH_INTEGRATION = process.env.RUN_MYSQL_PUBLISH_INTEGRATION === 'true';
const describeMysqlPublish = RUN_MYSQL_PUBLISH_INTEGRATION ? describe : describe.skip;

const TEST_USER_ID = '00000000-0000-0000-0000-00000000p0bl';

if (!RUN_MYSQL_PUBLISH_INTEGRATION) {
  // eslint-disable-next-line no-console
  console.warn(
    'Publish MySQL integration tests skipped. Enable RUN_MYSQL_PUBLISH_INTEGRATION with the dedicated MYSQL_TEST_* settings.',
  );
}

describeMysqlPublish('MySQL integration — PublishModule content workflow', () => {
  let dataSource: DataSource;
  let itemsService: ItemsService;
  let publishService: PublishService;

  const createdItemIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource(buildMysqlTestDataSourceOptions({ migrationsRun: true }));
    await dataSource.initialize();
    await ensureDedicatedTestDatabaseReady(dataSource);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        PublishService,
        ContentPublishService,
        { provide: getRepositoryToken(ContentCategory), useValue: dataSource.getRepository(ContentCategory) },
        { provide: getRepositoryToken(ContentItem), useValue: dataSource.getRepository(ContentItem) },
        { provide: getRepositoryToken(ContentVersion), useValue: dataSource.getRepository(ContentVersion) },
        { provide: getRepositoryToken(PublishRecord), useValue: dataSource.getRepository(PublishRecord) },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    itemsService = module.get(ItemsService);
    publishService = module.get(PublishService);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await deleteContentItemsWithVersions(dataSource, createdItemIds);
    await dataSource.destroy();
  });

  it('submit → approve 发布成功并设置 current_version_id', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `发布链路_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    expect(item.currentVersionId).toBeNull();

    await publishService.submit('content', item.id, TEST_USER_ID);
    const approved = await publishService.approve('content', item.id, TEST_USER_ID);

    expect(approved.currentVersionId).not.toBeNull();
    expect(approved.itemStatus).toBe('published');
    expect(approved.publishAt).not.toBeNull();

    const row = await dataSource.manager.findOne(ContentItem, { where: { id: item.id } });
    expect(row?.currentVersionId).toBe(approved.versionId);
    expect(row?.title).toBe(`发布链路_${suffix}`);

    const records = await dataSource.manager.find(PublishRecord, { where: { bizId: item.id } });
    expect(records.length).toBeGreaterThanOrEqual(2);
  });

  it('已发布内容新草稿审核期间主表 title 不变，通过后切换 current_version_id', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `主表保持_${suffix}`, body: 'v1' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    const published = await publishService.directPublish('content', item.id, TEST_USER_ID);
    const publishedTitle = published.itemStatus === 'published' ? `主表保持_${suffix}` : item.title;

    await itemsService.update(item.id, { title: `新草稿_${suffix}`, body: 'v2 draft' }, TEST_USER_ID);

    const mid = await dataSource.manager.findOne(ContentItem, { where: { id: item.id } });
    expect(mid?.title).toBe(publishedTitle);
    expect(mid?.currentVersionId).toBe(published.versionId);

    await publishService.submit('content', item.id, TEST_USER_ID);
    const approved = await publishService.approve('content', item.id, TEST_USER_ID);

    const after = await dataSource.manager.findOne(ContentItem, { where: { id: item.id } });
    expect(after?.title).toBe(`新草稿_${suffix}`);
    expect(after?.currentVersionId).toBe(approved.versionId);
    expect(after?.currentVersionId).not.toBe(published.versionId);

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].status).toBe('published');
    expect(versions[1].status).toBe('published');
  });

  it('withdraw 后 item 状态为 withdrawn', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `撤回_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.directPublish('content', item.id, TEST_USER_ID);
    const withdrawn = await publishService.withdraw('content', item.id, TEST_USER_ID);
    expect(withdrawn.itemStatus).toBe('withdrawn');
  });

  it('rollback 生成新 draft 版本且不改变 current_version_id', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `回滚_${suffix}`, body: 'original' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    const published = await publishService.directPublish('content', item.id, TEST_USER_ID);

    const rolled = await publishService.rollback(
      'content',
      item.id,
      TEST_USER_ID,
      published.versionId,
      '回滚测试',
    );

    expect(rolled.versionStatus).toBe('draft');
    expect(rolled.currentVersionId).toBe(published.versionId);

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].body).toBe('original');
    expect(versions[1].body).toBe('original');
    expect(versions[0].status).toBe('published');
    expect(versions[1].status).toBe('draft');
  });

  it('非法状态操作返回 409', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `非法_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    await expect(publishService.approve('content', item.id, TEST_USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('重复 submit 返回 409', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `重复提交_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    await publishService.submit('content', item.id, TEST_USER_ID);
    await expect(publishService.submit('content', item.id, TEST_USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('提交旧 draft 返回 409', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `旧草稿_${suffix}`, body: 'v1' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    const versionsBefore = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    const oldVersionId = versionsBefore[0].id;

    await itemsService.update(item.id, { title: `新草稿_${suffix}`, body: 'v2' }, TEST_USER_ID);

    await expect(
      publishService.submit('content', item.id, TEST_USER_ID, oldVersionId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('pending 期间禁止 submit 新草稿与 direct-publish', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `pending阻塞_${suffix}`, body: 'v1' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.submit('content', item.id, TEST_USER_ID);

    await itemsService.update(item.id, { title: `新草稿_${suffix}`, body: 'v2' }, TEST_USER_ID);

    await expect(publishService.submit('content', item.id, TEST_USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      publishService.directPublish('content', item.id, TEST_USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  async function seedMultiPendingAnomaly(itemId: string, suffix: number): Promise<{
    pendingIds: string[];
    draftId: string;
  }> {
    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: itemId },
      order: { versionNo: 'ASC' },
    });
    const base = versions[0];
    await dataSource.query(`UPDATE content_version SET status = 'pending' WHERE id = ?`, [base.id]);
    const secondPendingId = uuidv4();
    await dataSource.query(
      `INSERT INTO content_version (id, content_id, version_no, title, status, created_at)
       VALUES (?, ?, 2, ?, 'pending', CURRENT_TIMESTAMP)`,
      [secondPendingId, itemId, `异常pending_${suffix}`],
    );
    return { pendingIds: [base.id, secondPendingId], draftId: base.id };
  }

  async function snapshotReviewState(itemId: string) {
    const item = await dataSource.manager.findOne(ContentItem, { where: { id: itemId } });
    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: itemId },
      order: { versionNo: 'ASC' },
    });
    const records = await dataSource.manager.find(PublishRecord, { where: { bizId: itemId } });
    return {
      item: item ? { status: item.status, currentVersionId: item.currentVersionId, title: item.title } : null,
      versions: versions.map((v) => ({ id: v.id, status: v.status, versionNo: v.versionNo })),
      recordCount: records.length,
    };
  }

  it('多 pending 异常数据未传 versionId 时 approve 返回 409 且状态不变', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `多pending_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await seedMultiPendingAnomaly(item.id, suffix);
    const before = await snapshotReviewState(item.id);

    await expect(publishService.approve('content', item.id, TEST_USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(await snapshotReviewState(item.id)).toEqual(before);
  });

  it('多 pending + 显式 versionId 时 approve 返回 409 且状态不变', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `多pending显式_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    const { pendingIds } = await seedMultiPendingAnomaly(item.id, suffix);
    const before = await snapshotReviewState(item.id);

    await expect(
      publishService.approve('content', item.id, TEST_USER_ID, pendingIds[0]),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await snapshotReviewState(item.id)).toEqual(before);
  });

  it('多 pending + 显式 versionId 时 reject 返回 409 且状态不变', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `多pending驳回_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    const { pendingIds } = await seedMultiPendingAnomaly(item.id, suffix);
    const before = await snapshotReviewState(item.id);

    await expect(
      publishService.reject('content', item.id, TEST_USER_ID, pendingIds[1]),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await snapshotReviewState(item.id)).toEqual(before);
  });

  it('单 pending + 正确显式 versionId 可正常 approve', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `单pending显式_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.submit('content', item.id, TEST_USER_ID);

    const pending = await dataSource.manager.findOne(ContentVersion, {
      where: { contentId: item.id, status: 'pending' },
    });
    expect(pending).not.toBeNull();

    const approved = await publishService.approve(
      'content',
      item.id,
      TEST_USER_ID,
      pending!.id,
    );

    expect(approved.itemStatus).toBe('published');
    expect(approved.versionId).toBe(pending!.id);
  });

  it('单 pending + 非待审 versionId 时 approve 返回 409 且状态不变', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `非待审_${suffix}`, body: 'v1' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.directPublish('content', item.id, TEST_USER_ID);
    await itemsService.update(item.id, { title: `新草稿_${suffix}`, body: 'v2' }, TEST_USER_ID);
    await publishService.submit('content', item.id, TEST_USER_ID);

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'ASC' },
    });
    const publishedVersionId = versions[0].id;
    const before = await snapshotReviewState(item.id);

    await expect(
      publishService.approve('content', item.id, TEST_USER_ID, publishedVersionId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await snapshotReviewState(item.id)).toEqual(before);
  });

  it('两个并发 submit 最多一个成功', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `并发提交_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    const results = await Promise.allSettled([
      publishService.submit('content', item.id, TEST_USER_ID),
      publishService.submit('content', item.id, TEST_USER_ID),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    const pendingCount = await dataSource.manager.count(ContentVersion, {
      where: { contentId: item.id, status: 'pending' },
    });
    expect(pendingCount).toBe(1);
  });

  it('并发 submit 与 direct-publish 最多一个成功', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `并发提交发布_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    const results = await Promise.allSettled([
      publishService.submit('content', item.id, TEST_USER_ID),
      publishService.directPublish('content', item.id, TEST_USER_ID),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    const records = await dataSource.manager.count(PublishRecord, {
      where: { bizId: item.id },
    });
    expect(records).toBe(1);
  });

  it('publish_record 写入失败时不残留 pending 状态', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `记录回滚_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    const originalTransaction = dataSource.transaction.bind(dataSource);
    const transactionSpy = jest.spyOn(dataSource, 'transaction');
    transactionSpy.mockImplementation(
      ((runInTransaction: (manager: EntityManager) => Promise<unknown>) =>
        originalTransaction(async (manager) => {
          const originalSave = manager.save.bind(manager);
          const saveSpy = jest.spyOn(manager, 'save').mockImplementation(
            async (targetOrEntity: unknown, entity?: unknown, options?: unknown) => {
              if (targetOrEntity === PublishRecord) {
                throw new Error('forced publish_record failure');
              }
              if (entity !== undefined) {
                return originalSave(targetOrEntity as never, entity as never, options as never);
              }
              return originalSave(targetOrEntity as never);
            },
          );
          try {
            return await runInTransaction(manager);
          } finally {
            saveSpy.mockRestore();
          }
        })) as typeof dataSource.transaction,
    );

    try {
      await expect(
        publishService.submit('content', item.id, TEST_USER_ID),
      ).rejects.toThrow('forced publish_record failure');

      const version = await dataSource.manager.findOne(ContentVersion, {
        where: { contentId: item.id },
      });
      expect(version?.status).toBe('draft');

      const row = await dataSource.manager.findOne(ContentItem, { where: { id: item.id } });
      expect(row?.status).toBe('draft');

      const recordCount = await dataSource.manager.count(PublishRecord, {
        where: { bizId: item.id },
      });
      expect(recordCount).toBe(0);
    } finally {
      transactionSpy.mockRestore();
    }
  });

  it('两个并发 approve 最多一个成功', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'policy_file', title: `并发_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.submit('content', item.id, TEST_USER_ID);

    const results = await Promise.allSettled([
      publishService.approve('content', item.id, TEST_USER_ID),
      publishService.approve('content', item.id, TEST_USER_ID),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const records = await dataSource.manager.count(PublishRecord, {
      where: { bizId: item.id, action: 'approve' },
    });
    expect(records).toBe(1);
  });
});
