import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GenresModule } from './genres/genres.module';
import { StationsModule } from './stations/stations.module';
import { RadioModule } from './radio/radio.module';
import { EventsModule } from './events/events.module';
import { VenuesModule } from './venues/venues.module';
import { ArtistsModule } from './artists/artists.module';
import { DiscoverModule } from './discover/discover.module';
import { AdminModule } from './admin/admin.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GenresModule,
    StationsModule,
    RadioModule,
    EventsModule,
    VenuesModule,
    ArtistsModule,
    DiscoverModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
