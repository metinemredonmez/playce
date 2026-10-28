import { Controller, Get, HttpCode, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ExternalSource } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { Audit } from '../audit/audit.decorator';
import { IngestService } from './ingest.service';

@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('ADMIN')
@Controller('admin/imports')
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  /** Son içe aktarma turları + anahtarı tanımlı kaynaklar */
  @Get()
  async runs() {
    return { enabled: this.ingest.enabledSources(), runs: await this.ingest.runs() };
  }

  /** Şimdi çalıştır. dryRun=1: hiçbir şey yazmadan kaç etkinliğin geleceğini say (ör. Ticketmaster TR denemesi). */
  @Post(':source/run')
  @Audit('import.run')
  @HttpCode(200)
  @ApiQuery({ name: 'dryRun', required: false })
  run(@Param('source', new ParseEnumPipe(ExternalSource)) source: ExternalSource, @Query('dryRun') dryRun?: string) {
    return this.ingest.run(source, { dryRun: dryRun === '1' || dryRun === 'true' });
  }
}
