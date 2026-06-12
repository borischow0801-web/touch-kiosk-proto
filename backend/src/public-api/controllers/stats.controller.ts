import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { StatsService } from '../../stats/stats.service';
import { ClickEventDto } from '../../stats/dto/click-event.dto';
import { PageViewDto } from '../../stats/dto/page-view.dto';
import { ServiceGuideService } from '../../service-guide/service-guide.service';
import { Public } from '../../auth/decorators/public.decorator';

// Fixed whitelist for home-page module identifiers
const MODULE_CLICK_CODES = new Set([
  'service-guide',
  'navigation',
  'notice',
  'policy',
  'showcase',
  'faq',
  'hot-items',
  'help',
]);

// Fixed whitelist for bottom nav bar actions (首页/返回/重来/帮助)
const NAV_CLICK_CODES = new Set(['home', 'back', 'reset', 'help']);

// All static kiosk routes
const STATIC_PAGE_PATHS = new Set([
  '/home',
  '/depts',
  '/topics',
  '/item-types',
  '/items',
  '/help',
]);

// Dynamic item detail route — only safe identifier chars allowed
const ITEM_DETAIL_RE = /^\/items\/([a-zA-Z0-9\-_]{1,60})$/;

@Public()
@Controller('public/stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly guideService: ServiceGuideService,
  ) {}

  @Post('click')
  @HttpCode(200)
  recordClick(@Body() dto: ClickEventDto): { ok: true } {
    this.validateClick(dto);
    this.statsService.recordClick(dto);
    return { ok: true };
  }

  @Post('page-view')
  @HttpCode(200)
  recordPageView(@Body() dto: PageViewDto): { ok: true } {
    this.validatePagePath(dto.path);
    this.statsService.recordPageView(dto);
    return { ok: true };
  }

  private validateClick(dto: ClickEventDto): void {
    const { type, id } = dto;
    if (!id) {
      throw new BadRequestException('click 事件必须提供 id');
    }
    switch (type) {
      case 'item_view':
      case 'hot_item_click':
        if (!this.guideService.existsItemId(id)) {
          throw new BadRequestException('id 对应的事项不存在');
        }
        break;
      case 'dept_click':
        if (!this.guideService.existsDeptCode(id)) {
          throw new BadRequestException('id 对应的部门不存在');
        }
        break;
      case 'theme_click':
        if (!this.guideService.existsThemeCode(id)) {
          throw new BadRequestException('id 对应的主题不存在');
        }
        break;
      case 'type_click':
        if (!this.guideService.existsItemTypeCode(id)) {
          throw new BadRequestException('id 对应的事项类型不存在');
        }
        break;
      case 'module_click':
        if (!MODULE_CLICK_CODES.has(id)) {
          throw new BadRequestException('id 不在模块白名单内');
        }
        break;
      case 'nav_click':
        if (!NAV_CLICK_CODES.has(id)) {
          throw new BadRequestException('id 不在导航白名单内');
        }
        break;
      default:
        throw new BadRequestException('未知 click type');
    }
  }

  private validatePagePath(path: string): void {
    if (STATIC_PAGE_PATHS.has(path)) return;

    const match = ITEM_DETAIL_RE.exec(path);
    if (match) {
      const itemId = match[1];
      if (!this.guideService.existsItemId(itemId)) {
        throw new BadRequestException('path 中的事项 id 不存在');
      }
      return;
    }

    throw new BadRequestException('path 不在允许的页面路径白名单内');
  }
}
