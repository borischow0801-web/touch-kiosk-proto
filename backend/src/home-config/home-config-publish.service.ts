import {
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
import { PublishRecord } from '../database/entities/publish-record.entity';
import {
  ITEM_STATUSES,
  PUBLISH_ACTIONS,
  VERSION_STATUSES,
} from '../publish/constants/publish.constants';
import {
  PublishActionResult,
  PublishRecordItem,
} from '../publish/content-publish.service';

@Injectable()
export class HomeConfigPublishService {
  private readonly logger = new Logger(HomeConfigPublishService.name);

  constructor(
    @InjectRepository(HomeConfig)
    private readonly configRepo: Repository<HomeConfig>,
    @InjectRepository(HomeConfigVersion)
    private readonly versionRepo: Repository<HomeConfigVersion>,
    @InjectRepository(PublishRecord)
    private readonly recordRepo: Repository<PublishRecord>,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    homeConfigId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);
      const version = await this.resolveVersionForSubmit(manager, homeConfigId, versionId);

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.PENDING;
      await manager.save(HomeConfigVersion, version);

      if (
        !config.currentVersionId &&
        (config.status === ITEM_STATUSES.DRAFT || config.status === ITEM_STATUSES.REJECTED)
      ) {
        config.status = ITEM_STATUSES.PENDING;
        config.updatedBy = operatorId;
        await manager.save(HomeConfig, config);
      }

      await this.writeRecord(manager, {
        bizType: 'home_config',
        bizId: homeConfigId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.SUBMIT,
        fromStatus: versionFrom,
        toStatus: VERSION_STATUSES.PENDING,
        comment,
        operatorId,
      });

      return this.toResult(config, version);
    });
  }

  async approve(
    homeConfigId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);
      const version = await this.resolveVersionForReview(manager, homeConfigId, versionId);

      if (version.status !== VERSION_STATUSES.PENDING) {
        throw new ConflictException('仅 pending 状态的版本可审核通过');
      }

      return this.applyPublish(manager, config, version, operatorId, PUBLISH_ACTIONS.APPROVE, comment);
    });
  }

  async reject(
    homeConfigId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);
      const version = await this.resolveVersionForReview(manager, homeConfigId, versionId);

      if (version.status !== VERSION_STATUSES.PENDING) {
        throw new ConflictException('仅 pending 状态的版本可驳回');
      }

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.REJECTED;
      await manager.save(HomeConfigVersion, version);

      if (!config.currentVersionId && config.status !== ITEM_STATUSES.WITHDRAWN) {
        config.status = ITEM_STATUSES.REJECTED;
        config.updatedBy = operatorId;
        await manager.save(HomeConfig, config);
      }

      await this.writeRecord(manager, {
        bizType: 'home_config',
        bizId: homeConfigId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.REJECT,
        fromStatus: versionFrom,
        toStatus: VERSION_STATUSES.REJECTED,
        comment,
        operatorId,
      });

      return this.toResult(config, version);
    });
  }

  async directPublish(
    homeConfigId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);
      const version = await this.resolveVersionForSubmit(manager, homeConfigId, versionId);

      return this.applyPublish(
        manager,
        config,
        version,
        operatorId,
        PUBLISH_ACTIONS.DIRECT_PUBLISH,
        comment,
      );
    });
  }

  async withdraw(
    homeConfigId: string,
    operatorId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);

      if (config.status !== ITEM_STATUSES.PUBLISHED) {
        throw new ConflictException('仅 published 状态的首页配置可撤回');
      }
      if (!config.currentVersionId) {
        throw new ConflictException('当前首页配置无生效发布版本');
      }

      const version = await manager.findOne(HomeConfigVersion, {
        where: { id: config.currentVersionId, homeConfigId },
      });
      if (!version) {
        throw new NotFoundException('版本不存在');
      }

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.WITHDRAWN;
      await manager.save(HomeConfigVersion, version);

      const itemFrom = config.status;
      config.status = ITEM_STATUSES.WITHDRAWN;
      config.currentVersionId = null;
      config.updatedBy = operatorId;
      await manager.save(HomeConfig, config);

      await this.writeRecord(manager, {
        bizType: 'home_config',
        bizId: homeConfigId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.WITHDRAW,
        fromStatus: itemFrom,
        toStatus: ITEM_STATUSES.WITHDRAWN,
        comment,
        operatorId,
      });

      return this.toResult(config, version);
    });
  }

  async rollback(
    homeConfigId: string,
    operatorId: string,
    versionId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const config = await this.lockConfig(manager, homeConfigId);
      await this.assertNoDraftOrPending(manager, homeConfigId);

      const source = await manager.findOne(HomeConfigVersion, {
        where: { id: versionId, homeConfigId },
      });
      if (!source) {
        throw new NotFoundException('版本不存在');
      }

      const nextNo = await this.getNextVersionNo(manager, homeConfigId);
      const newVersion = await this.copyVersionWithModules(manager, source, nextNo, operatorId, comment);

      await this.writeRecord(manager, {
        bizType: 'home_config',
        bizId: homeConfigId,
        versionId: newVersion.id,
        action: PUBLISH_ACTIONS.ROLLBACK,
        fromStatus: source.status,
        toStatus: VERSION_STATUSES.DRAFT,
        comment,
        operatorId,
      });

      this.logger.log(
        `Home config rollback draft created: configId=${homeConfigId} fromVersion=${source.versionNo} newVersion=${nextNo}`,
      );
      return this.toResult(config, newVersion);
    });
  }

  async listRecords(homeConfigId: string): Promise<PublishRecordItem[]> {
    await this.findConfigOrFail(homeConfigId);
    const rows = await this.recordRepo.find({
      where: { bizType: 'home_config', bizId: homeConfigId },
      order: { operatedAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      bizType: r.bizType,
      bizId: r.bizId,
      versionId: r.versionId,
      action: r.action,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      comment: r.comment,
      operatorId: r.operatorId,
      operatedAt: r.operatedAt,
    }));
  }

  private async applyPublish(
    manager: EntityManager,
    config: HomeConfig,
    version: HomeConfigVersion,
    operatorId: string,
    action: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const versionFrom = version.status;
    version.status = VERSION_STATUSES.PUBLISHED;
    await manager.save(HomeConfigVersion, version);

    config.status = ITEM_STATUSES.PUBLISHED;
    config.currentVersionId = version.id;
    config.updatedBy = operatorId;
    await manager.save(HomeConfig, config);

    await this.writeRecord(manager, {
      bizType: 'home_config',
      bizId: config.id,
      versionId: version.id,
      action,
      fromStatus: versionFrom,
      toStatus: VERSION_STATUSES.PUBLISHED,
      comment,
      operatorId,
    });

    this.logger.log(`Home config published: id=${config.id} versionId=${version.id} action=${action}`);
    return this.toResult(config, version);
  }

  private async lockConfig(manager: EntityManager, homeConfigId: string): Promise<HomeConfig> {
    const config = await manager.findOne(HomeConfig, {
      where: { id: homeConfigId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!config) {
      throw new NotFoundException('首页配置不存在');
    }
    return config;
  }

  private async resolveVersionForSubmit(
    manager: EntityManager,
    homeConfigId: string,
    versionId?: string,
  ): Promise<HomeConfigVersion> {
    await this.assertNoPendingVersion(manager, homeConfigId);

    if (versionId) {
      const version = await manager.findOne(HomeConfigVersion, {
        where: { id: versionId, homeConfigId },
      });
      if (!version) throw new NotFoundException('版本不存在');
      if (version.status !== VERSION_STATUSES.DRAFT) {
        throw new ConflictException('仅 draft 状态的版本可提交或直接发布');
      }
      await this.assertIsLatestDraft(manager, homeConfigId, version);
      return version;
    }

    const latestDraft = await this.getLatestDraft(manager, homeConfigId);
    if (!latestDraft) {
      throw new ConflictException('没有可提交的 draft 版本');
    }
    return latestDraft;
  }

  private async resolveVersionForReview(
    manager: EntityManager,
    homeConfigId: string,
    versionId?: string,
  ): Promise<HomeConfigVersion> {
    const pendingList = await manager.find(HomeConfigVersion, {
      where: { homeConfigId, status: VERSION_STATUSES.PENDING },
      order: { versionNo: 'DESC' },
    });

    if (pendingList.length === 0) {
      throw new ConflictException('没有待审核的 pending 版本');
    }
    if (pendingList.length > 1) {
      throw new ConflictException('存在多个待审核版本，数据异常，无法审核');
    }

    const uniquePending = pendingList[0];
    if (!versionId) {
      return uniquePending;
    }

    const version = await manager.findOne(HomeConfigVersion, {
      where: { id: versionId, homeConfigId },
    });
    if (!version) {
      throw new NotFoundException('版本不存在');
    }
    if (version.id !== uniquePending.id) {
      throw new ConflictException('指定版本不是当前待审核版本');
    }
    return version;
  }

  private async getLatestDraft(
    manager: EntityManager,
    homeConfigId: string,
  ): Promise<HomeConfigVersion | null> {
    const drafts = await manager.find(HomeConfigVersion, {
      where: { homeConfigId, status: VERSION_STATUSES.DRAFT },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    return drafts[0] ?? null;
  }

  private async assertNoPendingVersion(
    manager: EntityManager,
    homeConfigId: string,
  ): Promise<void> {
    const pendingCount = await manager.count(HomeConfigVersion, {
      where: { homeConfigId, status: VERSION_STATUSES.PENDING },
    });
    if (pendingCount > 0) {
      throw new ConflictException('已存在待审核版本，无法提交或直接发布');
    }
  }

  private async assertNoDraftOrPending(
    manager: EntityManager,
    homeConfigId: string,
  ): Promise<void> {
    const draft = await this.getLatestDraft(manager, homeConfigId);
    if (draft) {
      throw new ConflictException('已存在 draft 版本，无法回滚');
    }
    await this.assertNoPendingVersion(manager, homeConfigId);
  }

  private async assertIsLatestDraft(
    manager: EntityManager,
    homeConfigId: string,
    version: HomeConfigVersion,
  ): Promise<void> {
    const latestDraft = await this.getLatestDraft(manager, homeConfigId);
    if (!latestDraft || latestDraft.id !== version.id) {
      throw new ConflictException('只能操作该配置最新的 draft 版本');
    }
  }

  private async getNextVersionNo(manager: EntityManager, homeConfigId: string): Promise<number> {
    const rows = await manager.find(HomeConfigVersion, {
      where: { homeConfigId },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    return (rows[0]?.versionNo ?? 0) + 1;
  }

  private async copyVersionWithModules(
    manager: EntityManager,
    source: HomeConfigVersion,
    versionNo: number,
    userId: string,
    comment?: string,
  ): Promise<HomeConfigVersion> {
    const newVersion = manager.create(HomeConfigVersion, {
      homeConfigId: source.homeConfigId,
      versionNo,
      title: source.title,
      subtitle: source.subtitle,
      topBannerJson: source.topBannerJson,
      themeJson: source.themeJson,
      status: VERSION_STATUSES.DRAFT,
      changeRemark: comment ?? `回滚自版本 ${source.versionNo}`,
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

  private async writeRecord(
    manager: EntityManager,
    data: {
      bizType: string;
      bizId: string;
      versionId: string;
      action: string;
      fromStatus: string;
      toStatus: string;
      comment?: string;
      operatorId: string;
    },
  ): Promise<void> {
    const record = manager.create(PublishRecord, {
      bizType: data.bizType,
      bizId: data.bizId,
      versionId: data.versionId,
      action: data.action,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      comment: data.comment ?? null,
      operatorId: data.operatorId,
      operatedAt: new Date(),
    });
    await manager.save(PublishRecord, record);
  }

  private async findConfigOrFail(id: string): Promise<HomeConfig> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('首页配置不存在');
    return config;
  }

  private toResult(config: HomeConfig, version: HomeConfigVersion): PublishActionResult {
    return {
      bizId: config.id,
      bizType: 'home_config',
      itemStatus: config.status,
      versionId: version.id,
      versionStatus: version.status,
      versionNo: version.versionNo,
      currentVersionId: config.currentVersionId ?? null,
      publishAt: null,
    };
  }
}
