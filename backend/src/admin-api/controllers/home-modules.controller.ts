import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { HomeConfigService } from '../../home-config/home-config.service';
import { CreateHomeModuleDto } from '../../home-config/dto/create-home-module.dto';
import { UpdateHomeModuleDto } from '../../home-config/dto/update-home-module.dto';
import { SortHomeModulesDto } from '../../home-config/dto/sort-home-modules.dto';

@Controller('admin/home/modules')
export class HomeModulesController {
  constructor(private readonly homeConfigService: HomeConfigService) {}

  @Get()
  @RequirePermissions('home:module:read')
  list() {
    return this.homeConfigService.listModules();
  }

  @Post()
  @RequirePermissions('home:module:create')
  create(@Body() dto: CreateHomeModuleDto) {
    return this.homeConfigService.createModule(dto);
  }

  @Put('sort')
  @RequirePermissions('home:module:sort')
  sort(@Body() dto: SortHomeModulesDto) {
    return this.homeConfigService.sortModules(dto);
  }

  @Put(':id')
  @RequirePermissions('home:module:update')
  update(@Param('id') id: string, @Body() dto: UpdateHomeModuleDto) {
    return this.homeConfigService.updateModule(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('home:module:delete')
  remove(@Param('id') id: string) {
    return this.homeConfigService.removeModule(id);
  }
}
