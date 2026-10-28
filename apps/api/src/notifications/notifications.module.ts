import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ExpoPushClient } from './expo-push.client';
import { FanoutService } from './fanout.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, FanoutService, ExpoPushClient],
  exports: [NotificationsService, PushService, FanoutService],
})
export class NotificationsModule {}
