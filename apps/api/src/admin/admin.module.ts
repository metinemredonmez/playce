import { Module } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { PlaylogModule } from '../playlog/playlog.module';
import { SearchModule } from '../search/search.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ArtistsModule, PlaylogModule, SearchModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
