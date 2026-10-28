// Admin API yanıtları (apps/api/src/admin, playlog). Yalnız panelin kullandığı alanlar.
export type Queues = { reviewEvents: number; unmatchedOpen: number; stationsDown: number };

export type EventStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'CANCELLED';
export type DataSource = 'DEMO' | 'ADMIN' | 'IMPORT';

export type ReviewEvent = {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  source: DataSource;
  startsAt: string;
  coverUrl: string | null;
  description: string | null;
  sellerName: string | null;
  totalPriceNote: string | null;
  refundPolicy: string | null;
  venue: { slug: string; name: string };
  flags: string[];
};

export type Page<T> = { items: T[]; nextCursor: string | null };

/** GET /admin/events öğesi (moderasyon alanları + liste sütunları) */
export type EventRow = ReviewEvent & {
  endsAt: string | null;
  ticketUrl: string | null;
  priceFrom: number | null;
  isFree: boolean;
  genres: Genre[];
  saves: number;
};
/** counts: durum dışındaki süzgeçlere göre durum dağılımı (sekme rozetleri) */
export type EventPage = Page<EventRow> & { counts: Partial<Record<EventStatus, number>> };

export type TicketProvider = 'BILETIX' | 'PASSO' | 'BUBILET' | 'BILETINIAL' | 'MOBILET' | 'ETKINLIKIO' | 'TICKETMASTER';
export type VenueHit = { slug: string; name: string; district: string; ageLimit: number | null };

/** GET /admin/events/:slug — düzenleme formu */
export type EventDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  doorsAt: string | null;
  priceFrom: number | null;
  isFree: boolean;
  ageLimit: number | null;
  ticketUrl: string | null;
  ticketProvider: TicketProvider | null;
  sellerName: string | null;
  totalPriceNote: string | null;
  refundPolicy: string | null;
  status: EventStatus;
  source: DataSource;
  fanoutAt: string | null;
  createdAt: string;
  updatedAt: string;
  venue: VenueHit;
  genres: Genre[];
  artists: ArtistHit[];
  saves: number;
  refs: { source: string; externalId: string; url: string | null; syncedAt: string }[];
  flags: string[];
};

/** POST /admin/events/check — kaydetmeden önce uyarılar */
export type EventCheck = {
  flags: string[];
  duplicates: { slug: string; title: string; startsAt: string; status: EventStatus; source: DataSource }[];
};

export type District = { slug: string; name: string; venues: number };

export type Moderation = { flags: string[]; held: boolean } | null;

export type UnmatchedStatus = 'OPEN' | 'IGNORED' | 'LINKED';
export type Unmatched = {
  key: string;
  display: string;
  plays: number;
  sampleRaw: string;
  lastSeenAt: string;
  status: UnmatchedStatus;
  artist: { slug: string; name: string } | null;
  stations: { slug: string; name: string; genre: string }[];
  suggestedGenres: { slug: string; name: string }[];
};

export type Genre = { slug: string; name: string; color: string };
export type ArtistHit = { slug: string; name: string; imageUrl: string | null };

export type StationStatus = 'OK' | 'DOWN' | 'NO_METADATA';
export type StationHealth = {
  slug: string;
  name: string;
  streamUrl: string;
  hasMetadata: boolean;
  status: StationStatus;
  failCount: number;
  lastCheckedAt: string | null;
  lastError: string | null;
  codec: string | null;
  bitrate: number | null;
  genre: string;
  metadataSource: 'triton' | 'icy' | null;
  lastPlayAt: string | null;
};
export type StationTest = {
  slug: string;
  previous: StationStatus;
  status: StationStatus;
  probe: { ok: boolean; codec: string | null; bitrate: number | null; icy: boolean; error: string | null };
  nowPlaying: { raw: string | null } | null;
};

export type ImportSource = 'ETKINLIKIO' | 'TICKETMASTER';
export type ImportRun = {
  id: string;
  source: ImportSource;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string | null;
  fetched: number;
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  errors: { externalId: string; message: string }[] | null;
};

export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string | null; name: string | null } | null;
};

export type VenueHour = { weekday: number; opensAt: string; closesAt: string };
type OpenStatus = { openNow: boolean | null; openUntil: string | null };

/** GET /admin/venues öğesi */
export type VenueRow = OpenStatus & {
  id: string;
  slug: string;
  name: string;
  district: string;
  coverUrl: string | null;
  priceLevel: number | null;
  ageLimit: number | null;
  source: DataSource;
  genres: Genre[];
  hasLocation: boolean;
  hasHours: boolean;
  upcomingEvents: number;
  followers: number;
  flags: string[];
};
/** missing: tüm mekânlarda eksik alan sayıları (iş kuyruğu) */
export type VenuePage = Page<VenueRow> & { total: number; missing: { location: number; hours: number; cover: number } };

/** GET /admin/venues/:slug — düzenleme formu */
export type VenueDetail = OpenStatus & {
  id: string;
  slug: string;
  name: string;
  district: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverUrl: string | null;
  instagram: string | null;
  phone: string | null;
  website: string | null;
  reservationUrl: string | null;
  capacity: number | null;
  priceLevel: number | null;
  ageLimit: number | null;
  doorPolicy: string | null;
  dressCode: string | null;
  source: DataSource;
  createdAt: string;
  updatedAt: string;
  genres: Genre[];
  hours: VenueHour[];
  soundStation: { slug: string; name: string; status: StationStatus } | null;
  defaultSound: { slug: string; name: string } | null;
  upcomingEvents: number;
  followers: number;
  refs: { source: string; externalId: string; url: string | null; syncedAt: string }[];
  flags: string[];
};

/** POST /admin/venues/check */
export type VenueCheck = {
  flags: string[];
  duplicates: { slug: string; name: string; district: string; reason: 'name' | 'near'; meters: number | null }[];
};
