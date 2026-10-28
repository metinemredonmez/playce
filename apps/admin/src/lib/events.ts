import type { DataSource, EventStatus, TicketProvider } from './types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const EVENT_STATUS: Record<EventStatus, { label: string; variant: BadgeVariant }> = {
  PUBLISHED: { label: 'Yayında', variant: 'default' },
  REVIEW: { label: 'İncelemede', variant: 'destructive' },
  DRAFT: { label: 'Taslak', variant: 'secondary' },
  CANCELLED: { label: 'İptal', variant: 'outline' },
};

export const SOURCE_LABEL: Record<DataSource, string> = { ADMIN: 'Admin', IMPORT: 'İçe aktarma', DEMO: 'Demo' };

/** Bilet satıcıları (API common/tickets ile aynı liste); boş seçim = linkten otomatik */
export const TICKET_PROVIDERS: Record<TicketProvider, string> = {
  BILETIX: 'Biletix',
  PASSO: 'Passo',
  BUBILET: 'Bubilet',
  BILETINIAL: 'Biletinial',
  MOBILET: 'Mobilet',
  ETKINLIKIO: 'Etkinlik.io',
  TICKETMASTER: 'Ticketmaster',
};

/** Güven alanı şablonları (M17) — formda tek tıkla doldurulur */
export const PRICE_NOTES = ['Hizmet bedeli dahil', 'Hizmet bedeli hariç', 'Kapıda nakit ve kart'];
export const REFUND_POLICIES = [
  'Etkinlik iptalinde tam iade; kullanıcı kaynaklı iade yok',
  'Etkinlikten 48 saat öncesine kadar iade',
  'İade yok',
];

/** Liste tarih süzgeci; varsayılan "upcoming" (all = API'ye when gönderilmez) */
export const EVENT_WHENS = { upcoming: 'Yaklaşan', today: 'Bugün', week: 'Bu hafta', past: 'Geçmiş', all: 'Tüm tarihler' } as const;
export type EventWhen = keyof typeof EVENT_WHENS;
