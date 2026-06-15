import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CreateItemConfigDto } from '../../guide-config/dto/create-item-config.dto';
import { ItemConfigListQueryDto } from '../../guide-config/dto/item-config-list-query.dto';
import { UpdateItemConfigDto } from '../../guide-config/dto/update-item-config.dto';
import { ItemConfigService } from '../../guide-config/item-config.service';

@Controller('admin/guide/item-configs')
export class GuideItemConfigsController {
  constructor(private readonly itemConfigService: ItemConfigService) {}

  @Get()
  @RequirePermissions('guide:item:read')
  list(@Query() query: ItemConfigListQueryDto) {
    return this.itemConfigService.list(query);
  }

  @Post()
  @RequirePermissions('guide:item:create')
  create(@Body() dto: CreateItemConfigDto) {
    return this.itemConfigService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('guide:item:update')
  update(@Param('id') id: string, @Body() dto: UpdateItemConfigDto) {
    return this.itemConfigService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('guide:item:delete')
  remove(@Param('id') id: string) {
    return this.itemConfigService.remove(id);
  }
}
