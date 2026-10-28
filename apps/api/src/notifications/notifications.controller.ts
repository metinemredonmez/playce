import { Body, Controller, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public } from '../auth/decorators';
import { MarkReadDto, NotificationsQuery, PushTokenDto, UpdatePrefsDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Girişsiz de çağrılabilir; token varsa cihaz hesaba bağlanır. */
  @Public()
  @Post('push-tokens')
  @HttpCode(200)
  registerToken(@CurrentUser() user: AuthUser | undefined, @Body() dto: PushTokenDto) {
    return this.notifications.registerToken(dto, user?.id);
  }

  @Get('notifications')
  list(@CurrentUser() user: AuthUser, @Query() q: NotificationsQuery) {
    return this.notifications.list(user.id, q.cursor, q.limit);
  }

  @Post('notifications/read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Body() dto: MarkReadDto) {
    return this.notifications.markRead(user.id, dto.ids);
  }

  @Get('notification-prefs')
  prefs(@CurrentUser() user: AuthUser) {
    return this.notifications.prefs(user.id);
  }

  @Patch('notification-prefs')
  updatePrefs(@CurrentUser() user: AuthUser, @Body() dto: UpdatePrefsDto) {
    return this.notifications.updatePrefs(user.id, dto);
  }
}
