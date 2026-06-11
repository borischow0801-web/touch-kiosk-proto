import { Injectable, Logger } from '@nestjs/common';
import type { ClickEventDto } from './dto/click-event.dto';
import type { PageViewDto } from './dto/page-view.dto';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  recordClick(dto: ClickEventDto): void {
    this.logger.log(
      { event: 'click', type: dto.type, id: dto.id ?? null },
      'stats',
    );
  }

  recordPageView(dto: PageViewDto): void {
    this.logger.log({ event: 'page_view', path: dto.path }, 'stats');
  }
}
