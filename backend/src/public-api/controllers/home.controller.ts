import { Controller, Get } from '@nestjs/common';
import { PublicHomeConfigService } from '../../home-config/public-home-config.service';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('public/home')
export class HomeController {
  constructor(private readonly publicHomeConfigService: PublicHomeConfigService) {}

  @Get('config')
  getConfig() {
    return this.publicHomeConfigService.getConfig();
  }
}
