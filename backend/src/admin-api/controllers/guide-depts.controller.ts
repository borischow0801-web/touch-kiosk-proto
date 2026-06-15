import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { DeptMappingService } from '../../guide-config/dept-mapping.service';
import { CreateDeptMappingDto } from '../../guide-config/dto/create-dept-mapping.dto';
import { DeptMappingListQueryDto } from '../../guide-config/dto/dept-mapping-list-query.dto';
import { UpdateDeptMappingDto } from '../../guide-config/dto/update-dept-mapping.dto';

@Controller('admin/guide/depts')
export class GuideDeptsController {
  constructor(private readonly deptMappingService: DeptMappingService) {}

  @Get()
  @RequirePermissions('guide:dept:read')
  list(@Query() query: DeptMappingListQueryDto) {
    return this.deptMappingService.list(query);
  }

  @Post()
  @RequirePermissions('guide:dept:create')
  create(@Body() dto: CreateDeptMappingDto) {
    return this.deptMappingService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('guide:dept:update')
  update(@Param('id') id: string, @Body() dto: UpdateDeptMappingDto) {
    return this.deptMappingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('guide:dept:delete')
  remove(@Param('id') id: string) {
    return this.deptMappingService.remove(id);
  }
}
