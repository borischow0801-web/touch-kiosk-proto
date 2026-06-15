import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CreateThemeMappingDto } from '../../guide-config/dto/create-theme-mapping.dto';
import { ThemeMappingListQueryDto } from '../../guide-config/dto/theme-mapping-list-query.dto';
import { UpdateThemeMappingDto } from '../../guide-config/dto/update-theme-mapping.dto';
import { ThemeMappingService } from '../../guide-config/theme-mapping.service';

@Controller('admin/guide/themes')
export class GuideThemesController {
  constructor(private readonly themeMappingService: ThemeMappingService) {}

  @Get()
  @RequirePermissions('guide:theme:read')
  list(@Query() query: ThemeMappingListQueryDto) {
    return this.themeMappingService.list(query);
  }

  @Post()
  @RequirePermissions('guide:theme:create')
  create(@Body() dto: CreateThemeMappingDto) {
    return this.themeMappingService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('guide:theme:update')
  update(@Param('id') id: string, @Body() dto: UpdateThemeMappingDto) {
    return this.themeMappingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('guide:theme:delete')
  remove(@Param('id') id: string) {
    return this.themeMappingService.remove(id);
  }
}
