import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { PublicContentController } from '../src/public-api/controllers/public-content.controller';
import { PublicContentService } from '../src/content/public-content.service';
import { ContentItemsController } from '../src/admin-api/controllers/content-items.controller';
import { ItemsService } from '../src/content/items.service';
import { RelationsService } from '../src/content/relations.service';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  PUBLIC_CONTENT_ROUTES,
  getPublicContentRoute,
} from '../src/content/constants/public-content-routes';

const TEST_JWT_SECRET = 'test-jwt-secret-for-public-content-spec';
const ITEM_ID = 'item-public-001';

const PUBLIC_LIST_ITEM = {
  id: ITEM_ID,
  contentType: 'policy_file',
  title: '公开政策',
  subtitle: null,
  summary: '摘要',
  categoryId: null,
  coverFileId: null,
  publishAt: new Date('2024-06-01'),
  sourceType: null,
  sourceUrl: null,
};

const PUBLIC_DETAIL = {
  ...PUBLIC_LIST_ITEM,
  body: '正文来自 current_version',
};

function createQueryBuilderMock(rows: unknown[], total?: number, rawOne?: unknown) {
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(total ?? rows.length),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue(rawOne ?? null),
  };
  return qb;
}

describe('Public content routes mapping', () => {
  it.each(PUBLIC_CONTENT_ROUTES)(
    '$pathSegment → contentType=$contentType supportsDetail=$supportsDetail',
    ({ pathSegment, contentType, supportsDetail }) => {
      const route = getPublicContentRoute(pathSegment);
      expect(route).toBeDefined();
      expect(route?.contentType).toBe(contentType);
      expect(route?.supportsDetail).toBe(supportsDetail);
    },
  );
});

describe('PublicContentService — unit', () => {
  let service: PublicContentService;
  let mockQb: ReturnType<typeof createQueryBuilderMock>;
  const mockItemRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockQb = createQueryBuilderMock([PUBLIC_LIST_ITEM], 1);
    mockItemRepo.createQueryBuilder.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicContentService,
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();
    service = module.get(PublicContentService);
  });

  it('列表只查询 published 且关联 published 版本', async () => {
    await service.list('policy_file', { page: 1, pageSize: 20 });

    expect(mockQb.innerJoin).toHaveBeenCalledWith(
      ContentVersion,
      'version',
      'version.id = item.current_version_id AND version.status = :versionStatus',
      { versionStatus: 'published' },
    );
    expect(mockQb.andWhere).toHaveBeenCalledWith('item.status = :itemStatus', {
      itemStatus: 'published',
    });
    expect(mockQb.andWhere).toHaveBeenCalledWith('item.current_version_id IS NOT NULL');
  });

  it('详情不存在返回 404', async () => {
    mockQb.getRawOne.mockResolvedValueOnce(null);
    await expect(service.getById('policy_file', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('详情正文来自 current_version_id 关联版本', async () => {
    mockQb.getRawOne.mockResolvedValueOnce(PUBLIC_DETAIL);
    const detail = await service.getById('policy_file', ITEM_ID);
    expect(detail.body).toBe('正文来自 current_version');
    expect(mockQb.select).toHaveBeenCalledWith(
      expect.arrayContaining(['version.body AS body']),
    );
  });

  it('列表排序稳定', async () => {
    await service.list('policy_file', { page: 1, pageSize: 10 });
    expect(mockQb.orderBy).toHaveBeenCalledWith('item.is_top', 'DESC');
    expect(mockQb.addOrderBy).toHaveBeenCalledWith('item.sort_order', 'ASC');
    expect(mockQb.addOrderBy).toHaveBeenCalledWith('item.publish_at', 'DESC');
    expect(mockQb.addOrderBy).toHaveBeenCalledWith('item.id', 'ASC');
  });

  it('类型不匹配时详情 404', async () => {
    mockQb.getRawOne.mockResolvedValueOnce(null);
    await expect(service.getById('faq', ITEM_ID)).rejects.toThrow('内容不存在');
    expect(mockQb.where).toHaveBeenCalledWith('item.content_type = :contentType', {
      contentType: 'faq',
    });
  });
});

describe('PublicContentController — HTTP', () => {
  let app: INestApplication;
  const mockPublicContentService = {
    list: jest.fn(),
    getById: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } })],
      controllers: [PublicContentController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: PublicContentService, useValue: mockPublicContentService },
        { provide: getRepositoryToken(SysUser), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(SysRole), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysUserRole), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysPermission), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysRolePermission), useValue: { find: jest.fn() } },
      ],
    }).compile();

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
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('未登录可访问 policies 列表', async () => {
    mockPublicContentService.list.mockResolvedValueOnce({
      list: [PUBLIC_LIST_ITEM],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const res = await supertest(app.getHttpServer()).get('/api/public/content/policies');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(mockPublicContentService.list).toHaveBeenCalledWith(
      'policy_file',
      expect.objectContaining({ page: 1, pageSize: 20 }),
    );
  });

  it('Public DTO 不包含后台字段', async () => {
    mockPublicContentService.getById.mockResolvedValueOnce(PUBLIC_DETAIL);
    const res = await supertest(app.getHttpServer()).get(`/api/public/content/policies/${ITEM_ID}`);
    const data = res.body.data;
    const forbidden = [
      'currentVersionId',
      'versionNo',
      'status',
      'createdBy',
      'updatedBy',
      'deletedAt',
      'changeRemark',
      'extraJson',
      'isTop',
      'isRecommend',
      'sortOrder',
    ];
    for (const key of forbidden) {
      expect(data).not.toHaveProperty(key);
    }
    expect(data).toHaveProperty('body', '正文来自 current_version');
  });

  it('interpretations 路由映射 policy_interpretation', async () => {
    mockPublicContentService.list.mockResolvedValueOnce({ list: [], total: 0, page: 1, pageSize: 20 });
    await supertest(app.getHttpServer()).get('/api/public/content/interpretations');
    expect(mockPublicContentService.list).toHaveBeenCalledWith('policy_interpretation', expect.any(Object));
  });

  it('open-guide 路由映射 open_guide', async () => {
    mockPublicContentService.list.mockResolvedValueOnce({ list: [], total: 0, page: 1, pageSize: 20 });
    await supertest(app.getHttpServer()).get('/api/public/content/open-guide');
    expect(mockPublicContentService.list).toHaveBeenCalledWith('open_guide', expect.any(Object));
  });

  it('详情不存在返回 404', async () => {
    mockPublicContentService.getById.mockRejectedValueOnce(new NotFoundException('内容不存在'));
    const res = await supertest(app.getHttpServer()).get('/api/public/content/policies/missing');
    expect(res.status).toBe(404);
  });
});

describe('Admin content API — auth unaffected', () => {
  let app: INestApplication;
  const mockItemsService = { list: jest.fn() };
  const mockRelationsService = { listBySource: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } })],
      controllers: [ContentItemsController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: ItemsService, useValue: mockItemsService },
        { provide: RelationsService, useValue: mockRelationsService },
        { provide: getRepositoryToken(SysUser), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(SysRole), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysUserRole), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysPermission), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(SysRolePermission), useValue: { find: jest.fn() } },
      ],
    }).compile();

    const reflector = module.get(Reflector);
    const jwtService = module.get(JwtService);
    const authService = module.get(AuthService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(
      new JwtAuthGuard(jwtService, authService, reflector),
      new PermissionsGuard(reflector, authService),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('管理端内容列表未登录返回 401', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/admin/content/items');
    expect(res.status).toBe(401);
    expect(mockItemsService.list).not.toHaveBeenCalled();
  });
});
