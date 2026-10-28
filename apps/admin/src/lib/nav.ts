import type { Queues } from './types';
import type { Role } from './roles';

export type NavItem = {
  href: string;
  label: string;
  /** Bu rol ve üstü görür */
  min: Role;
  /** Menüde sayı rozeti (bekleyen iş) */
  badge?: keyof Queues;
  /** Ekran henüz yok: menüde soluk "yakında" */
  soon?: boolean;
  icon: 'review' | 'unmatched' | 'events' | 'venues' | 'artists' | 'stations' | 'import' | 'audit';
};

// 04-admin.md §3 bilgi mimarisi; hazır olmayan ekranlar sırayla açılacak.
export const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Kuyruklar',
    items: [
      { href: '/moderasyon', label: 'Moderasyon', min: 'EDITOR', badge: 'reviewEvents', icon: 'review' },
      { href: '/eslesmeyenler', label: 'Eşleşmeyenler', min: 'EDITOR', badge: 'unmatchedOpen', icon: 'unmatched' },
    ],
  },
  {
    title: 'İçerik',
    items: [
      { href: '/etkinlikler', label: 'Etkinlikler', min: 'EDITOR', icon: 'events' },
      { href: '/mekanlar', label: 'Mekânlar', min: 'EDITOR', icon: 'venues' },
      { href: '/sanatcilar', label: 'Sanatçılar', min: 'EDITOR', soon: true, icon: 'artists' },
      { href: '/istasyonlar', label: 'İstasyonlar', min: 'EDITOR', badge: 'stationsDown', icon: 'stations' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/ice-aktarma', label: 'İçe aktarma', min: 'ADMIN', icon: 'import' },
      { href: '/denetim', label: 'Denetim kaydı', min: 'ADMIN', icon: 'audit' },
    ],
  },
];
