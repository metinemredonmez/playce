import { Module } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ArtistsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
