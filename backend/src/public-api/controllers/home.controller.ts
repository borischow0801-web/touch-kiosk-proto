import { Controller, Get } from '@nestjs/common';
import { HomeConfigService } from '../../home-config/home-config.service';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('public/home')
export class HomeController {
  constructor(private readonly homeConfigService: HomeConfigService) {}

  @Get('config')
  getConfig() {
    return this.homeConfigService.getPublicConfig();
  }
}
