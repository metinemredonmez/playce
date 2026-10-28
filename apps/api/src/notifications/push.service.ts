import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXPO_RECEIPT_LIMIT, EXPO_SEND_LIMIT, ExpoMessage, ExpoPushClient } from './expo-push.client';

const BATCH = 500;
/** Bu kadar süredir gönderilemeyen push vazgeçilir (bildirim kutuda kalır). */
const GIVE_UP_MS = 6 * 60 * 60 * 1000;
/** Expo makbuzları ~15 dk sonra hazır olur, 24 saat saklanır. */
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * DB outbox gönderici (ADR-020): bekleyen bildirimleri kullanıcının cihazlarına Expo Push ile yollar.
 * Tek worker süreci çalıştırır; ağ hatasında bildirim PENDING kalır ve sonraki turda tekrar denenir.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger('Push');

  constructor(
    private readonly prisma: PrismaService,
    private readonly expo: ExpoPushClient,
  ) {}

  async dispatchPending(now = new Date()) {
    await this.prisma.notification.updateMany({
      where: { pushState: 'PENDING', pushAfter: { lt: new Date(now.getTime() - GIVE_UP_MS) } },
      data: { pushState: 'FAILED' },
    });
    const batch = await this.prisma.notification.findMany({
      where: { pushState: 'PENDING', pushAfter: { lte: now } },
      orderBy: { pushAfter: 'asc' },
      take: BATCH,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        deeplink: true,
        data: true,
        user: { select: { pushTokens: { select: { token: true } } } },
      },
    });
    if (!batch.length) return { sent: 0, skipped: 0, failed: 0 };

    const outgoing: { notificationId: string; msg: ExpoMessage }[] = [];
    const noDevice: string[] = [];
    for (const n of batch) {
      if (!n.user.pushTokens.length) noDevice.push(n.id);
      for (const { token } of n.user.pushTokens) {
        const extra = n.data && typeof n.data === 'object' && !Array.isArray(n.data) ? (n.data as Prisma.JsonObject) : {};
        outgoing.push({
          notificationId: n.id,
          msg: { to: token, title: n.title, body: n.body, sound: 'default', data: { ...extra, id: n.id, kind: n.kind, url: n.deeplink } },
        });
      }
    }

    const tried = new Set<string>();
    const delivered = new Set<string>();
    const tickets: Prisma.PushTicketCreateManyInput[] = [];
    const deadTokens: string[] = [];
    for (const chunk of chunks(outgoing, EXPO_SEND_LIMIT)) {
      let results;
      try {
        results = await this.expo.send(chunk.map((c) => c.msg));
      } catch (e) {
        this.log.warn(`Gönderim başarısız, sonra tekrar denenecek: ${(e as Error).message}`);
        continue;
      }
      chunk.forEach((c, i) => {
        tried.add(c.notificationId);
        const t = results[i];
        if (t?.status === 'ok') {
          delivered.add(c.notificationId);
          tickets.push({ id: t.id, token: c.msg.to, notificationId: c.notificationId });
        } else if (t?.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(c.msg.to);
        }
      });
    }

    const sent = [...tried].filter((id) => delivered.has(id));
    const failed = [...tried].filter((id) => !delivered.has(id));
    await this.prisma.$transaction([
      this.prisma.pushTicket.createMany({ data: tickets, skipDuplicates: true }),
      this.prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } }),
      this.prisma.notification.updateMany({ where: { id: { in: noDevice } }, data: { pushState: 'SKIPPED' } }),
      this.prisma.notification.updateMany({ where: { id: { in: sent } }, data: { pushState: 'SENT', pushedAt: now } }),
      this.prisma.notification.updateMany({ where: { id: { in: failed } }, data: { pushState: 'FAILED' } }),
    ]);
    return { sent: sent.length, skipped: noDevice.length, failed: failed.length };
  }

  /** Makbuzlarda DeviceNotRegistered → uygulama silinmiş; token'ı sil. */
  async checkReceipts(now = new Date()) {
    const tickets = await this.prisma.pushTicket.findMany({
      where: { createdAt: { lte: new Date(now.getTime() - RECEIPT_DELAY_MS) } },
      orderBy: { createdAt: 'asc' },
      take: EXPO_RECEIPT_LIMIT,
    });
    if (!tickets.length) return { checked: 0, removedTokens: 0 };
    const receipts = await this.expo.receipts(tickets.map((t) => t.id));
    const dead = tickets
      .filter((t) => {
        const r = receipts[t.id];
        return r?.status === 'error' && r.details?.error === 'DeviceNotRegistered';
      })
      .map((t) => t.token);
    const [removed] = await this.prisma.$transaction([
      this.prisma.pushToken.deleteMany({ where: { token: { in: dead } } }),
      this.prisma.pushTicket.deleteMany({ where: { id: { in: tickets.map((t) => t.id) } } }),
    ]);
    return { checked: tickets.length, removedTokens: removed.count };
  }
}
