import { Controller, Get } from '@nestjs/common';
import { HomeConfigService } from '../../home-config/home-config.service';

@Controller('public/home')
export class HomeController {
  constructor(private readonly homeConfigService: HomeConfigService) {}

  @Get('config')
  getConfig() {
    return this.homeConfigService.getPublicConfig();
  }
}
