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
