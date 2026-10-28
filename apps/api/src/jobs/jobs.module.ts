import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlaylogModule } from '../playlog/playlog.module';
import { StationsModule } from '../stations/stations.module';
import { UsersModule } from '../users/users.module';
import { JobsService } from './jobs.service';

// Zamanlama ScheduleModule.forRoot() ile açılır; o yalnız worker'da yüklenir.
// API ve testler bu modülü zamanlayıcısız kullanabilir (işleri elle çağırmak için).
@Module({
  imports: [NotificationsModule, PlaylogModule, UsersModule, StationsModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
