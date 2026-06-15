import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ServiceGuideService } from '../../service-guide/service-guide.service';
import { ItemsQueryDto } from '../../service-guide/dto/items-query.dto';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('public/service-guide')
export class ServiceGuideController {
  constructor(private readonly service: ServiceGuideService) {}

  @Get('depts')
  getDepts(@Query('hot') hot?: string, @Req() req?: Request & { requestId?: string }) {
    return this.service.getDepts(hot, req?.requestId);
  }

  @Get('depts/:deptCode/item-types')
  getDeptItemTypes(
    @Param('deptCode') deptCode: string,
    @Req() req?: Request & { requestId?: string },
  ) {
    return this.service.getItemTypes(deptCode, 'dept', req?.requestId);
  }

  @Get('themes')
  getThemes(@Query('hot') hot?: string, @Req() req?: Request & { requestId?: string }) {
    return this.service.getThemes(hot, req?.requestId);
  }

  @Get('themes/:themeCode/item-types')
  getThemeItemTypes(
    @Param('themeCode') themeCode: string,
    @Req() req?: Request & { requestId?: string },
  ) {
    return this.service.getItemTypes(themeCode, 'theme', req?.requestId);
  }

  @Get('items')
  getItems(@Query() query: ItemsQueryDto, @Req() req?: Request & { requestId?: string }) {
    return this.service.getItems(query, req?.requestId);
  }

  @Get('items/:itemId')
  getItemDetail(@Param('itemId') itemId: string, @Req() req?: Request & { requestId?: string }) {
    return this.service.getItemDetail(itemId, req?.requestId);
  }
}
