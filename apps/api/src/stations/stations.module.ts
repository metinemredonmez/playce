import { Module } from '@nestjs/common';
import { GenresModule } from '../genres/genres.module';
import { RadioModule } from '../radio/radio.module';
import { StationHealthController } from './station-health.controller';
import { StationHealthService } from './station-health.service';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [GenresModule, RadioModule],
  controllers: [StationsController, StationHealthController],
  providers: [StationsService, StationHealthService],
  exports: [StationsService, StationHealthService],
})
export class StationsModule {}
