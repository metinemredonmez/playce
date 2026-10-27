import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlayableStation } from '@/player/player-context';

export type FavVenue = { slug: string; name: string; district: string };

type Favs = { stations: PlayableStation[]; venues: FavVenue[] };
type Ctx = Favs & {
  isStationFav: (streamUrl: string) => boolean;
  toggleStation: (s: PlayableStation) => void;
  isVenueFav: (slug: string) => boolean;
  toggleVenue: (v: FavVenue) => void;
};

const KEY = 'playce:favorites:v1';
const FavoritesContext = createContext<Ctx | null>(null);

// Hesap sistemi gelene kadar favoriler cihazda tutulur.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favs, setFavs] = useState<Favs>({ stations: [], venues: [] });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setFavs({ stations: [], venues: [], ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const update = useCallback((fn: (f: Favs) => Favs) => {
    setFavs((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...favs,
      isStationFav: (url) => favs.stations.some((s) => s.streamUrl === url),
      toggleStation: (s) =>
        update((f) => ({
          ...f,
          stations: f.stations.some((x) => x.streamUrl === s.streamUrl)
            ? f.stations.filter((x) => x.streamUrl !== s.streamUrl)
            : [s, ...f.stations],
        })),
      isVenueFav: (slug) => favs.venues.some((v) => v.slug === slug),
      toggleVenue: (v) =>
        update((f) => ({
          ...f,
          venues: f.venues.some((x) => x.slug === v.slug) ? f.venues.filter((x) => x.slug !== v.slug) : [v, ...f.venues],
        })),
    }),
    [favs, update],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites FavoritesProvider içinde kullanılmalı');
  return ctx;
}
