import { z } from 'zod';

const csv = (fallback = '') =>
  z
    .string()
    .default(fallback)
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );

// Açılışta env doğrulanır; eksik/yanlış değerle API hiç ayağa kalkmaz.
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3030),
    DATABASE_URL: z.string().min(1),
    // Geçiş dönemi: admin uçlarında JWT yerine X-Admin-Key de kabul edilir (Faz 2'de kalkacak).
    ADMIN_KEY: z.string().min(12).optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı'),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('Playce <no-reply@playce.app>'),
    APPLE_AUDIENCES: csv('app.playce.mobile'),
    GOOGLE_CLIENT_IDS: csv(),
    EXPO_ACCESS_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.SMTP_URL) ctx.addIssue({ code: 'custom', path: ['SMTP_URL'], message: "production'da zorunlu" });
    if (env.ADMIN_KEY && env.ADMIN_KEY.length < 32)
      ctx.addIssue({ code: 'custom', path: ['ADMIN_KEY'], message: "production'da en az 32 karakter" });
  });

export type Env = z.infer<typeof schema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  // Boş satırlar (KEY=) tanımsız sayılsın.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Geçersiz ortam değişkenleri:\n${lines.join('\n')}`);
  }
  return parsed.data;
}
