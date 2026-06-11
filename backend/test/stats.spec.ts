import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest = require('supertest');
import { StatsController } from '../src/public-api/controllers/stats.controller';
import { ServiceGuideService } from '../src/service-guide/service-guide.service';
import { StatsService } from '../src/stats/stats.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Stats endpoints — semantic validation', () => {
  let app: INestApplication;
  let mockRecordClick: jest.Mock;
  let mockRecordPageView: jest.Mock;

  beforeAll(async () => {
    mockRecordClick = jest.fn();
    mockRecordPageView = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        ServiceGuideService,
        {
          provide: StatsService,
          useValue: {
            recordClick: mockRecordClick,
            recordPageView: mockRecordPageView,
          },
        },
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

  afterAll(() => app.close());
  beforeEach(() => {
    mockRecordClick.mockClear();
    mockRecordPageView.mockClear();
  });

  const post = (path: string, body: Record<string, unknown>) =>
    supertest(app.getHttpServer())
      .post(path)
      .send(body)
      .set('Content-Type', 'application/json');

  // ── /api/public/stats/click ────────────────────────────────────────────────

  describe('POST /api/public/stats/click — valid cases', () => {
    it('item_view + existing itemId returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'item_view', id: 'i-001' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(mockRecordClick).toHaveBeenCalledTimes(1);
    });

    it('hot_item_click + existing itemId returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'hot_item_click', id: 'i-002' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('dept_click + existing deptCode returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'dept_click', id: 'd-001' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('theme_click + existing themeCode returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'theme_click', id: 't-002' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('type_click + existing typeCode returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'type_click', id: 'apply' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('type_click + query typeCode returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'type_click', id: 'query' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('module_click + whitelisted module code returns code 0', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'module_click', id: 'service-guide',
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('nav_click + whitelisted nav code returns code 0', async () => {
      const res = await post('/api/public/stats/click', { type: 'nav_click', id: 'home' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('POST /api/public/stats/click — invalid cases', () => {
    it('item_view + non-existent itemId → code 400, StatsService not called', async () => {
      const res = await post('/api/public/stats/click', { type: 'item_view', id: 'i-999' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('item_view + phone number (13800138000) → 400', async () => {
      const res = await post('/api/public/stats/click', { type: 'item_view', id: '13800138000' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('item_view + id card number (18 digits) → 400', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'item_view', id: '110101199001011234',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('item_view + 15-digit id card → 400', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'item_view', id: '110101900101123',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('dept_click + itemId (wrong entity type) → 400', async () => {
      const res = await post('/api/public/stats/click', { type: 'dept_click', id: 'i-001' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('theme_click + deptCode (wrong entity type) → 400', async () => {
      const res = await post('/api/public/stats/click', { type: 'theme_click', id: 'd-001' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('type_click + non-existent typeCode → 400', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'type_click', id: 'nonexistent-type',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('module_click + unknown module code → 400', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'module_click', id: 'unknown-module',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('nav_click + unknown nav code → 400', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'nav_click', id: 'sidebar',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('missing id → 400', async () => {
      const res = await post('/api/public/stats/click', { type: 'item_view' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });

    it('extra field in body → 400, StatsService not called', async () => {
      const res = await post('/api/public/stats/click', {
        type: 'item_view', id: 'i-001', malicious: 'data',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordClick).not.toHaveBeenCalled();
    });
  });

  // ── /api/public/stats/page-view ────────────────────────────────────────────

  describe('POST /api/public/stats/page-view — valid cases', () => {
    it('/home returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/home' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(mockRecordPageView).toHaveBeenCalledTimes(1);
    });

    it('/depts returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/depts' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/topics returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/topics' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/item-types returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/item-types' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/items returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/items' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/help returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/help' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/items/i-001 (existing) returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/items/i-001' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('/items/i-006 (existing) returns code 0', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/items/i-006' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('POST /api/public/stats/page-view — invalid cases', () => {
    it('/13800138000 → 400, StatsService not called', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/13800138000' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordPageView).not.toHaveBeenCalled();
    });

    it('/unknown-route → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/unknown-route' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordPageView).not.toHaveBeenCalled();
    });

    it('/items/nonexistent-id → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/items/nonexistent-id' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordPageView).not.toHaveBeenCalled();
    });

    it('path with query string /home?reset=1 → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/home?reset=1' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordPageView).not.toHaveBeenCalled();
    });

    it('path with hash /home#section → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: '/home#section' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('protocol URL http://evil.com → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: 'http://evil.com' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('double-slash path //evil.com → 400', async () => {
      const res = await post('/api/public/stats/page-view', { path: '//evil.com' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('extra field in body → 400, StatsService not called', async () => {
      const res = await post('/api/public/stats/page-view', {
        path: '/home', extra: 'injected',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(mockRecordPageView).not.toHaveBeenCalled();
    });
  });
});
