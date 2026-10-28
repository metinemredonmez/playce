// Admin API yanıtları (apps/api/src/admin, playlog). Yalnız panelin kullandığı alanlar.
export type Queues = { reviewEvents: number; unmatchedOpen: number; stationsDown: number };

export type ReviewEvent = {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'CANCELLED';
  source: 'DEMO' | 'ADMIN' | 'IMPORT';
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
