import { Module } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadioModule } from '../radio/radio.module';
import { StationPlaysController, UnmatchedController } from './playlog.controller';
import { PlaylogService } from './playlog.service';

@Module({
  imports: [RadioModule, ArtistsModule, NotificationsModule],
  controllers: [StationPlaysController, UnmatchedController],
  providers: [PlaylogService],
  exports: [PlaylogService],
})
export class PlaylogModule {}
