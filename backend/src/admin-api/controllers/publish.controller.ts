import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/dto/auth-response.dto';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PublishService } from '../../publish/publish.service';
import { PublishActionDto } from '../../publish/dto/publish-action.dto';
import { PublishCommentDto } from '../../publish/dto/publish-comment.dto';
import { RollbackDto } from '../../publish/dto/rollback.dto';

@Controller('admin/publish')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Post(':bizType/:bizId/submit')
  @HttpCode(200)
  @RequirePermissions('publish:submit')
  submit(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: PublishActionDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.submit(bizType, bizId, user.id, dto.versionId, dto.comment);
  }

  @Post(':bizType/:bizId/approve')
  @HttpCode(200)
  @RequirePermissions('publish:approve')
  approve(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: PublishActionDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.approve(bizType, bizId, user.id, dto.versionId, dto.comment);
  }

  @Post(':bizType/:bizId/reject')
  @HttpCode(200)
  @RequirePermissions('publish:reject')
  reject(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: PublishActionDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.reject(bizType, bizId, user.id, dto.versionId, dto.comment);
  }

  @Post(':bizType/:bizId/direct-publish')
  @HttpCode(200)
  @RequirePermissions('publish:direct-publish')
  directPublish(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: PublishActionDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.directPublish(bizType, bizId, user.id, dto.versionId, dto.comment);
  }

  @Post(':bizType/:bizId/withdraw')
  @HttpCode(200)
  @RequirePermissions('publish:withdraw')
  withdraw(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: PublishCommentDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.withdraw(bizType, bizId, user.id, dto.comment);
  }

  @Post(':bizType/:bizId/rollback')
  @HttpCode(200)
  @RequirePermissions('publish:rollback')
  rollback(
    @Param('bizType') bizType: string,
    @Param('bizId') bizId: string,
    @Body() dto: RollbackDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.publishService.rollback(bizType, bizId, user.id, dto.versionId, dto.comment);
  }

  @Get(':bizType/:bizId/records')
  @RequirePermissions('publish:record:read')
  listRecords(@Param('bizType') bizType: string, @Param('bizId') bizId: string) {
    return this.publishService.listRecords(bizType, bizId);
  }
}
