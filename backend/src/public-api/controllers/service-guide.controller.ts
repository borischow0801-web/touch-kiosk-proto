import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceGuideService } from '../../service-guide/service-guide.service';
import { ItemsQueryDto } from '../../service-guide/dto/items-query.dto';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('public/service-guide')
export class ServiceGuideController {
  constructor(private readonly service: ServiceGuideService) {}

  @Get('depts')
  getDepts(@Query('hot') hot?: string) {
    return this.service.getDepts(hot);
  }

  @Get('depts/:deptCode/item-types')
  getDeptItemTypes(@Param('deptCode') deptCode: string) {
    return this.service.getItemTypes(deptCode, 'dept');
  }

  @Get('themes')
  getThemes(@Query('hot') hot?: string) {
    return this.service.getThemes(hot);
  }

  @Get('themes/:themeCode/item-types')
  getThemeItemTypes(@Param('themeCode') themeCode: string) {
    return this.service.getItemTypes(themeCode, 'theme');
  }

  @Get('items')
  getItems(@Query() query: ItemsQueryDto) {
    return this.service.getItems(query);
  }

  @Get('items/:itemId')
  getItemDetail(@Param('itemId') itemId: string) {
    return this.service.getItemDetail(itemId);
  }
}
