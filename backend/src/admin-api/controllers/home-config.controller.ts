import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/dto/auth-response.dto';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { HomeConfigService } from '../../home-config/home-config.service';
import { UpdateHomeConfigDto } from '../../home-config/dto/update-home-config.dto';

@Controller('admin/home/config')
export class HomeConfigController {
  constructor(private readonly homeConfigService: HomeConfigService) {}

  @Get()
  @RequirePermissions('home:config:read')
  getConfig() {
    return this.homeConfigService.getAdminConfig();
  }

  @Put()
  @RequirePermissions('home:config:update')
  updateConfig(
    @Body() dto: UpdateHomeConfigDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.homeConfigService.updateAdminConfig(dto, user.id);
  }
}
