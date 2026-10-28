import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard, RolesGuard } from './auth/auth.guard';
import { Public } from './auth/decorators';
import { UsersModule } from './users/users.module';
import { SocialModule } from './social/social.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlaylogModule } from './playlog/playlog.module';
import { GenresModule } from './genres/genres.module';
import { StationsModule } from './stations/stations.module';
import { RadioModule } from './radio/radio.module';
import { EventsModule } from './events/events.module';
import { VenuesModule } from './venues/venues.module';
import { ArtistsModule } from './artists/artists.module';
import { DiscoverModule } from './discover/discover.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { AuditModule } from './audit/audit.module';

@Public()
@Controller()
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Genel sınır IP başına 120 istek/dk; giriş uçlarında daha sıkı (@Throttle).
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }], skipIf: () => process.env.NODE_ENV === 'test' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SocialModule,
    NotificationsModule,
    PlaylogModule,
    GenresModule,
    StationsModule,
    RadioModule,
    EventsModule,
    VenuesModule,
    ArtistsModule,
    DiscoverModule,
    SearchModule,
    AdminModule,
    AuditModule,
  ],
  controllers: [HealthController],
  // Sıra önemli: önce hız sınırı, sonra kimlik, sonra rol.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
})
export class AppModule {}
