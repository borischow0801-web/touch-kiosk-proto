import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { getPublicContentRouteOrFail } from '../../content/constants/public-content-routes';
import { PublicContentListQueryDto } from '../../content/dto/public-content-list-query.dto';
import { PublicContentService } from '../../content/public-content.service';

@Public()
@Controller('public/content')
export class PublicContentController {
  constructor(private readonly publicContentService: PublicContentService) {}

  @Get('policies')
  listPolicies(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('policies', query);
  }

  @Get('policies/:id')
  getPolicy(@Param('id') id: string) {
    return this.detailForSegment('policies', id);
  }

  @Get('interpretations')
  listInterpretations(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('interpretations', query);
  }

  @Get('interpretations/:id')
  getInterpretation(@Param('id') id: string) {
    return this.detailForSegment('interpretations', id);
  }

  @Get('open-guide')
  listOpenGuide(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('open-guide', query);
  }

  @Get('open-system')
  listOpenSystem(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('open-system', query);
  }

  @Get('open-catalog')
  listOpenCatalog(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('open-catalog', query);
  }

  @Get('annual-reports')
  listAnnualReports(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('annual-reports', query);
  }

  @Get('organizations')
  listOrganizations(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('organizations', query);
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.detailForSegment('organizations', id);
  }

  @Get('faqs')
  listFaqs(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('faqs', query);
  }

  @Get('faqs/:id')
  getFaq(@Param('id') id: string) {
    return this.detailForSegment('faqs', id);
  }

  @Get('notices')
  listNotices(@Query() query: PublicContentListQueryDto) {
    return this.listForSegment('notices', query);
  }

  @Get('notices/:id')
  getNotice(@Param('id') id: string) {
    return this.detailForSegment('notices', id);
  }

  private listForSegment(segment: string, query: PublicContentListQueryDto) {
    const route = getPublicContentRouteOrFail(segment);
    return this.publicContentService.list(route.contentType, query);
  }

  private detailForSegment(segment: string, id: string) {
    const route = getPublicContentRouteOrFail(segment);
    return this.publicContentService.getById(route.contentType, id);
  }
}
