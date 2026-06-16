import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { HomeConfig } from '../database/entities/home-config.entity';
import { HomeConfigVersion } from '../database/entities/home-config-version.entity';
import { HomeModule } from '../database/entities/home-module.entity';
import { UpdateHomeConfigDto } from './dto/update-home-config.dto';
import { CreateHomeModuleDto } from './dto/create-home-module.dto';
import { UpdateHomeModuleDto } from './dto/update-home-module.dto';
import { SortHomeModulesDto } from './dto/sort-home-modules.dto';

export const DEFAULT_HOME_CONFIG_NAME = 'default';

export interface VersionSummary {
  id: string;
  versionNo: number;
  title: string;
  subtitle: string | null;
  status: string;
}

export interface DraftVersionDetail extends VersionSummary {
  topBannerJson: unknown;
  themeJson: unknown;
  changeRemark: string | null;
}

export interface AdminConfigResponse {
  id: string | null;
  configName: string;
  status: string | null;
  currentVersionId: string | null;
  currentVersion: VersionSummary | null;
  draftVersion: DraftVersionDetail | null;
  updatedAt: Date | null;
}

export interface HomeModuleListItem {
  id: string;
  moduleCode: string;
  moduleName: string;
  moduleType: string;
  icon: string | null;
  color: string | null;
  layoutType: string | null;
  isVisible: boolean;
  sortOrder: number;
  targetType: string;
  targetValue: string;
}

@Injectable()
export class HomeConfigService {
  private readonly logger = new Logger(HomeConfigService.name);

  constructor(
    @InjectRepository(HomeConfig)
    private readonly configRepo: Repository<HomeConfig>,
    @InjectRepository(HomeConfigVersion)
    private readonly versionRepo: Repository<HomeConfigVersion>,
    @InjectRepository(HomeModule)
    private readonly moduleRepo: Repository<HomeModule>,
    private readonly dataSource: DataSource,
  ) {}

  async getAdminConfig(): Promise<AdminConfigResponse> {
    const config = await this.findSingletonOrNull();
    if (!config) {
      return this.emptyAdminConfigResponse();
    }
    return this.buildAdminConfigResponse(config);
  }

  async updateAdminConfig(dto: UpdateHomeConfigDto, userId: string): Promise<AdminConfigResponse> {
    return this.dataSource.transaction(async (manager) => {
      let config = await this.findSingletonInTx(manager);

      if (config) {
        await this.assertNoPendingVersion(manager, config.id);
      }

      if (!config) {
        config = await this.createSingletonWithDraft(manager, dto, userId);
        this.logger.log(`Home config created: id=${config.id}`);
        return this.buildAdminConfigResponse(config, manager);
      }

      let draft = await this.findDraftVersion(manager, config.id);
      if (!draft) {
        draft = await this.createDraftFromContext(manager, config, userId);
      }

      this.applyVersionFields(draft, dto, userId);
      await manager.save(HomeConfigVersion, draft);
      config.updatedBy = userId;
      await manager.save(HomeConfig, config);

      this.logger.log(`Home config draft updated: configId=${config.id} versionId=${draft.id}`);
      return this.buildAdminConfigResponse(config, manager);
    });
  }

  async listModules(): Promise<{ list: HomeModuleListItem[] }> {
    const config = await this.findSingletonOrNull();
    if (!config) {
      return { list: [] };
    }

    const drafts = await this.versionRepo.find({
      where: { homeConfigId: config.id, status: 'draft' },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    const draft = drafts[0];
    if (!draft) {
      return { list: [] };
    }

    const modules = await this.moduleRepo.find({
      where: { homeConfigVersionId: draft.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return { list: modules.map((m) => this.toModuleListItem(m)) };
  }

  async createModule(dto: CreateHomeModuleDto): Promise<HomeModuleListItem> {
    return this.dataSource.transaction(async (manager) => {
      const draft = await this.requireEditableDraft(manager);
      await this.assertModuleCodeUnique(manager, draft.id, dto.moduleCode);

      const module = manager.create(HomeModule, {
        homeConfigVersionId: draft.id,
        moduleCode: dto.moduleCode.trim(),
        moduleName: dto.moduleName.trim(),
        moduleType: dto.moduleType.trim(),
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        layoutType: dto.layoutType ?? null,
        isVisible: this.toIsVisibleSmallint(dto.isVisible, true),
        sortOrder: dto.sortOrder ?? 0,
        targetType: dto.targetType.trim(),
        targetValue: dto.targetValue.trim(),
      });
      const saved = await manager.save(HomeModule, module);
      this.logger.log(`Home module created: id=${saved.id} versionId=${draft.id}`);
      return this.toModuleListItem(saved);
    });
  }

  async updateModule(id: string, dto: UpdateHomeModuleDto): Promise<HomeModuleListItem> {
    return this.dataSource.transaction(async (manager) => {
      const draft = await this.requireEditableDraft(manager);
      const module = await this.findModuleInDraftOrFail(manager, draft.id, id);

      if (dto.moduleCode !== undefined && dto.moduleCode !== module.moduleCode) {
        await this.assertModuleCodeUnique(manager, draft.id, dto.moduleCode, id);
        module.moduleCode = dto.moduleCode.trim();
      }
      if (dto.moduleName !== undefined) module.moduleName = dto.moduleName.trim();
      if (dto.moduleType !== undefined) module.moduleType = dto.moduleType.trim();
      if (dto.icon !== undefined) module.icon = dto.icon;
      if (dto.color !== undefined) module.color = dto.color;
      if (dto.layoutType !== undefined) module.layoutType = dto.layoutType;
      if (dto.isVisible !== undefined) {
        module.isVisible = this.toIsVisibleSmallint(dto.isVisible);
      }
      if (dto.sortOrder !== undefined) module.sortOrder = dto.sortOrder;
      if (dto.targetType !== undefined) module.targetType = dto.targetType.trim();
      if (dto.targetValue !== undefined) module.targetValue = dto.targetValue.trim();

      const saved = await manager.save(HomeModule, module);
      this.logger.log(`Home module updated: id=${id}`);
      return this.toModuleListItem(saved);
    });
  }

  async removeModule(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const draft = await this.requireEditableDraft(manager);
      await this.findModuleInDraftOrFail(manager, draft.id, id);
      await manager.softDelete(HomeModule, id);
      this.logger.log(`Home module soft-deleted: id=${id}`);
    });
  }

  async sortModules(dto: SortHomeModulesDto): Promise<{ list: HomeModuleListItem[] }> {
    const ids = dto.items.map((item) => item.id);
    const sortOrders = dto.items.map((item) => item.sortOrder);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('items 中存在重复的模块 id');
    }
    if (new Set(sortOrders).size !== sortOrders.length) {
      throw new BadRequestException('items 中存在重复的 sortOrder');
    }

    return this.dataSource.transaction(async (manager) => {
      const draft = await this.requireEditableDraft(manager);
      const modules = await manager.find(HomeModule, {
        where: { homeConfigVersionId: draft.id },
      });
      const moduleMap = new Map(modules.map((m) => [m.id, m]));

      for (const item of dto.items) {
        const module = moduleMap.get(item.id);
        if (!module) {
          throw new NotFoundException(`模块 ${item.id} 不存在或不属于当前草稿版本`);
        }
        module.sortOrder = item.sortOrder;
      }

      await manager.save(HomeModule, [...moduleMap.values()]);
      const sorted = await manager.find(HomeModule, {
        where: { homeConfigVersionId: draft.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      return { list: sorted.map((m) => this.toModuleListItem(m)) };
    });
  }

  private emptyAdminConfigResponse(): AdminConfigResponse {
    return {
      id: null,
      configName: DEFAULT_HOME_CONFIG_NAME,
      status: null,
      currentVersionId: null,
      currentVersion: null,
      draftVersion: null,
      updatedAt: null,
    };
  }

  private async buildAdminConfigResponse(
    config: HomeConfig,
    manager: EntityManager = this.versionRepo.manager,
  ): Promise<AdminConfigResponse> {
    const currentVersion = config.currentVersionId
      ? await manager.findOne(HomeConfigVersion, { where: { id: config.currentVersionId } })
      : null;
    const draft = await this.findDraftVersion(manager, config.id);

    return {
      id: config.id,
      configName: config.configName,
      status: config.status,
      currentVersionId: config.currentVersionId,
      currentVersion: currentVersion ? this.toVersionSummary(currentVersion) : null,
      draftVersion: draft ? this.toDraftVersionDetail(draft) : null,
      updatedAt: config.updatedAt,
    };
  }

  private async findSingletonOrNull(): Promise<HomeConfig | null> {
    return this.configRepo.findOne({ where: { configName: DEFAULT_HOME_CONFIG_NAME } });
  }

  private async findSingletonInTx(manager: EntityManager): Promise<HomeConfig | null> {
    return manager.findOne(HomeConfig, { where: { configName: DEFAULT_HOME_CONFIG_NAME } });
  }

  private async assertNoPendingVersion(manager: EntityManager, homeConfigId: string): Promise<void> {
    const pending = await manager.findOne(HomeConfigVersion, {
      where: { homeConfigId, status: 'pending' },
    });
    if (pending) {
      throw new ConflictException('存在待审核版本，无法创建或编辑草稿');
    }
  }

  private async findDraftVersion(
    manager: EntityManager,
    homeConfigId: string,
  ): Promise<HomeConfigVersion | null> {
    const drafts = await manager.find(HomeConfigVersion, {
      where: { homeConfigId, status: 'draft' },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    return drafts[0] ?? null;
  }

  private async createSingletonWithDraft(
    manager: EntityManager,
    dto: UpdateHomeConfigDto,
    userId: string,
  ): Promise<HomeConfig> {
    const existing = await this.findSingletonInTx(manager);
    if (existing) {
      throw new ConflictException('首页配置已存在');
    }

    const config = manager.create(HomeConfig, {
      configName: DEFAULT_HOME_CONFIG_NAME,
      status: 'draft',
      currentVersionId: null,
      createdBy: userId,
      updatedBy: userId,
    });
    await manager.save(HomeConfig, config);

    const version = manager.create(HomeConfigVersion, {
      homeConfigId: config.id,
      versionNo: 1,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      topBannerJson: this.serializeJson(dto.topBannerJson),
      themeJson: this.serializeJson(dto.themeJson),
      status: 'draft',
      changeRemark: dto.changeRemark ?? null,
      createdBy: userId,
    });
    await manager.save(HomeConfigVersion, version);
    return config;
  }

  private async findLatestCopySourceVersion(
    manager: EntityManager,
    homeConfigId: string,
  ): Promise<HomeConfigVersion | null> {
    const versions = await manager.find(HomeConfigVersion, {
      where: { homeConfigId },
      order: { versionNo: 'DESC' },
    });
    const candidates = versions.filter(
      (v) => v.status === 'published' || v.status === 'withdrawn',
    );
    if (candidates.length === 0) {
      return null;
    }

    for (const version of candidates) {
      const moduleCount = await manager.count(HomeModule, {
        where: { homeConfigVersionId: version.id },
      });
      if (moduleCount > 0) {
        return version;
      }
    }

    return candidates[0];
  }

  private async createDraftFromContext(
    manager: EntityManager,
    config: HomeConfig,
    userId: string,
  ): Promise<HomeConfigVersion> {
    const nextVersionNo = await this.getNextVersionNo(manager, config.id);

    let source: HomeConfigVersion | null = null;
    if (config.currentVersionId) {
      source = await manager.findOne(HomeConfigVersion, {
        where: { id: config.currentVersionId },
      });
      if (!source) {
        throw new NotFoundException('当前生效版本不存在');
      }
    } else {
      source = await this.findLatestCopySourceVersion(manager, config.id);
    }

    if (source) {
      return this.copyVersionWithModules(manager, source, nextVersionNo, userId);
    }

    const version = manager.create(HomeConfigVersion, {
      homeConfigId: config.id,
      versionNo: nextVersionNo,
      title: '',
      subtitle: null,
      topBannerJson: null,
      themeJson: null,
      status: 'draft',
      changeRemark: null,
      createdBy: userId,
    });
    await manager.save(HomeConfigVersion, version);
    return version;
  }

  private async copyVersionWithModules(
    manager: EntityManager,
    source: HomeConfigVersion,
    versionNo: number,
    userId: string,
  ): Promise<HomeConfigVersion> {
    const newVersion = manager.create(HomeConfigVersion, {
      homeConfigId: source.homeConfigId,
      versionNo,
      title: source.title,
      subtitle: source.subtitle,
      topBannerJson: source.topBannerJson,
      themeJson: source.themeJson,
      status: 'draft',
      changeRemark: source.changeRemark,
      createdBy: userId,
    });
    await manager.save(HomeConfigVersion, newVersion);

    const modules = await manager.find(HomeModule, {
      where: { homeConfigVersionId: source.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    for (const mod of modules) {
      const copy = manager.create(HomeModule, {
        homeConfigVersionId: newVersion.id,
        moduleCode: mod.moduleCode,
        moduleName: mod.moduleName,
        moduleType: mod.moduleType,
        icon: mod.icon,
        color: mod.color,
        layoutType: mod.layoutType,
        isVisible: mod.isVisible,
        sortOrder: mod.sortOrder,
        targetType: mod.targetType,
        targetValue: mod.targetValue,
      });
      await manager.save(HomeModule, copy);
    }
    return newVersion;
  }

  private async getNextVersionNo(manager: EntityManager, homeConfigId: string): Promise<number> {
    const rows = await manager.find(HomeConfigVersion, {
      where: { homeConfigId },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    return (rows[0]?.versionNo ?? 0) + 1;
  }

  private applyVersionFields(
    version: HomeConfigVersion,
    dto: UpdateHomeConfigDto,
    userId: string,
  ): void {
    if (version.status !== 'draft') {
      throw new ConflictException('仅 draft 版本允许编辑正文');
    }
    version.title = dto.title;
    version.subtitle = dto.subtitle ?? null;
    version.topBannerJson = this.serializeJson(dto.topBannerJson);
    version.themeJson = this.serializeJson(dto.themeJson);
    version.changeRemark = dto.changeRemark ?? null;
    version.createdBy = version.createdBy ?? userId;
  }

  private async requireEditableDraft(manager: EntityManager): Promise<HomeConfigVersion> {
    const config = await this.findSingletonInTx(manager);
    if (!config) {
      throw new ConflictException('首页配置尚未初始化，请先保存基础配置');
    }
    await this.assertNoPendingVersion(manager, config.id);

    const draft = await this.findDraftVersion(manager, config.id);
    if (!draft) {
      throw new ConflictException('当前没有可编辑的草稿版本');
    }
    return draft;
  }

  private async findModuleInDraftOrFail(
    manager: EntityManager,
    draftVersionId: string,
    moduleId: string,
  ): Promise<HomeModule> {
    const module = await manager.findOne(HomeModule, { where: { id: moduleId } });
    if (!module || module.homeConfigVersionId !== draftVersionId) {
      throw new NotFoundException(`模块 ${moduleId} 不存在或不属于当前草稿版本`);
    }
    return module;
  }

  private async assertModuleCodeUnique(
    manager: EntityManager,
    draftVersionId: string,
    moduleCode: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = moduleCode.trim();
    const modules = await manager.find(HomeModule, {
      where: { homeConfigVersionId: draftVersionId },
    });
    const duplicate = modules.find(
      (m) => m.moduleCode === normalized && m.id !== excludeId,
    );
    if (duplicate) {
      throw new ConflictException(`模块编码 "${normalized}" 在当前草稿版本中已存在`);
    }
  }

  private toVersionSummary(version: HomeConfigVersion): VersionSummary {
    return {
      id: version.id,
      versionNo: version.versionNo,
      title: version.title,
      subtitle: version.subtitle,
      status: version.status,
    };
  }

  private toDraftVersionDetail(version: HomeConfigVersion): DraftVersionDetail {
    return {
      ...this.toVersionSummary(version),
      topBannerJson: this.parseJson(version.topBannerJson),
      themeJson: this.parseJson(version.themeJson),
      changeRemark: version.changeRemark,
    };
  }

  private toModuleListItem(module: HomeModule): HomeModuleListItem {
    return {
      id: module.id,
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      moduleType: module.moduleType,
      icon: module.icon,
      color: module.color,
      layoutType: module.layoutType,
      isVisible: module.isVisible === 1,
      sortOrder: module.sortOrder,
      targetType: module.targetType,
      targetValue: module.targetValue,
    };
  }

  private toIsVisibleSmallint(value: boolean | undefined, defaultVisible = true): number {
    if (value === undefined) {
      return defaultVisible ? 1 : 0;
    }
    return value ? 1 : 0;
  }

  private serializeJson(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  }

  private parseJson(value: string | null): unknown {
    if (!value) return null;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
}
