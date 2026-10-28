import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FanoutService } from '../notifications/fanout.service';
import { PushService } from '../notifications/push.service';
import { PlaylogService } from '../playlog/playlog.service';
import { StationHealthService } from '../stations/station-health.service';
import { UsersService } from '../users/users.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Arka plan işleri — yalnız worker sürecinde zamanlanır (worker.ts → ScheduleModule).
 * Her iş üst üste binmez: önceki tur bitmeden yenisi başlamaz.
 */
@Injectable()
export class JobsService {
  private readonly log = new Logger('Jobs');
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly fanout: FanoutService,
    private readonly playlog: PlaylogService,
    private readonly users: UsersService,
    private readonly stationHealth: StationHealthService,
  ) {}

  @Interval(10_000)
  pushDispatch() {
    return this.exclusive('push-dispatch', () => this.push.dispatchPending());
  }

  @Interval(15 * 60_000)
  pushReceipts() {
    return this.exclusive('push-receipts', () => this.push.checkReceipts());
  }

  @Interval(30_000)
  eventFanout() {
    return this.exclusive('event-fanout', () => this.fanout.eventFanout());
  }

  @Interval(5 * 60_000)
  eventReminders() {
    return this.exclusive('event-reminder', () => this.fanout.eventReminders());
  }

  @Interval(60_000)
  nowPlayingPoller() {
    return this.exclusive('now-playing-poller', () => this.playlog.poll());
  }

  /** Saatte bir; 3 ardışık hata → DOWN (uygulamada gizlenir). */
  @Cron('7 * * * *')
  stationHealthCheck() {
    return this.exclusive('station-health', () => this.stationHealth.checkAll());
  }

  @Cron('0 3 * * *', { timeZone: 'Europe/Istanbul' })
  nightlyCleanup() {
    return this.exclusive('cleanup', () => this.cleanup());
  }

  /** Süresi dolan OTP/oturum, 90 günlük PlayLog ve bildirimler; 30 günü dolan silinmiş hesaplar. */
  async cleanup(now = new Date()) {
    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const [otp, sessions, plays, notifications, tickets] = await this.prisma.$transaction([
      this.prisma.otpCode.deleteMany({ where: { createdAt: { lt: ago(1) } } }),
      this.prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: ago(7) } }] } }),
      this.prisma.playLog.deleteMany({ where: { at: { lt: ago(90) } } }),
      this.prisma.notification.deleteMany({ where: { createdAt: { lt: ago(90) } } }),
      this.prisma.pushTicket.deleteMany({ where: { createdAt: { lt: ago(1) } } }),
    ]);
    const purgedUsers = await this.users.purgeDeleted(now);
    return { otp: otp.count, sessions: sessions.count, plays: plays.count, notifications: notifications.count, tickets: tickets.count, purgedUsers };
  }

  private async exclusive(name: string, fn: () => Promise<unknown>) {
    if (this.running.has(name)) return;
    this.running.add(name);
    const started = Date.now();
    try {
      const result = await fn();
      if (hasWork(result)) this.log.log(`${name} ${JSON.stringify(result)} (${Date.now() - started} ms)`);
    } catch (e) {
      this.log.error(`${name} başarısız: ${(e as Error).message}`, (e as Error).stack);
    } finally {
      this.running.delete(name);
    }
  }
}

/** Boş turları loglama: sonuçta sıfırdan büyük bir sayı varsa iş yapılmıştır. */
function hasWork(result: unknown) {
  return !!result && typeof result === 'object' && Object.values(result).some((v) => typeof v === 'number' && v > 0);
}
