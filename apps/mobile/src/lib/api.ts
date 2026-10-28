import Constants from 'expo-constants';

// Geliştirmede API, Metro'yu sunan bilgisayarda çalışır. Simülatörde localhost yeter;
// telefonda Expo Go ile açınca aynı ağdaki bilgisayarın IP'si hostUri'den alınır.
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3030`;
}

export const API_URL = resolveApiUrl();
/** Tüm uçlar sürümlü (/v1). */
const BASE = `${API_URL}/v1`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? `İstek başarısız (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// ---- tipler (API yanıtları) ----
export type GenreRef = { slug: string; name: string; color: string };
export type Genre = GenreRef & { radioTag: string; _count: { stations: number; venues: number } };

export type Station = {
  id: string;
  name: string;
  streamUrl: string;
  country: string | null;
  logoUrl: string | null;
  hasMetadata: boolean;
  curated: boolean;
};

export type ArtistRef = { slug: string; name: string; imageUrl?: string | null };
export type Source = 'DEMO' | 'ADMIN' | 'IMPORT';

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  priceFrom: number | null;
  currency: string;
  isFree: boolean;
  ageLimit: number | null;
  ticketUrl: string | null;
  source: Source;
  venue: { slug: string; name: string; district: string; lat: number | null; lng: number | null };
  genres: GenreRef[];
  artists: ArtistRef[];
  /** Yalnız near ile istenince */
  distanceKm?: number | null;
};

export type EventDetail = Omit<EventCard, 'venue'> & {
  description: string | null;
  status: 'PUBLISHED' | 'CANCELLED';
  doorsAt: string | null;
  ticketProvider: string | null;
  /** Güven kutusu (M17); ageLimit etkinlikte yoksa mekânınki */
  sellerName: string | null;
  totalPriceNote: string | null;
  refundPolicy: string | null;
  venue: EventCard['venue'] & {
    address: string | null;
    coverUrl: string | null;
    ageLimit: number | null;
    doorPolicy: string | null;
    dressCode: string | null;
  };
};

/** weekday: 0 = Pazar; kapanış açılıştan küçükse ertesi gün */
export type VenueHours = { weekday: number; opensAt: string; closesAt: string };
/** openNow null = saat bilgisi yok */
export type OpenStatus = { openNow: boolean | null; openUntil: string | null };

/** Cursor sayfalı liste yanıtı */
export type Page<T> = { items: T[]; nextCursor: string | null };

export type VenueCard = {
  slug: string;
  name: string;
  district: string;
  coverUrl: string | null;
  priceLevel: number | null;
  ageLimit: number | null;
  source: Source;
  genres: GenreRef[];
  nextEvent: { slug: string; title: string; startsAt: string } | null;
  tonight: boolean;
} & OpenStatus;

export type VenueDetail = {
  slug: string;
  name: string;
  district: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverUrl: string | null;
  instagram: string | null;
  priceLevel: number | null;
  ageLimit: number | null;
  doorPolicy: string | null;
  dressCode: string | null;
  source: Source;
  genres: GenreRef[];
  /** Pazartesiden başlayarak */
  hours: VenueHours[];
  events: EventCard[];
  sound: { id: string; name: string; streamUrl: string; hasMetadata: boolean; genre: string | null } | null;
} & OpenStatus;

export type ArtistDetail = {
  slug: string;
  name: string;
  imageUrl: string | null;
  bio: string | null;
  genres: GenreRef[];
  events: EventCard[];
};

/** cover: albüm kapağı (Karnaval istasyonlarında Triton'dan) */
export type Track = { raw: string | null; artist: string | null; title: string | null; cover?: string | null };

export type DiscoverNow = {
  track: Track;
  artist: ArtistRef | null;
  artistEvents: EventCard[];
  genreEvents: EventCard[];
  genreWindow: 'tonight' | 'upcoming';
  venues: VenueCard[];
};

export type When = 'tonight' | 'tomorrow' | 'weekend' | 'upcoming';
