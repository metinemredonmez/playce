import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

/** Bu eşikleri aşan gecikme sorun sayılır (sn) */
const LIMITS = {
  /** Gönderilmeyi bekleyen en eski push (worker 10 sn'de bir gönderir) */
  pushQueueLagSec: 5 * 60,
  /** Son PlayLog kaydı (yoklayıcı dakikada bir; 30 istasyonun hiçbiri 15 dk parça değiştirmemişse worker durmuştur) */
  lastPlayAgeSec: 15 * 60,
  /** Son istasyon sağlık kontrolü (saatte bir) */
  lastStationCheckAgeSec: 2 * 60 * 60,
};

@ApiTags('health')
@Public()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Canlılık (nginx/pm2 için) */
  @Get('health')
  health() {
    return { ok: true };
  }

  /** Uptime izleme: veritabanı, push kuyruğu ve worker'ın işleri. Sorun varsa 503 ve `problems`. */
  @Get('health/deep')
  async deep(@Res({ passthrough: true }) res: Response) {
    const now = Date.now();
    const age = (d: Date | null | undefined) => (d ? Math.round((now - d.getTime()) / 1000) : null);
    try {
      const [oldestPush, lastPlay, stations, lastImport] = await Promise.all([
        this.prisma.notification.findFirst({
          where: { pushState: 'PENDING', pushAfter: { lte: new Date(now) } },
          orderBy: { pushAfter: 'asc' },
          select: { pushAfter: true },
        }),
        this.prisma.playLog.findFirst({ orderBy: { at: 'desc' }, select: { at: true } }),
        this.prisma.station.aggregate({ _max: { lastCheckedAt: true } }),
        this.prisma.importRun.findFirst({ orderBy: { startedAt: 'desc' }, select: { source: true, startedAt: true, finishedAt: true, errors: true } }),
      ]);
      const checks = {
        pushQueueLagSec: age(oldestPush?.pushAfter) ?? 0,
        lastPlayAgeSec: age(lastPlay?.at),
        lastStationCheckAgeSec: age(stations._max.lastCheckedAt),
      };
      // Hiç kayıt yoksa (yeni kurulum) bilinmiyor sayılır, sorun değil
      const problems = (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).filter((k) => (checks[k] ?? 0) > LIMITS[k]);
      if (problems.length) res.status(503);
      return {
        ok: problems.length === 0,
        db: true,
        checks,
        problems,
        lastImport: lastImport && { ...lastImport, errors: Array.isArray(lastImport.errors) ? lastImport.errors.length : 0 },
      };
    } catch {
      res.status(503);
      return { ok: false, db: false, problems: ['db'] };
    }
  }
}
