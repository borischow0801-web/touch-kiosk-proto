import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { PublicContentController } from '../src/public-api/controllers/public-content.controller';
import { PublicContentService } from '../src/content/public-content.service';
import { ItemsService } from '../src/content/items.service';
import { PublishService } from '../src/publish/publish.service';
import { ContentPublishService } from '../src/publish/content-publish.service';
import { ContentCategory } from '../src/database/entities/content-category.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { PublishRecord } from '../src/database/entities/publish-record.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { buildMysqlTestDataSourceOptions } from './helpers/mysql-test-env';
import { deleteContentItemsWithVersions } from './helpers/content-test-cleanup';
import { ensureDedicatedTestDatabaseReady } from './helpers/ensure-test-db-ready';

const RUN_MYSQL_PUBLIC_CONTENT_INTEGRATION =
  process.env.RUN_MYSQL_PUBLIC_CONTENT_INTEGRATION === 'true';
const describeMysqlPublicContent = RUN_MYSQL_PUBLIC_CONTENT_INTEGRATION ? describe : describe.skip;

const TEST_USER_ID = '00000000-0000-0000-0000-00000000pub1';
const TEST_JWT_SECRET = 'test-jwt-public-content-mysql';

if (!RUN_MYSQL_PUBLIC_CONTENT_INTEGRATION) {
  // eslint-disable-next-line no-console
  console.warn(
    'Public content MySQL integration tests skipped. Enable RUN_MYSQL_PUBLIC_CONTENT_INTEGRATION with MYSQL_TEST_* settings.',
  );
}

describeMysqlPublicContent('MySQL integration — Public content API lifecycle', () => {
  let dataSource: DataSource;
  let app: INestApplication;
  let itemsService: ItemsService;
  let publishService: PublishService;
  const createdItemIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource(buildMysqlTestDataSourceOptions({ migrationsRun: true }));
    await dataSource.initialize();
    await ensureDedicatedTestDatabaseReady(dataSource);

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } })],
      controllers: [PublicContentController],
      providers: [
        PublicContentService,
        ItemsService,
        PublishService,
        ContentPublishService,
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: getRepositoryToken(ContentCategory), useValue: dataSource.getRepository(ContentCategory) },
        { provide: getRepositoryToken(ContentItem), useValue: dataSource.getRepository(ContentItem) },
        { provide: getRepositoryToken(ContentVersion), useValue: dataSource.getRepository(ContentVersion) },
        { provide: getRepositoryToken(PublishRecord), useValue: dataSource.getRepository(PublishRecord) },
        { provide: getRepositoryToken(SysUser), useValue: dataSource.getRepository(SysUser) },
        { provide: getRepositoryToken(SysRole), useValue: dataSource.getRepository(SysRole) },
        { provide: getRepositoryToken(SysUserRole), useValue: dataSource.getRepository(SysUserRole) },
        { provide: getRepositoryToken(SysPermission), useValue: dataSource.getRepository(SysPermission) },
        { provide: getRepositoryToken(SysRolePermission), useValue: dataSource.getRepository(SysRolePermission) },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    itemsService = module.get(ItemsService);
    publishService = module.get(PublishService);

    const reflector = module.get(Reflector);
    const jwtService = module.get(JwtService);
    const authService = module.get(AuthService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(
      new JwtAuthGuard(jwtService, authService, reflector),
      new PermissionsGuard(reflector, authService),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (!dataSource?.isInitialized) return;
    await deleteContentItemsWithVersions(dataSource, createdItemIds);
    await dataSource.destroy();
  });

  it('草稿不可查 → 发布后可查 → 新草稿期间仍展示旧版 → 新版发布后切换 → 撤回后 404', async () => {
    const suffix = Date.now();
    const titleV1 = `公开链路_v1_${suffix}`;
    const titleV2 = `公开链路_v2_${suffix}`;
    const bodyV1 = `正文_v1_${suffix}`;
    const bodyV2 = `正文_v2_${suffix}`;

    const item = await itemsService.create(
      { contentType: 'policy_file', title: titleV1, body: bodyV1 },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);

    let listRes = await supertest(app.getHttpServer()).get('/api/public/content/policies');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.list).toHaveLength(0);

    let detailRes = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(detailRes.status).toBe(404);

    await publishService.submit('content', item.id, TEST_USER_ID);
    await publishService.approve('content', item.id, TEST_USER_ID);

    listRes = await supertest(app.getHttpServer()).get('/api/public/content/policies');
    expect(listRes.body.data.list.some((row: { id: string }) => row.id === item.id)).toBe(true);

    detailRes = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.title).toBe(titleV1);
    expect(detailRes.body.data.body).toBe(bodyV1);
    expect(detailRes.body.data).not.toHaveProperty('status');
    expect(detailRes.body.data).not.toHaveProperty('currentVersionId');

    await itemsService.update(
      item.id,
      { title: titleV2, body: bodyV2 },
      TEST_USER_ID,
    );

    detailRes = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(detailRes.body.data.title).toBe(titleV1);
    expect(detailRes.body.data.body).toBe(bodyV1);

    await publishService.submit('content', item.id, TEST_USER_ID);
    await publishService.approve('content', item.id, TEST_USER_ID);

    detailRes = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(detailRes.body.data.title).toBe(titleV2);
    expect(detailRes.body.data.body).toBe(bodyV2);

    await publishService.withdraw('content', item.id, TEST_USER_ID);

    detailRes = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(detailRes.status).toBe(404);

    listRes = await supertest(app.getHttpServer()).get('/api/public/content/policies');
    expect(listRes.body.data.list.some((row: { id: string }) => row.id === item.id)).toBe(false);
  });

  it('类型不匹配详情返回 404', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'faq', title: `FAQ_${suffix}`, body: 'faq body' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.directPublish('content', item.id, TEST_USER_ID);

    const res = await supertest(app.getHttpServer()).get(
      `/api/public/content/policies/${item.id}`,
    );
    expect(res.status).toBe(404);
  });

  it('current_version_id 为空或版本非 published 时不返回', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'notice', title: `异常公开_${suffix}`, body: 'n' },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.directPublish('content', item.id, TEST_USER_ID);

    await dataSource.manager.update(ContentItem, item.id, { currentVersionId: null });
    let res = await supertest(app.getHttpServer()).get(`/api/public/content/notices/${item.id}`);
    expect(res.status).toBe(404);

    const versions = await dataSource.manager.find(ContentVersion, {
      where: { contentId: item.id },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    const version = versions[0];
    await dataSource.manager.update(ContentItem, item.id, {
      currentVersionId: version!.id,
      status: 'published',
    });
    await dataSource.manager.update(ContentVersion, version!.id, { status: 'draft' });

    res = await supertest(app.getHttpServer()).get(`/api/public/content/notices/${item.id}`);
    expect(res.status).toBe(404);
  });

  it('软删除内容不返回', async () => {
    const suffix = Date.now();
    const item = await itemsService.create(
      { contentType: 'notice', title: `软删除公开_${suffix}` },
      TEST_USER_ID,
    );
    createdItemIds.push(item.id);
    await publishService.directPublish('content', item.id, TEST_USER_ID);

    await itemsService.remove(item.id);

    const res = await supertest(app.getHttpServer()).get(`/api/public/content/notices/${item.id}`);
    expect(res.status).toBe(404);
  });
});
