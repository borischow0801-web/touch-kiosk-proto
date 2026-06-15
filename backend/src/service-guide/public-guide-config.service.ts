import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuideDeptMapping } from '../database/entities/guide-dept-mapping.entity';
import { GuideThemeMapping } from '../database/entities/guide-theme-mapping.entity';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { normalizeGuideCode } from '../guide-config/utils/normalize-guide-code.util';
import {
  developmentMockHasDeptCode,
  developmentMockHasItemId,
  developmentMockHasItemTypeCode,
  developmentMockHasThemeCode,
} from './providers/development-mock.catalog';
import { ServiceGuideProviderFactory } from './providers/service-guide-provider.factory';
import type { PublicDept, PublicItem, PublicTheme } from './types/public-service-guide.types';

@Injectable()
export class PublicGuideConfigService {
  constructor(
    @InjectRepository(GuideDeptMapping)
    private readonly deptRepo: Repository<GuideDeptMapping>,
    @InjectRepository(GuideThemeMapping)
    private readonly themeRepo: Repository<GuideThemeMapping>,
    @InjectRepository(GuideItemConfig)
    private readonly itemConfigRepo: Repository<GuideItemConfig>,
    private readonly providerFactory: ServiceGuideProviderFactory,
  ) {}

  private allowMockFallback(): boolean {
    return this.providerFactory.isDevelopmentMock();
  }

  async listPublicDepts(hot?: string): Promise<PublicDept[]> {
    const rows = await this.deptRepo.find({
      where: { status: 'active', isVisible: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    const hotDeptCodes = await this.loadHotDeptCodes();
    let list: PublicDept[] = rows.map((row) => ({
      deptCode: row.deptCode,
      name: row.displayName,
      firstLetter: this.firstLetter(row.displayName),
      hot: hotDeptCodes.has(row.deptCode) || undefined,
    }));
    if (hot === '1') {
      list = list.filter((d) => d.hot);
    }
    return list;
  }

  async listPublicThemes(hot?: string): Promise<PublicTheme[]> {
    const rows = await this.themeRepo.find({
      where: { isVisible: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    const hotThemeCodes = await this.loadHotThemeCodes();
    let list: PublicTheme[] = rows.map((row) => ({
      themeCode: row.themeCode,
      name: row.themeName,
      hot: hotThemeCodes.has(row.themeCode) || undefined,
    }));
    if (hot === '1') {
      list = list.filter((t) => t.hot);
    }
    return list;
  }

  async findActiveDept(code: string): Promise<GuideDeptMapping | null> {
    const normalized = normalizeGuideCode(code);
    return this.deptRepo.findOne({
      where: { deptCode: normalized, status: 'active', isVisible: 1 },
    });
  }

  async findVisibleTheme(code: string): Promise<GuideThemeMapping | null> {
    const normalized = normalizeGuideCode(code);
    return this.themeRepo.findOne({
      where: { themeCode: normalized, isVisible: 1 },
    });
  }

  async requireActiveDept(code: string): Promise<GuideDeptMapping> {
    const dept = await this.findActiveDept(code);
    if (!dept) {
      throw new NotFoundException(`部门 ${normalizeGuideCode(code)} 不存在`);
    }
    return dept;
  }

  async requireVisibleTheme(code: string): Promise<GuideThemeMapping> {
    const theme = await this.findVisibleTheme(code);
    if (!theme) {
      throw new NotFoundException(`主题 ${normalizeGuideCode(code)} 不存在`);
    }
    return theme;
  }

  async findItemConfigByPlatformId(platformItemId: string): Promise<GuideItemConfig | null> {
    return this.itemConfigRepo.findOne({
      where: { platformItemId: platformItemId.trim() },
    });
  }

  async findVisibleItemConfigByPlatformId(platformItemId: string): Promise<GuideItemConfig | null> {
    return this.itemConfigRepo.findOne({
      where: { platformItemId: platformItemId.trim(), isVisible: 1 },
    });
  }

  async loadItemConfigsByPlatformIds(ids: string[]): Promise<Map<string, GuideItemConfig>> {
    if (ids.length === 0) return new Map();
    const unique = [...new Set(ids)];
    const rows = await this.itemConfigRepo
      .createQueryBuilder('cfg')
      .where('cfg.platform_item_id IN (:...ids)', { ids: unique })
      .getMany();
    return new Map(rows.map((r) => [r.platformItemId, r]));
  }

  /**
   * Conservative visibility: configured is_visible=1 → visible; is_visible=0 → hidden;
   * unconfigured → visible only under development mock fallback, otherwise hidden.
   */
  async isItemPubliclyVisible(itemId: string): Promise<boolean> {
    const cfg = await this.findItemConfigByPlatformId(itemId);
    if (cfg) return cfg.isVisible === 1;
    if (this.allowMockFallback() && developmentMockHasItemId(itemId)) return true;
    return false;
  }

  async requirePublicItem(itemId: string): Promise<void> {
    if (!(await this.isItemPubliclyVisible(itemId))) {
      throw new NotFoundException(`事项 ${itemId.trim()} 不存在`);
    }
  }

  async filterPublicItems(items: PublicItem[]): Promise<PublicItem[]> {
    if (items.length === 0) return [];
    const configs = await this.loadItemConfigsByPlatformIds(items.map((i) => i.itemId));
    return items.filter((item) => {
      const cfg = configs.get(item.itemId);
      if (cfg) return cfg.isVisible === 1;
      return this.allowMockFallback() && developmentMockHasItemId(item.itemId);
    });
  }

  async findVisibleItemConfigsByPlatformIds(ids: string[]): Promise<Map<string, GuideItemConfig>> {
    if (ids.length === 0) return new Map();
    const unique = [...new Set(ids)];
    const rows = await this.itemConfigRepo
      .createQueryBuilder('cfg')
      .where('cfg.is_visible = 1')
      .andWhere('cfg.platform_item_id IN (:...ids)', { ids: unique })
      .getMany();
    return new Map(rows.map((r) => [r.platformItemId, r]));
  }

  async existsItemId(id: string): Promise<boolean> {
    return this.isItemPubliclyVisible(id);
  }

  async existsDeptCode(code: string): Promise<boolean> {
    const normalized = normalizeGuideCode(code);
    if (this.allowMockFallback() && developmentMockHasDeptCode(normalized)) return true;
    return (await this.findActiveDept(normalized)) != null;
  }

  async existsThemeCode(code: string): Promise<boolean> {
    const normalized = normalizeGuideCode(code);
    if (this.allowMockFallback() && developmentMockHasThemeCode(normalized)) return true;
    return (await this.findVisibleTheme(normalized)) != null;
  }

  existsItemTypeCode(code: string): boolean {
    if (this.allowMockFallback() && developmentMockHasItemTypeCode(code)) return true;
    return false;
  }

  async enrichItemsWithConfigFlags(items: PublicItem[]): Promise<PublicItem[]> {
    const configs = await this.findVisibleItemConfigsByPlatformIds(items.map((i) => i.itemId));
    return items.map((item) => {
      const cfg = configs.get(item.itemId);
      const hot = cfg?.isHot === 1 ? true : item.hot;
      return hot ? { ...item, hot: true } : { ...item, hot: undefined };
    });
  }

  private async loadHotDeptCodes(): Promise<Set<string>> {
    const rows = await this.itemConfigRepo.find({
      where: { isHot: 1, isVisible: 1 },
      select: ['deptCode'],
    });
    return new Set(rows.map((r) => r.deptCode).filter((c): c is string => Boolean(c)));
  }

  private async loadHotThemeCodes(): Promise<Set<string>> {
    const rows = await this.itemConfigRepo.find({
      where: { isHot: 1, isVisible: 1 },
      select: ['themeCode'],
    });
    return new Set(rows.map((r) => r.themeCode).filter((c): c is string => Boolean(c)));
  }

  private firstLetter(name: string): string | undefined {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    return trimmed.charAt(0).toUpperCase();
  }
}
