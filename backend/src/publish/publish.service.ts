import { BadRequestException, Injectable } from '@nestjs/common';
import { ContentPublishService, PublishActionResult, PublishRecordItem } from './content-publish.service';
import { SUPPORTED_BIZ_TYPES } from './constants/publish.constants';

@Injectable()
export class PublishService {
  constructor(private readonly contentPublish: ContentPublishService) {}

  private assertBizType(bizType: string): void {
    if (!SUPPORTED_BIZ_TYPES.has(bizType as 'content')) {
      throw new BadRequestException(`不支持的 bizType: "${bizType}"，本阶段仅支持 content`);
    }
  }

  async submit(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.submit(bizId, operatorId, versionId, comment);
  }

  async approve(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.approve(bizId, operatorId, versionId, comment);
  }

  async reject(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.reject(bizId, operatorId, versionId, comment);
  }

  async directPublish(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.directPublish(bizId, operatorId, versionId, comment);
  }

  async withdraw(
    bizType: string,
    bizId: string,
    operatorId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.withdraw(bizId, operatorId, comment);
  }

  async rollback(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    this.assertBizType(bizType);
    return this.contentPublish.rollback(bizId, operatorId, versionId, comment);
  }

  async listRecords(bizType: string, bizId: string): Promise<PublishRecordItem[]> {
    this.assertBizType(bizType);
    return this.contentPublish.listRecords(bizId);
  }
}
