import { Module } from '@nestjs/common';
import { DistrictsController, VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController, DistrictsController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
