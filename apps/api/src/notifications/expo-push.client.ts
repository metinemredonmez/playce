import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
};

type ExpoError = { status: 'error'; message: string; details?: { error?: string } };
export type ExpoTicket = { status: 'ok'; id: string } | ExpoError;
export type ExpoReceipt = { status: 'ok' } | ExpoError;

const BASE = 'https://exp.host/--/api/v2/push';
/** Expo sınırları: istek başına 100 mesaj, 1000 makbuz. */
export const EXPO_SEND_LIMIT = 100;
export const EXPO_RECEIPT_LIMIT = 1000;

/** Expo Push HTTP API. Testlerde sahte istemciyle değiştirilir. */
@Injectable()
export class ExpoPushClient {
  private readonly token?: string;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('EXPO_ACCESS_TOKEN', { infer: true });
  }

  async send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    return (await this.post('/send', messages)) as ExpoTicket[];
  }

  async receipts(ids: string[]): Promise<Record<string, ExpoReceipt>> {
    return (await this.post('/getReceipts', { ids })) as Record<string, ExpoReceipt>;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Expo push ${path} → HTTP ${res.status}`);
    const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`Expo push ${path}: ${json.errors.map((e) => e.message).join('; ')}`);
    return json.data;
  }
}
