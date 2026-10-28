import { Module } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { EtkinlikIoSource } from './sources/etkinlikio';
import { TicketmasterSource } from './sources/ticketmaster';

@Module({
  imports: [ArtistsModule],
  controllers: [IngestController],
  providers: [IngestService, EtkinlikIoSource, TicketmasterSource],
  exports: [IngestService],
})
export class IngestModule {}
