import 'reflect-metadata';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import supertest = require('supertest');
import { GuideCacheService } from '../src/service-guide/cache/guide-cache.service';
import { GuideApiCache } from '../src/database/entities/guide-api-cache.entity';
import { PublicGuideConfigService } from '../src/service-guide/public-guide-config.service';
import { GuideDeptMapping } from '../src/database/entities/guide-dept-mapping.entity';
import { GuideThemeMapping } from '../src/database/entities/guide-theme-mapping.entity';
import { GuideItemConfig } from '../src/database/entities/guide-item-config.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { ServiceGuideService } from '../src/service-guide/service-guide.service';
import { ServiceGuideProviderFactory } from '../src/service-guide/providers/service-guide-provider.factory';
import { DevelopmentMockServiceGuideProvider } from '../src/service-guide/providers/development-mock.service-guide.provider';
import { GuideRelatedContentService } from '../src/service-guide/guide-related-content.service';
import { ServiceGuideController } from '../src/public-api/controllers/service-guide.controller';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SERVICE_GUIDE_API_NAMES } from '../src/service-guide/constants/service-guide.constants';
import { buildCacheKey } from '../src/service-guide/cache/guide-cache-key.util';
import type { ServiceGuideProvider } from '../src/service-guide/providers/service-guide-provider.interface';
import { GuideDeptsController } from '../src/admin-api/controllers/guide-depts.controller';
import { QueryFailedError } from 'typeorm';
import { normalizeGuideCode } from '../src/guide-config/utils/normalize-guide-code.util';
import type { PublicItem } from '../src/service-guide/types/public-service-guide.types';

const VALID_ITEM_DETAIL_CACHE_BODY = JSON.stringify({
  basicInfo: { itemId: 'i-001', name: '社保查询（示例）', deptName: '人社局', themeNames: ['社会保障'] },
  acceptConditions: [],
  materials: [],
  processSteps: [],
  locations: [],
  workTime: '',
  timeLimit: '',
  fee: '',
  legalBasis: [],
  consultationPhone: '',
  complaintPhone: '',
});

const DEPT_ROW: GuideDeptMapping = {
  id: 'dept-001',
  deptName: '人社局',
  deptCode: 'D-001',
  displayName: '人社局',
  icon: null,
  floorText: null,
  areaText: null,
  isVisible: 1,
  sortOrder: 0,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as GuideDeptMapping;

const THEME_ROW: GuideThemeMapping = {
  id: 'theme-001',
  themeName: '社会保障',
  themeCode: 'T-001',
  platformParamJson: '{"mock":"t-001"}',
  icon: null,
  isVisible: 1,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as GuideThemeMapping;

function makeProviderFactory(provider: ServiceGuideProvider): ServiceGuideProviderFactory {
  const factory = {
    getProvider: () => provider,
    getConfig: () => ({ providerType: 'development', upstreamTimeoutMs: 50, upstreamBaseUrl: undefined }),
    isDevelopmentMock: () => provider.isDevelopmentMock,
    onModuleInit: () => undefined,
  } as unknown as ServiceGuideProviderFactory;
  return factory;
}

describe('GuideCacheService — last-valid cache', () => {
  let service: GuideCacheService;
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        GuideCacheService,
        { provide: getRepositoryToken(GuideApiCache), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(GuideCacheService);
  });

  it('returns latest upstream data when cache write fails', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockRejectedValue(new Error('db write failed'));
    const data = await service.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
      params: { itemId: 'i-001' },
      requestId: 'req-write-fail',
      timeoutMs: 1000,
      ttlMs: 3600000,
      fetcher: async () => ({ fresh: true }),
    });
    expect(data).toEqual({ fresh: true });
  });

  it('writes cache on upstream success', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const data = await service.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
      params: { itemId: 'i-001' },
      requestId: 'req-1',
      timeoutMs: 1000,
      ttlMs: 3600000,
      fetcher: async () => ({ ok: true }),
    });
    expect(data).toEqual({ ok: true });
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ responseBody: '{"ok":true}' }),
    );
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('returns fallback cache when upstream fails', async () => {
    const cacheKey = buildCacheKey(SERVICE_GUIDE_API_NAMES.ITEM_DETAIL, { itemId: 'i-001' });
    mockRepo.findOne.mockResolvedValue({
      cacheKey,
      responseBody: VALID_ITEM_DETAIL_CACHE_BODY,
      expireAt: new Date(0),
    });
    const data = await service.executeWithCache<{ basicInfo: { itemId: string } }>({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
      params: { itemId: 'i-001' },
      requestId: 'req-2',
      timeoutMs: 1000,
      ttlMs: 3600000,
      fetcher: async () => {
        throw new Error('upstream down');
      },
    });
    expect(data.basicInfo.itemId).toBe('i-001');
  });

  it('throws 503 when upstream fails and no cache exists', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(
      service.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
        params: { itemId: 'missing' },
        requestId: 'req-3',
        timeoutMs: 1000,
        ttlMs: 3600000,
        fetcher: async () => {
          throw new Error('upstream down');
        },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not return JSON with invalid API shape', async () => {
    mockRepo.findOne.mockResolvedValue({
      cacheKey: 'item_detail:abc',
      responseBody: '{"cached":true}',
    });
    await expect(
      service.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
        params: { itemId: 'i-001' },
        requestId: 'req-shape',
        timeoutMs: 1000,
        ttlMs: 3600000,
        fetcher: async () => {
          throw new Error('upstream down');
        },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns 503 when cache read throws database error', async () => {
    mockRepo.findOne.mockRejectedValue(new Error('connection lost'));
    await expect(
      service.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
        params: { itemId: 'i-001' },
        requestId: 'req-db-read',
        timeoutMs: 1000,
        ttlMs: 3600000,
        fetcher: async () => {
          throw new Error('upstream down');
        },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('retries update on unique cache_key race', async () => {
    mockRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ cacheKey: 'race-key', responseBody: '{}', apiName: 'item_detail' });
    const uniqueError = new QueryFailedError('INSERT', [], { code: '23505' } as never);
    mockRepo.save.mockRejectedValueOnce(uniqueError).mockResolvedValueOnce({});
    mockRepo.create.mockImplementation((row) => row);
    const data = await service.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.DEPT_ITEM_TYPES,
      params: { deptCode: 'D-001' },
      requestId: 'req-race',
      timeoutMs: 1000,
      ttlMs: 3600000,
      fetcher: async () => [{ code: 'apply', name: '申请办理' }],
    });
    expect(data).toEqual([{ code: 'apply', name: '申请办理' }]);
    expect(mockRepo.save).toHaveBeenCalledTimes(2);
  });

  it('does not return corrupt cache JSON', async () => {
    mockRepo.findOne.mockResolvedValue({
      cacheKey: 'x',
      responseBody: '{bad json',
    });
    await expect(
      service.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
        params: { itemId: 'i-001' },
        requestId: 'req-4',
        timeoutMs: 1000,
        ttlMs: 3600000,
        fetcher: async () => {
          throw new Error('upstream down');
        },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rethrows NotFoundException without cache fallback', async () => {
    mockRepo.findOne.mockResolvedValue({
      cacheKey: 'x',
      responseBody: VALID_ITEM_DETAIL_CACHE_BODY,
    });
    await expect(
      service.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
        params: { itemId: 'i-999' },
        requestId: 'req-5',
        timeoutMs: 1000,
        ttlMs: 3600000,
        fetcher: async () => {
          throw new NotFoundException('not found');
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('times out slow upstream and falls back to cache', async () => {
    mockRepo.findOne.mockResolvedValue({
      cacheKey: buildCacheKey(SERVICE_GUIDE_API_NAMES.ITEM_LIST, {}),
      responseBody: '{"list":[],"total":0}',
    });
    const data = await service.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_LIST,
      params: {},
      requestId: 'req-6',
      timeoutMs: 20,
      ttlMs: 3600000,
      fetcher: () => new Promise((resolve) => setTimeout(() => resolve({ list: [], total: 0 }), 200)),
    });
    expect(data).toEqual({ list: [], total: 0 });
  });
});

describe('PublicGuideConfigService — visibility and encoding', () => {
  let service: PublicGuideConfigService;
  const deptRepo = { find: jest.fn(), findOne: jest.fn() };
  const themeRepo = { find: jest.fn(), findOne: jest.fn() };
  const itemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const providerFactory = makeProviderFactory(new DevelopmentMockServiceGuideProvider());

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PublicGuideConfigService,
        { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
        { provide: ServiceGuideProviderFactory, useValue: providerFactory },
      ],
    }).compile();
    service = module.get(PublicGuideConfigService);
    itemRepo.find.mockResolvedValue([]);
    itemRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
  });

  it('lists only active visible departments', async () => {
    deptRepo.find.mockResolvedValue([DEPT_ROW]);
    const list = await service.listPublicDepts();
    expect(list).toEqual([{ deptCode: 'D-001', name: '人社局', firstLetter: '人' }]);
    expect(deptRepo.find).toHaveBeenCalledWith({
      where: { status: 'active', isVisible: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  });

  it('normalizes dept code when resolving', async () => {
    deptRepo.findOne.mockResolvedValue(DEPT_ROW);
    const dept = await service.requireActiveDept(' d-001 ');
    expect(dept.deptCode).toBe('D-001');
    expect(deptRepo.findOne).toHaveBeenCalledWith({
      where: { deptCode: 'D-001', status: 'active', isVisible: 1 },
    });
  });

  it('existsDeptCode accepts development mock fallback', async () => {
    deptRepo.findOne.mockResolvedValue(null);
    expect(await service.existsDeptCode('d-001')).toBe(true);
  });
});

describe('ServiceGuide public API — controller', () => {
  let app: INestApplication;
  const deptRepo = { find: jest.fn(), findOne: jest.fn() };
  const themeRepo = { find: jest.fn(), findOne: jest.fn() };
  const itemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const cacheRepo = { findOne: jest.fn(), create: jest.fn((r) => r), save: jest.fn(async (r) => r) };
  const contentRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeAll(async () => {
    process.env.SERVICE_GUIDE_PROVIDER = 'development';
    deptRepo.find.mockResolvedValue([DEPT_ROW]);
    themeRepo.find.mockResolvedValue([THEME_ROW]);
    deptRepo.findOne.mockImplementation(async ({ where }: { where: { deptCode: string } }) =>
      where.deptCode === 'D-001' ? DEPT_ROW : null,
    );
    themeRepo.findOne.mockImplementation(async ({ where }: { where: { themeCode: string } }) =>
      where.themeCode === 'T-001' ? THEME_ROW : null,
    );
    itemRepo.find.mockResolvedValue([]);
    itemRepo.findOne.mockResolvedValue(null);
    itemRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    cacheRepo.findOne.mockResolvedValue(null);
    contentRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceGuideController],
      providers: [
        ServiceGuideService,
        GuideCacheService,
        PublicGuideConfigService,
        GuideRelatedContentService,
        ServiceGuideProviderFactory,
        { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
        { provide: getRepositoryToken(GuideApiCache), useValue: cacheRepo },
        { provide: getRepositoryToken(ContentItem), useValue: contentRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    delete process.env.SERVICE_GUIDE_PROVIDER;
    await app.close();
  });

  const get = (path: string) => supertest(app.getHttpServer()).get(path);

  it('GET /api/public/service-guide/depts is anonymous', async () => {
    const res = await get('/api/public/service-guide/depts');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual([
      { deptCode: 'D-001', name: '人社局', firstLetter: '人' },
    ]);
  });

  it('GET /api/public/service-guide/themes is anonymous', async () => {
    const res = await get('/api/public/service-guide/themes');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data[0].themeCode).toBe('T-001');
  });

  it('GET item-types normalizes dept code', async () => {
    const res = await get('/api/public/service-guide/depts/d-001/item-types');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([{ code: 'query', name: '查询咨询' }]),
    );
  });

  it('GET items returns paginated mock data without internal fields', async () => {
    const res = await get('/api/public/service-guide/items?page=1&pageSize=2&deptCode=d-001');
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.list[0]).not.toHaveProperty('platformParamJson');
    expect(res.body.data.list[0]).not.toHaveProperty('requestParam');
    expect(JSON.stringify(res.body)).not.toContain('platformParamJson');
  });

  it('GET item detail returns unified DTO shape', async () => {
    const res = await get('/api/public/service-guide/items/i-001');
    expect(res.status).toBe(200);
    const detail = res.body.data;
    expect(detail.basicInfo.itemId).toBe('i-001');
    expect(detail).toHaveProperty('relatedPolicies');
    expect(detail).toHaveProperty('relatedFaqs');
    expect(detail).not.toHaveProperty('responseBody');
    expect(detail).not.toHaveProperty('platformParamJson');
  });

  it('admin guide route is not mounted on public controller', () => {
    expect(GuideDeptsController.name).toBe('GuideDeptsController');
    expect(ServiceGuideController.name).toBe('ServiceGuideController');
  });
});

describe('ServiceGuideService — related content filtering', () => {
  let service: ServiceGuideService;
  const deptRepo = { find: jest.fn(), findOne: jest.fn() };
  const themeRepo = { find: jest.fn(), findOne: jest.fn() };
  const itemRepo = { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const cacheRepo = { findOne: jest.fn(), create: jest.fn((r) => r), save: jest.fn(async (r) => r) };
  const contentRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    deptRepo.find.mockResolvedValue([]);
    themeRepo.find.mockResolvedValue([]);
    itemRepo.find.mockResolvedValue([]);
    itemRepo.findOne.mockResolvedValue({
      platformItemId: 'i-001',
      relatedPolicyIds: '["policy-published","policy-draft"]',
      relatedFaqIds: '["faq-published"]',
      isVisible: 1,
      isHot: 0,
    });
    itemRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    cacheRepo.findOne.mockResolvedValue(null);
    const makeQb = (rows: { id: string; title: string }[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    });
    contentRepo.createQueryBuilder
      .mockReturnValueOnce(makeQb([{ id: 'policy-published', title: '已发布政策' }]))
      .mockReturnValueOnce(makeQb([{ id: 'faq-published', title: '已发布FAQ' }]));

    const module = await Test.createTestingModule({
      providers: [
        ServiceGuideService,
        GuideCacheService,
        PublicGuideConfigService,
        GuideRelatedContentService,
        {
          provide: ServiceGuideProviderFactory,
          useValue: makeProviderFactory(new DevelopmentMockServiceGuideProvider()),
        },
        { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
        { provide: getRepositoryToken(GuideApiCache), useValue: cacheRepo },
        { provide: getRepositoryToken(ContentItem), useValue: contentRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();
    service = module.get(ServiceGuideService);
  });

  it('relatedPolicies and relatedFaqs only include published rows returned by query', async () => {
    const detail = await service.getItemDetail('i-001');
    expect(detail.relatedPolicies).toEqual([{ id: 'policy-published', title: '已发布政策' }]);
    expect(detail.relatedFaqs).toEqual([{ id: 'faq-published', title: '已发布FAQ' }]);
  });
});

describe('ServiceGuideService — item visibility', () => {
  let service: ServiceGuideService;
  const deptRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(DEPT_ROW) };
  const themeRepo = { find: jest.fn(), findOne: jest.fn() };
  const itemRepo = { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const cacheRepo = { findOne: jest.fn(), create: jest.fn((r) => r), save: jest.fn(async (r) => r) };

  beforeEach(async () => {
    jest.resetAllMocks();
    deptRepo.findOne.mockResolvedValue(DEPT_ROW);
    itemRepo.find.mockResolvedValue([]);
    cacheRepo.findOne.mockResolvedValue(null);
    itemRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => [
        {
          platformItemId: 'i-001',
          isVisible: 0,
          isHot: 0,
          relatedPolicyIds: null,
          relatedFaqIds: null,
        },
      ]),
    });

    const module = await Test.createTestingModule({
      providers: [
        ServiceGuideService,
        GuideCacheService,
        PublicGuideConfigService,
        GuideRelatedContentService,
        {
          provide: ServiceGuideProviderFactory,
          useValue: makeProviderFactory(new DevelopmentMockServiceGuideProvider()),
        },
        { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
        { provide: getRepositoryToken(GuideApiCache), useValue: cacheRepo },
        { provide: getRepositoryToken(ContentItem), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();
    service = module.get(ServiceGuideService);
  });

  it('excludes is_visible=0 configured items from public list', async () => {
    const page = await service.getItems({ page: 1, pageSize: 20, deptCode: 'D-001' });
    const ids = page.list.map((i) => i.itemId);
    expect(page.total).toBe(1);
    expect(ids).not.toContain('i-001');
    expect(ids).toContain('i-005');
  });

  it('returns 404 for is_visible=0 item detail', async () => {
    itemRepo.findOne.mockResolvedValue({
      platformItemId: 'i-001',
      isVisible: 0,
    });
    await expect(service.getItemDetail('i-001')).rejects.toBeInstanceOf(NotFoundException);
  });
});

const PAGINATION_DEPT_CODE = 'D-PAG';
const PAGINATION_DEPT_ROW: GuideDeptMapping = {
  ...DEPT_ROW,
  id: 'dept-pag',
  deptCode: PAGINATION_DEPT_CODE,
  displayName: '分页测试部门',
} as GuideDeptMapping;

const PAGINATION_MOCK_ITEMS = [
  { itemId: 'pg-h1', name: 'Hidden 1', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-v1', name: 'Visible 1', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-v2', name: 'Visible 2', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-h2', name: 'Hidden 2', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-v3', name: 'Visible 3', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-v4', name: 'Visible 4', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-h3', name: 'Hidden 3', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
  { itemId: 'pg-v5', name: 'Visible 5', deptCode: PAGINATION_DEPT_CODE, themeCode: 'T-001', itemTypeCode: 'apply' },
];

const PAGINATION_HIDDEN_IDS = new Set(['pg-h1', 'pg-h2', 'pg-h3']);
const PAGINATION_VISIBLE_IDS = ['pg-v1', 'pg-v2', 'pg-v3', 'pg-v4', 'pg-v5'];

function makePaginationProvider(): ServiceGuideProvider {
  return {
    providerId: 'development',
    isDevelopmentMock: true,
    fetchDeptItemTypes: async () => [],
    fetchThemeItemTypes: async () => [],
    fetchItemListScope: async (params) => {
      let list: PublicItem[] = [...PAGINATION_MOCK_ITEMS];
      if (params.deptCode) {
        const dept = normalizeGuideCode(params.deptCode);
        list = list.filter((i) => normalizeGuideCode(i.deptCode) === dept);
      }
      return { list, total: list.length };
    },
    fetchItemDetail: async () => {
      throw new NotFoundException('not used');
    },
  };
}

function makeNonMockProvider(items: typeof PAGINATION_MOCK_ITEMS): ServiceGuideProvider {
  return {
    providerId: 'real',
    isDevelopmentMock: false,
    fetchDeptItemTypes: async () => [],
    fetchThemeItemTypes: async () => [],
    fetchItemListScope: async () => ({ list: items, total: items.length }),
    fetchItemDetail: async () => {
      throw new NotFoundException('not used');
    },
  };
}

async function createPaginationService(
  provider: ServiceGuideProvider,
  itemConfigs: Array<{ platformItemId: string; isVisible: number }>,
): Promise<ServiceGuideService> {
  const deptRepo = {
    find: jest.fn(),
    findOne: jest.fn().mockImplementation(async ({ where }: { where: { deptCode: string } }) =>
      where.deptCode === PAGINATION_DEPT_CODE ? PAGINATION_DEPT_ROW : null,
    ),
  };
  const themeRepo = { find: jest.fn(), findOne: jest.fn() };
  const itemRepo = { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const cacheRepo = { findOne: jest.fn(), create: jest.fn((r) => r), save: jest.fn(async (r) => r) };
  itemRepo.find.mockResolvedValue([]);
  cacheRepo.findOne.mockResolvedValue(null);
  itemRepo.createQueryBuilder.mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockImplementation(async () =>
      itemConfigs.map((c) => ({
        platformItemId: c.platformItemId,
        isVisible: c.isVisible,
        isHot: 0,
        relatedPolicyIds: null,
        relatedFaqIds: null,
      })),
    ),
  });

  const module = await Test.createTestingModule({
    providers: [
      ServiceGuideService,
      GuideCacheService,
      PublicGuideConfigService,
      GuideRelatedContentService,
      {
        provide: ServiceGuideProviderFactory,
        useValue: makeProviderFactory(provider),
      },
      { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
      { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
      { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
      { provide: getRepositoryToken(GuideApiCache), useValue: cacheRepo },
      { provide: getRepositoryToken(ContentItem), useValue: { createQueryBuilder: jest.fn() } },
      { provide: getRepositoryToken(ContentVersion), useValue: {} },
    ],
  }).compile();
  return module.get(ServiceGuideService);
}

describe('ServiceGuideService — pagination after visibility filter', () => {
  const hiddenConfigs = [...PAGINATION_HIDDEN_IDS].map((id) => ({
    platformItemId: id,
    isVisible: 0,
  }));
  const visibleConfigs = PAGINATION_VISIBLE_IDS.map((id) => ({
    platformItemId: id,
    isVisible: 1,
  }));
  const paginationConfigs = [...hiddenConfigs, ...visibleConfigs];

  it('skips hidden item on first page when pageSize is 1', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const page = await service.getItems({ page: 1, pageSize: 1, deptCode: PAGINATION_DEPT_CODE });
    expect(page.list).toHaveLength(1);
    expect(page.list[0].itemId).toBe('pg-v1');
    expect(page.total).toBe(5);
  });

  it('fills page from later visible items when early items are hidden', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const page = await service.getItems({ page: 2, pageSize: 2, deptCode: PAGINATION_DEPT_CODE });
    expect(page.list.map((i) => i.itemId)).toEqual(['pg-v3', 'pg-v4']);
    expect(page.total).toBe(5);
  });

  it('handles multiple hidden items distributed across upstream order', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const pages = await Promise.all([
      service.getItems({ page: 1, pageSize: 2, deptCode: PAGINATION_DEPT_CODE }),
      service.getItems({ page: 2, pageSize: 2, deptCode: PAGINATION_DEPT_CODE }),
      service.getItems({ page: 3, pageSize: 2, deptCode: PAGINATION_DEPT_CODE }),
    ]);
    expect(pages[0].list.map((i) => i.itemId)).toEqual(['pg-v1', 'pg-v2']);
    expect(pages[1].list.map((i) => i.itemId)).toEqual(['pg-v3', 'pg-v4']);
    expect(pages[2].list.map((i) => i.itemId)).toEqual(['pg-v5']);
    expect(pages.every((p) => p.total === 5)).toBe(true);
  });

  it('returns accurate total with pageSize boundary', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const page = await service.getItems({ page: 1, pageSize: 5, deptCode: PAGINATION_DEPT_CODE });
    expect(page.list.map((i) => i.itemId)).toEqual(PAGINATION_VISIBLE_IDS);
    expect(page.total).toBe(5);
  });

  it('last page has remaining visible items and is not incorrectly empty', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const last = await service.getItems({ page: 3, pageSize: 2, deptCode: PAGINATION_DEPT_CODE });
    expect(last.list).toHaveLength(1);
    expect(last.total).toBe(5);
  });

  it('page beyond last returns empty list but keeps accurate total', async () => {
    const service = await createPaginationService(makePaginationProvider(), paginationConfigs);
    const beyond = await service.getItems({ page: 10, pageSize: 2, deptCode: PAGINATION_DEPT_CODE });
    expect(beyond.list).toHaveLength(0);
    expect(beyond.total).toBe(5);
  });

  it('hides unconfigured items in non-mock environment', async () => {
    const service = await createPaginationService(
      makeNonMockProvider(PAGINATION_MOCK_ITEMS),
      [],
    );
    const page = await service.getItems({ page: 1, pageSize: 20, deptCode: PAGINATION_DEPT_CODE });
    expect(page.list).toHaveLength(0);
    expect(page.total).toBe(0);
  });
});

describe('ServiceGuideService — upstream failure without cache', () => {
  it('returns 503 for item list when provider fails and cache empty', async () => {
    const failingProvider: ServiceGuideProvider = {
      providerId: 'development',
      isDevelopmentMock: true,
      fetchDeptItemTypes: async () => [],
      fetchThemeItemTypes: async () => [],
      fetchItemListScope: async () => {
        throw new Error('boom');
      },
      fetchItemDetail: async () => {
        throw new Error('boom');
      },
    };

    const deptRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(DEPT_ROW) };
    const themeRepo = { find: jest.fn(), findOne: jest.fn() };
    const itemRepo = { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
    const cacheRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn(), save: jest.fn() };
    itemRepo.find.mockResolvedValue([]);
    itemRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    const module = await Test.createTestingModule({
      providers: [
        ServiceGuideService,
        GuideCacheService,
        PublicGuideConfigService,
        GuideRelatedContentService,
        {
          provide: ServiceGuideProviderFactory,
          useValue: makeProviderFactory(failingProvider),
        },
        { provide: getRepositoryToken(GuideDeptMapping), useValue: deptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: themeRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: itemRepo },
        { provide: getRepositoryToken(GuideApiCache), useValue: cacheRepo },
        { provide: getRepositoryToken(ContentItem), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();

    const service = module.get(ServiceGuideService);
    await expect(
      service.getItems({ page: 1, pageSize: 20, deptCode: 'D-001' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
