import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/dto/auth-response.dto';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { ItemsService } from '../../content/items.service';
import { RelationsService } from '../../content/relations.service';
import { ItemListQueryDto } from '../../content/dto/item-list-query.dto';
import { CreateItemDto } from '../../content/dto/create-item.dto';
import { UpdateItemDto } from '../../content/dto/update-item.dto';
import { ReplaceRelationsDto } from '../../content/dto/replace-relations.dto';

@Controller('admin/content')
export class ContentItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly relationsService: RelationsService,
  ) {}

  @Get('items')
  @RequirePermissions('content:item:read')
  list(@Query() query: ItemListQueryDto) {
    return this.itemsService.list(query);
  }

  @Post('items')
  @RequirePermissions('content:item:create')
  create(
    @Body() dto: CreateItemDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.itemsService.create(dto, user.id);
  }

  @Get('items/:id')
  @RequirePermissions('content:item:read')
  getById(@Param('id') id: string) {
    return this.itemsService.getById(id);
  }

  @Put('items/:id')
  @RequirePermissions('content:item:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.itemsService.update(id, dto, user.id);
  }

  @Delete('items/:id')
  @HttpCode(200)
  @RequirePermissions('content:item:delete')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }

  @Get('items/:id/versions')
  @RequirePermissions('content:version:read')
  listVersions(@Param('id') id: string) {
    return this.itemsService.listVersions(id);
  }

  @Get('versions/:versionId')
  @RequirePermissions('content:version:read')
  getVersion(@Param('versionId') versionId: string) {
    return this.itemsService.getVersionById(versionId);
  }

  @Get('items/:id/relations')
  @RequirePermissions('content:relation:read')
  listRelations(@Param('id') id: string) {
    return this.relationsService.list(id);
  }

  @Put('items/:id/relations')
  @RequirePermissions('content:relation:update')
  replaceRelations(@Param('id') id: string, @Body() dto: ReplaceRelationsDto) {
    return this.relationsService.replace(id, dto);
  }
}
