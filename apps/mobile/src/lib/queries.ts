import { useQuery } from '@tanstack/react-query';
import {
  api,
  ArtistDetail,
  DiscoverNow,
  EventCard,
  EventDetail,
  Genre,
  Page,
  qs,
  Station,
  VenueCard,
  VenueDetail,
  When,
} from './api';

export const useGenres = () =>
  useQuery({ queryKey: ['genres'], queryFn: () => api<Genre[]>('/genres'), staleTime: 10 * 60_000 });

export const useStations = (genre: string | null, more = false) =>
  useQuery({
    queryKey: ['stations', genre, more],
    queryFn: () => api<Station[]>(`/genres/${genre}/stations${more ? '?more=1' : ''}`),
    enabled: !!genre,
    staleTime: 5 * 60_000,
  });

export const useEvents = (p: { when?: When; genre?: string | null; limit?: number }) =>
  useQuery({
    queryKey: ['events', p.when, p.genre ?? null, p.limit],
    // Sonsuz kaydırma Faz 4'te; şimdilik ilk sayfa.
    queryFn: () => api<Page<EventCard>>(`/events${qs({ when: p.when, genre: p.genre, limit: p.limit })}`).then((r) => r.items),
  });

export const useEvent = (slug: string) =>
  useQuery({ queryKey: ['event', slug], queryFn: () => api<EventDetail>(`/events/${slug}`) });

export const useVenues = (genre?: string | null) =>
  useQuery({ queryKey: ['venues', genre ?? null], queryFn: () => api<VenueCard[]>(`/venues${qs({ genre })}`) });

export const useVenue = (slug: string) =>
  useQuery({ queryKey: ['venue', slug], queryFn: () => api<VenueDetail>(`/venues/${slug}`) });

export const useArtist = (slug: string) =>
  useQuery({ queryKey: ['artist', slug], queryFn: () => api<ArtistDetail>(`/artists/${slug}`) });

/** Çalan yayının parçası + şehirdeki karşılığı. Çalarken 20 sn'de bir tazelenir. */
export const useDiscoverNow = (streamUrl: string | null, genre: string | null, active: boolean) =>
  useQuery({
    queryKey: ['discover', streamUrl, genre],
    queryFn: () => api<DiscoverNow>(`/discover/now${qs({ url: streamUrl, genre })}`),
    enabled: !!streamUrl,
    refetchInterval: active ? 20_000 : false,
    placeholderData: (prev) => prev,
  });
