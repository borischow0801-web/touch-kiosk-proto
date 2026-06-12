import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { PublishRecord } from '../database/entities/publish-record.entity';
import {
  ITEM_STATUSES,
  PUBLISH_ACTIONS,
  VERSION_STATUSES,
} from './constants/publish.constants';

export interface PublishActionResult {
  bizId: string;
  bizType: string;
  itemStatus: string;
  versionId: string;
  versionStatus: string;
  versionNo: number;
  currentVersionId: string | null;
  publishAt: Date | null;
}

export interface PublishRecordItem {
  id: string;
  bizType: string;
  bizId: string;
  versionId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  operatorId: string;
  operatedAt: Date;
}

@Injectable()
export class ContentPublishService {
  private readonly logger = new Logger(ContentPublishService.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,
    @InjectRepository(PublishRecord)
    private readonly recordRepo: Repository<PublishRecord>,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    contentId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);
      const version = await this.resolveVersionForSubmit(manager, contentId, versionId);

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.PENDING;
      await manager.save(ContentVersion, version);

      const itemFrom = item.status;
      if (item.status === ITEM_STATUSES.DRAFT || item.status === ITEM_STATUSES.REJECTED) {
        item.status = ITEM_STATUSES.PENDING;
        item.updatedBy = operatorId;
        await manager.save(ContentItem, item);
      }

      await this.writeRecord(manager, {
        bizType: 'content',
        bizId: contentId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.SUBMIT,
        fromStatus: versionFrom,
        toStatus: VERSION_STATUSES.PENDING,
        comment,
        operatorId,
      });

      return this.toResult(item, version);
    });
  }

  async approve(
    contentId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);
      const version = await this.resolveVersionForReview(manager, contentId, versionId);

      if (version.status !== VERSION_STATUSES.PENDING) {
        throw new ConflictException('仅 pending 状态的版本可审核通过');
      }

      return this.applyPublish(manager, item, version, operatorId, PUBLISH_ACTIONS.APPROVE, comment);
    });
  }

  async reject(
    contentId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);
      const version = await this.resolveVersionForReview(manager, contentId, versionId);

      if (version.status !== VERSION_STATUSES.PENDING) {
        throw new ConflictException('仅 pending 状态的版本可驳回');
      }

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.REJECTED;
      await manager.save(ContentVersion, version);

      const itemWasPending = item.status === ITEM_STATUSES.PENDING;
      if (itemWasPending) {
        item.status = ITEM_STATUSES.REJECTED;
        item.updatedBy = operatorId;
        await manager.save(ContentItem, item);
      }

      await this.writeRecord(manager, {
        bizType: 'content',
        bizId: contentId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.REJECT,
        fromStatus: versionFrom,
        toStatus: VERSION_STATUSES.REJECTED,
        comment,
        operatorId,
      });

      return this.toResult(item, version);
    });
  }

  async directPublish(
    contentId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);
      const version = await this.resolveVersionForSubmit(manager, contentId, versionId);

      return this.applyPublish(
        manager,
        item,
        version,
        operatorId,
        PUBLISH_ACTIONS.DIRECT_PUBLISH,
        comment,
      );
    });
  }

  async withdraw(
    contentId: string,
    operatorId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);

      if (item.status !== ITEM_STATUSES.PUBLISHED) {
        throw new ConflictException('仅 published 状态的内容可撤回');
      }
      if (!item.currentVersionId) {
        throw new ConflictException('当前内容无生效发布版本');
      }

      const version = await manager.findOne(ContentVersion, {
        where: { id: item.currentVersionId, contentId },
      });
      if (!version) {
        throw new NotFoundException('版本不存在');
      }

      const versionFrom = version.status;
      version.status = VERSION_STATUSES.WITHDRAWN;
      await manager.save(ContentVersion, version);

      const itemFrom = item.status;
      item.status = ITEM_STATUSES.WITHDRAWN;
      item.updatedBy = operatorId;
      await manager.save(ContentItem, item);

      await this.writeRecord(manager, {
        bizType: 'content',
        bizId: contentId,
        versionId: version.id,
        action: PUBLISH_ACTIONS.WITHDRAW,
        fromStatus: itemFrom,
        toStatus: ITEM_STATUSES.WITHDRAWN,
        comment,
        operatorId,
      });

      return this.toResult(item, version);
    });
  }

  async rollback(
    contentId: string,
    operatorId: string,
    versionId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const item = await this.lockItem(manager, contentId);
      const source = await manager.findOne(ContentVersion, {
        where: { id: versionId, contentId },
      });
      if (!source) {
        throw new NotFoundException('版本不存在');
      }

      const latestRows = await manager.find(ContentVersion, {
        where: { contentId },
        order: { versionNo: 'DESC' },
        take: 1,
      });
      const nextNo = (latestRows[0]?.versionNo ?? 0) + 1;

      const newVersion = manager.create(ContentVersion, {
        contentId,
        versionNo: nextNo,
        title: source.title,
        summary: source.summary,
        body: source.body,
        extraJson: source.extraJson,
        status: VERSION_STATUSES.DRAFT,
        changeRemark: comment ?? `回滚自版本 ${source.versionNo}`,
        createdBy: operatorId,
      });
      await manager.save(ContentVersion, newVersion);

      await this.writeRecord(manager, {
        bizType: 'content',
        bizId: contentId,
        versionId: newVersion.id,
        action: PUBLISH_ACTIONS.ROLLBACK,
        fromStatus: source.status,
        toStatus: VERSION_STATUSES.DRAFT,
        comment,
        operatorId,
      });

      this.logger.log(
        `Content rollback draft created: contentId=${contentId} fromVersion=${source.versionNo} newVersion=${nextNo}`,
      );
      return this.toResult(item, newVersion);
    });
  }

  async listRecords(contentId: string): Promise<PublishRecordItem[]> {
    await this.findItemOrFail(contentId);
    const rows = await this.recordRepo.find({
      where: { bizType: 'content', bizId: contentId },
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
    item: ContentItem,
    version: ContentVersion,
    operatorId: string,
    action: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const versionFrom = version.status;
    version.status = VERSION_STATUSES.PUBLISHED;
    await manager.save(ContentVersion, version);

    item.status = ITEM_STATUSES.PUBLISHED;
    item.currentVersionId = version.id;
    item.title = version.title;
    item.summary = version.summary;
    item.publishAt = new Date();
    item.updatedBy = operatorId;
    await manager.save(ContentItem, item);

    await this.writeRecord(manager, {
      bizType: 'content',
      bizId: item.id,
      versionId: version.id,
      action,
      fromStatus: versionFrom,
      toStatus: VERSION_STATUSES.PUBLISHED,
      comment,
      operatorId,
    });

    this.logger.log(`Content published: id=${item.id} versionId=${version.id} action=${action}`);
    return this.toResult(item, version);
  }

  private async lockItem(manager: EntityManager, contentId: string): Promise<ContentItem> {
    const item = await manager.findOne(ContentItem, {
      where: { id: contentId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!item) {
      throw new NotFoundException('内容不存在');
    }
    return item;
  }

  private async resolveVersionForSubmit(
    manager: EntityManager,
    contentId: string,
    versionId?: string,
  ): Promise<ContentVersion> {
    await this.assertNoPendingVersion(manager, contentId);

    if (versionId) {
      const version = await manager.findOne(ContentVersion, {
        where: { id: versionId, contentId },
      });
      if (!version) throw new NotFoundException('版本不存在');
      if (version.status !== VERSION_STATUSES.DRAFT) {
        throw new ConflictException('仅 draft 状态的版本可提交或直接发布');
      }
      await this.assertIsLatestDraft(manager, contentId, version);
      return version;
    }

    const latestDraft = await this.getLatestDraft(manager, contentId);
    if (!latestDraft) {
      throw new ConflictException('没有可提交的 draft 版本');
    }
    return latestDraft;
  }

  private async resolveVersionForReview(
    manager: EntityManager,
    contentId: string,
    versionId?: string,
  ): Promise<ContentVersion> {
    const pendingList = await manager.find(ContentVersion, {
      where: { contentId, status: VERSION_STATUSES.PENDING },
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

    const version = await manager.findOne(ContentVersion, {
      where: { id: versionId, contentId },
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
    contentId: string,
  ): Promise<ContentVersion | null> {
    const drafts = await manager.find(ContentVersion, {
      where: { contentId, status: VERSION_STATUSES.DRAFT },
      order: { versionNo: 'DESC' },
      take: 1,
    });
    return drafts[0] ?? null;
  }

  private async assertNoPendingVersion(
    manager: EntityManager,
    contentId: string,
  ): Promise<void> {
    const pendingCount = await manager.count(ContentVersion, {
      where: { contentId, status: VERSION_STATUSES.PENDING },
    });
    if (pendingCount > 0) {
      throw new ConflictException('已存在待审核版本，无法提交或直接发布');
    }
  }

  private async assertIsLatestDraft(
    manager: EntityManager,
    contentId: string,
    version: ContentVersion,
  ): Promise<void> {
    const latestDraft = await this.getLatestDraft(manager, contentId);
    if (!latestDraft || latestDraft.id !== version.id) {
      throw new ConflictException('只能操作该内容最新的 draft 版本');
    }
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

  private async findItemOrFail(id: string): Promise<ContentItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('内容不存在');
    return item;
  }

  private toResult(item: ContentItem, version: ContentVersion): PublishActionResult {
    return {
      bizId: item.id,
      bizType: 'content',
      itemStatus: item.status,
      versionId: version.id,
      versionStatus: version.status,
      versionNo: version.versionNo,
      currentVersionId: item.currentVersionId ?? null,
      publishAt: item.publishAt,
    };
  }
}
