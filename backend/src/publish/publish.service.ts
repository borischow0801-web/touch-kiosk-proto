import { BadRequestException, Injectable } from '@nestjs/common';
import { HomeConfigPublishService } from '../home-config/home-config-publish.service';
import { ContentPublishService, PublishActionResult, PublishRecordItem } from './content-publish.service';
import { SUPPORTED_BIZ_TYPES, SupportedBizType } from './constants/publish.constants';

@Injectable()
export class PublishService {
  constructor(
    private readonly contentPublish: ContentPublishService,
    private readonly homeConfigPublish: HomeConfigPublishService,
  ) {}

  private assertBizType(bizType: string): SupportedBizType {
    if (!SUPPORTED_BIZ_TYPES.has(bizType as SupportedBizType)) {
      throw new BadRequestException(`不支持的 bizType: "${bizType}"`);
    }
    return bizType as SupportedBizType;
  }

  async submit(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.submit(bizId, operatorId, versionId, comment);
    }
    return this.contentPublish.submit(bizId, operatorId, versionId, comment);
  }

  async approve(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.approve(bizId, operatorId, versionId, comment);
    }
    return this.contentPublish.approve(bizId, operatorId, versionId, comment);
  }

  async reject(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.reject(bizId, operatorId, versionId, comment);
    }
    return this.contentPublish.reject(bizId, operatorId, versionId, comment);
  }

  async directPublish(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId?: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.directPublish(bizId, operatorId, versionId, comment);
    }
    return this.contentPublish.directPublish(bizId, operatorId, versionId, comment);
  }

  async withdraw(
    bizType: string,
    bizId: string,
    operatorId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.withdraw(bizId, operatorId, comment);
    }
    return this.contentPublish.withdraw(bizId, operatorId, comment);
  }

  async rollback(
    bizType: string,
    bizId: string,
    operatorId: string,
    versionId: string,
    comment?: string,
  ): Promise<PublishActionResult> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.rollback(bizId, operatorId, versionId, comment);
    }
    return this.contentPublish.rollback(bizId, operatorId, versionId, comment);
  }

  async listRecords(bizType: string, bizId: string): Promise<PublishRecordItem[]> {
    const type = this.assertBizType(bizType);
    if (type === 'home_config') {
      return this.homeConfigPublish.listRecords(bizId);
    }
    return this.contentPublish.listRecords(bizId);
  }
}
