import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import supertest = require('supertest');
import { PublicHomeConfigService } from '../src/home-config/public-home-config.service';
import { HomeController } from '../src/public-api/controllers/home.controller';
import { HomeConfig } from '../src/database/entities/home-config.entity';
import { HomeConfigVersion } from '../src/database/entities/home-config-version.entity';
import { HomeModule } from '../src/database/entities/home-module.entity';
import { GuideItemConfig } from '../src/database/entities/guide-item-config.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  DEFAULT_IDLE_SECONDS,
  DEFAULT_PUBLIC_HOME_NAV,
  PUBLIC_HOME_UNAVAILABLE_MESSAGE,
} from '../src/home-config/types/public-home-config.types';

const CONFIG_ID = 'config-001';
const PUBLISHED_VERSION_ID = 'version-pub-001';
const DRAFT_VERSION_ID = 'version-draft-001';
const MODULE_VISIBLE_ID = 'module-visible-001';
const MODULE_HIDDEN_ID = 'module-hidden-001';
const MODULE_DRAFT_ID = 'module-draft-001';

function makeConfig(overrides: Partial<HomeConfig> = {}): HomeConfig {
  return {
    id: CONFIG_ID,
    configName: 'default',
    status: 'published',
    currentVersionId: PUBLISHED_VERSION_ID,
    createdBy: 'admin-001',
    updatedBy: 'admin-001',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as HomeConfig;
}

function makeVersion(overrides: Partial<HomeConfigVersion> = {}): HomeConfigVersion {
  return {
    id: PUBLISHED_VERSION_ID,
    homeConfigId: CONFIG_ID,
    versionNo: 1,
    title: '政务服务触摸查询',
    subtitle: '请在下方操作区点击选择',
    topBannerJson: '["温馨提示","欢迎"]',
    themeJson: '{"primaryColor":"#0052d9"}',
    status: 'published',
    changeRemark: null,
    createdBy: 'admin-001',
    createdAt: new Date('2024-06-01'),
    ...overrides,
  } as HomeConfigVersion;
}

function makeModule(overrides: Partial<HomeModule> = {}): HomeModule {
  return {
    id: MODULE_VISIBLE_ID,
    homeConfigVersionId: PUBLISHED_VERSION_ID,
    moduleCode: 'guide_dept',
    moduleName: '按部门查',
    moduleType: 'card',
    icon: 'dept',
    color: '#fff',
    layoutType: 'grid',
    isVisible: 1,
    sortOrder: 1,
    targetType: 'route',
    targetValue: '/guide/depts',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as HomeModule;
}

function makeGuideItem(overrides: Partial<GuideItemConfig> = {}): GuideItemConfig {
  return {
    id: 'guide-item-001',
    platformItemId: 'platform-001',
    itemName: '社保查询',
    displayName: '社保查询展示名',
    deptCode: 'dept-001',
    themeCode: null,
    isHot: 1,
    isRecommend: 0,
    isVisible: 1,
    sortOrder: 1,
    relatedPolicyIds: null,
    relatedFaqIds: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as GuideItemConfig;
}

function createGuideItemQueryBuilder(rows: GuideItemConfig[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

function createNoticeQueryBuilder(rows: unknown[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('PublicHomeConfigService — unit', () => {
  let service: PublicHomeConfigService;
  const mockConfigRepo = { findOne: jest.fn() };
  const mockVersionRepo = { findOne: jest.fn() };
  const mockModuleRepo = { find: jest.fn() };
  const mockGuideItemRepo = { createQueryBuilder: jest.fn() };
  const mockContentItemRepo = { createQueryBuilder: jest.fn() };
  let guideItemQb: ReturnType<typeof createGuideItemQueryBuilder>;
  let noticeQb: ReturnType<typeof createNoticeQueryBuilder>;

  beforeEach(async () => {
    jest.resetAllMocks();
    guideItemQb = createGuideItemQueryBuilder([]);
    noticeQb = createNoticeQueryBuilder([]);
    mockGuideItemRepo.createQueryBuilder.mockReturnValue(guideItemQb);
    mockContentItemRepo.createQueryBuilder.mockReturnValue(noticeQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicHomeConfigService,
        { provide: getRepositoryToken(HomeConfig), useValue: mockConfigRepo },
        { provide: getRepositoryToken(HomeConfigVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(HomeModule), useValue: mockModuleRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: mockGuideItemRepo },
        { provide: getRepositoryToken(ContentItem), useValue: mockContentItemRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: {} },
      ],
    }).compile();
    service = module.get(PublicHomeConfigService);
  });

  function setupPublishedContext(versionOverrides: Partial<HomeConfigVersion> = {}): void {
    mockConfigRepo.findOne.mockResolvedValue(makeConfig());
    mockVersionRepo.findOne.mockResolvedValue(makeVersion(versionOverrides));
    mockModuleRepo.find.mockResolvedValue([
      makeModule(),
      makeModule({
        id: MODULE_HIDDEN_ID,
        moduleCode: 'hidden',
        isVisible: 0,
      }),
      makeModule({
        id: MODULE_DRAFT_ID,
        homeConfigVersionId: DRAFT_VERSION_ID,
        moduleCode: 'draft_only',
      }),
    ]);
    guideItemQb.getMany.mockResolvedValue([
      makeGuideItem(),
      makeGuideItem({
        id: 'guide-item-002',
        platformItemId: 'platform-002',
        displayName: '',
        itemName: '医保报销',
        isHot: 0,
        isRecommend: 1,
      }),
      makeGuideItem({
        id: 'guide-item-hidden',
        platformItemId: 'platform-hidden',
        isVisible: 0,
        isHot: 1,
      }),
    ]);
    noticeQb.getRawMany.mockResolvedValue([
      {
        id: 'notice-001',
        title: '通知标题',
        summary: '通知摘要',
        publishAt: new Date('2024-06-10'),
      },
    ]);
  }

  it('无 home_config 返回 503', async () => {
    mockConfigRepo.findOne.mockResolvedValue(null);
    await expect(service.getConfig()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('home_config 非 published 返回 503', async () => {
    mockConfigRepo.findOne.mockResolvedValue(makeConfig({ status: 'draft' }));
    await expect(service.getConfig()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('currentVersionId 为空返回 503', async () => {
    mockConfigRepo.findOne.mockResolvedValue(makeConfig({ currentVersionId: null }));
    await expect(service.getConfig()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('currentVersionId 指向版本非 published 返回 503', async () => {
    mockConfigRepo.findOne.mockResolvedValue(makeConfig());
    mockVersionRepo.findOne.mockResolvedValue(null);
    await expect(service.getConfig()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('成功返回已发布版本 title/subtitle', async () => {
    setupPublishedContext();
    const result = await service.getConfig();
    expect(result.title).toBe('政务服务触摸查询');
    expect(result.subtitle).toBe('请在下方操作区点击选择');
    expect(result.idleSeconds).toBe(DEFAULT_IDLE_SECONDS);
  });

  it('只返回当前版本下可见且未删除模块', async () => {
    setupPublishedContext();
    mockModuleRepo.find.mockResolvedValueOnce([makeModule()]);
    const result = await service.getConfig();
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].moduleCode).toBe('guide_dept');
    expect(mockModuleRepo.find).toHaveBeenCalledWith({
      where: { homeConfigVersionId: PUBLISHED_VERSION_ID, isVisible: 1 },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  });

  it('不返回内部字段', async () => {
    setupPublishedContext();
    mockModuleRepo.find.mockResolvedValueOnce([makeModule()]);
    const result = await service.getConfig();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('createdBy');
    expect(serialized).not.toContain('updatedBy');
    expect(serialized).not.toContain('deletedAt');
    expect(serialized).not.toContain('homeConfigVersionId');
    expect(result.modules[0]).not.toHaveProperty('id');
  });

  it('top_banner_json 正常解析为 bannerLines', async () => {
    setupPublishedContext({ topBannerJson: '["行1","行2"]' });
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.bannerLines).toEqual(['行1', '行2']);
  });

  it('top_banner_json 非法 JSON 时不 500，返回空数组', async () => {
    setupPublishedContext({ topBannerJson: '{invalid' });
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.bannerLines).toEqual([]);
  });

  it('theme_json 正常解析为 theme', async () => {
    setupPublishedContext({ themeJson: '{"accent":"#000"}' });
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.theme).toEqual({ accent: '#000' });
  });

  it('theme_json 非法 JSON 时不 500，返回空对象', async () => {
    setupPublishedContext({ themeJson: 'not-json' });
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.theme).toEqual({});
  });

  it('homeHotItems 只包含 visible 且 hot/recommend 的事项', async () => {
    setupPublishedContext();
    mockModuleRepo.find.mockResolvedValueOnce([]);
    guideItemQb.getMany.mockResolvedValueOnce([
      makeGuideItem(),
      makeGuideItem({
        id: 'guide-item-002',
        platformItemId: 'platform-002',
        displayName: '',
        itemName: '医保报销',
        isHot: 0,
        isRecommend: 1,
      }),
    ]);
    const result = await service.getConfig();
    expect(result.homeHotItems).toEqual([
      { itemId: 'platform-001', name: '社保查询展示名' },
      { itemId: 'platform-002', name: '医保报销' },
    ]);
    expect(guideItemQb.andWhere).toHaveBeenCalledWith(
      '(item.is_hot = :hot OR item.is_recommend = :recommend)',
      { hot: 1, recommend: 1 },
    );
  });

  it('noticeSummaries 只包含已发布通知公告，最多 5 条', async () => {
    setupPublishedContext();
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.noticeSummaries).toHaveLength(1);
    expect(result.noticeSummaries[0]).toEqual({
      id: 'notice-001',
      title: '通知标题',
      summary: '通知摘要',
      publishAt: new Date('2024-06-10'),
    });
    expect(noticeQb.limit).toHaveBeenCalledWith(5);
    expect(noticeQb.where).toHaveBeenCalledWith('item.content_type = :contentType', {
      contentType: 'notices',
    });
    expect(noticeQb.andWhere).toHaveBeenCalledWith('item.status = :itemStatus', {
      itemStatus: 'published',
    });
  });

  it('nav 返回固定安全导航', async () => {
    setupPublishedContext();
    mockModuleRepo.find.mockResolvedValueOnce([]);
    const result = await service.getConfig();
    expect(result.nav).toEqual(DEFAULT_PUBLIC_HOME_NAV);
  });
});

describe('HomeController — public HTTP', () => {
  let app: INestApplication;
  const mockPublicHomeConfigService = { getConfig: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        { provide: PublicHomeConfigService, useValue: mockPublicHomeConfigService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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

  it('GET /api/public/home/config 无需 token', async () => {
    mockPublicHomeConfigService.getConfig.mockRejectedValueOnce(
      new ServiceUnavailableException(PUBLIC_HOME_UNAVAILABLE_MESSAGE),
    );
    const res = await supertest(app.getHttpServer()).get('/api/public/home/config');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe(503);
    expect(res.body.data).toBeNull();
  });

  it('无已发布配置时 HTTP 503，信封 code=503，data=null', async () => {
    mockPublicHomeConfigService.getConfig.mockRejectedValueOnce(
      new ServiceUnavailableException(PUBLIC_HOME_UNAVAILABLE_MESSAGE),
    );
    const res = await supertest(app.getHttpServer()).get('/api/public/home/config');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe(503);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toContain('首页配置暂不可用');
  });

  it('有已发布配置时 HTTP 200，信封 code=0', async () => {
    mockPublicHomeConfigService.getConfig.mockResolvedValueOnce({
      title: '政务服务触摸查询',
      subtitle: '副标题',
      idleSeconds: 90,
      bannerLines: ['欢迎'],
      theme: {},
      modules: [],
      homeHotItems: [],
      noticeSummaries: [],
      nav: DEFAULT_PUBLIC_HOME_NAV,
    });
    const res = await supertest(app.getHttpServer()).get('/api/public/home/config');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.title).toBe('政务服务触摸查询');
  });
});
