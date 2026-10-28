import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { StationHealthService } from './station-health.service';

@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('EDITOR')
@Controller('admin/stations')
export class StationHealthController {
  constructor(private readonly health: StationHealthService) {}

  /** Tüm küratörlü istasyonlar: DOWN ve NO_METADATA üstte, son kontrol ve son çalma zamanıyla. */
  @Get('health')
  report() {
    return this.health.report();
  }

  /** Yayına şimdi bağlan, durumu güncelle; ICY varsa çalan parçayı da döner. */
  @Post(':slug/test')
  @HttpCode(200)
  test(@Param('slug') slug: string) {
    return this.health.test(slug);
  }
}
