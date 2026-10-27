import { Module } from '@nestjs/common';
import { RadioModule } from '../radio/radio.module';
import { ArtistsModule } from '../artists/artists.module';
import { EventsModule } from '../events/events.module';
import { VenuesModule } from '../venues/venues.module';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';

@Module({
  imports: [RadioModule, ArtistsModule, EventsModule, VenuesModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}
