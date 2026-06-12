import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CategoriesService } from '../../content/categories.service';
import { CategoryListQueryDto } from '../../content/dto/category-list-query.dto';
import { CreateCategoryDto } from '../../content/dto/create-category.dto';
import { UpdateCategoryDto } from '../../content/dto/update-category.dto';

@Controller('admin/content/categories')
export class ContentCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('content:category:read')
  list(@Query() query: CategoryListQueryDto) {
    return this.categoriesService.list(query);
  }

  @Post()
  @RequirePermissions('content:category:create')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('content:category:update')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('content:category:delete')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
