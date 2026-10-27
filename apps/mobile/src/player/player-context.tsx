import { useQueryClient } from '@tanstack/react-query';
import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, DiscoverNow, Station } from '@/lib/api';
import { useDiscoverNow, useGenres } from '@/lib/queries';
import { C } from '@/lib/theme';

/** Çalınabilir istasyon — küratörlü, radio-browser'dan gelen ya da mekânın sesi. */
export type PlayableStation = {
  id: string;
  name: string;
  streamUrl: string;
  genre: string | null;
  color: string;
  hasMetadata: boolean;
  logoUrl?: string | null;
};

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type Ctx = {
  station: PlayableStation | null;
  state: PlayerState;
  discover: DiscoverNow | undefined;
  play: (s: PlayableStation) => void;
  toggle: () => void;
  stop: () => void;
};

const PlayerContext = createContext<Ctx | null>(null);
const LOCK_OPTS = { isLiveStream: true, showSeekForward: false, showSeekBackward: false };
const STALL_MS = 15_000;

export function toPlayable(s: Pick<Station, 'id' | 'name' | 'streamUrl' | 'hasMetadata'> & { logoUrl?: string | null }, genre: string | null, color?: string): PlayableStation {
  return { id: s.id, name: s.name, streamUrl: s.streamUrl, hasMetadata: s.hasMetadata, logoUrl: s.logoUrl ?? null, genre, color: color ?? C.play };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  // Uygulama boyunca tek oynatıcı: sekmeler arasında gezerken müzik kesilmesin.
  const [player] = useState(() => createAudioPlayer(null, { updateInterval: 1000 }));
  const status = useAudioPlayerStatus(player);
  const [station, setStation] = useState<PlayableStation | null>(null);
  const [wantPlaying, setWantPlaying] = useState(false);
  const [stalled, setStalled] = useState(false);
  const wasPlaying = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    return () => player.release();
  }, [player]);

  // Kilit ekranından / kulaklıktan durdurulursa durumu eşitle.
  useEffect(() => {
    if (wasPlaying.current && !status.playing && !status.isBuffering) setWantPlaying(false);
    wasPlaying.current = status.playing;
  }, [status.playing, status.isBuffering]);

  // Yayın 15 sn içinde başlamazsa hata göster.
  useEffect(() => {
    setStalled(false);
    if (!wantPlaying || status.playing) return;
    const t = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(t);
  }, [wantPlaying, status.playing, station?.streamUrl]);

  const start = useCallback(
    (s: PlayableStation) => {
      // Canlı yayında devam ettirmek yerine yeniden bağlan: kaldığın yerden değil, şu andan çal.
      player.replace({ uri: s.streamUrl });
      player.play();
      player.setActiveForLockScreen(true, { title: s.name, artist: 'Playce' }, LOCK_OPTS);
      setWantPlaying(true);
    },
    [player],
  );

  const play = useCallback(
    (s: PlayableStation) => {
      if (station?.streamUrl === s.streamUrl && status.playing) return;
      Haptics.selectionAsync().catch(() => {});
      setStation(s);
      start(s);
    },
    [station?.streamUrl, status.playing, start],
  );

  const toggle = useCallback(() => {
    if (!station) return;
    Haptics.selectionAsync().catch(() => {});
    if (wantPlaying) {
      player.pause();
      setWantPlaying(false);
    } else {
      start(station);
    }
  }, [player, station, wantPlaying, start]);

  const stop = useCallback(() => {
    player.pause();
    player.setActiveForLockScreen(false);
    setWantPlaying(false);
    setStation(null);
  }, [player]);

  const state: PlayerState = !station
    ? 'idle'
    : status.playing
      ? 'playing'
      : wantPlaying
        ? stalled
          ? 'error'
          : 'loading'
        : 'paused';

  const discover = useDiscoverNow(station?.streamUrl ?? null, station?.genre ?? null, state === 'playing').data;

  // Parça değişince kilit ekranındaki bilgiyi güncelle.
  const track = discover?.track;
  useEffect(() => {
    if (!station || !track?.raw) return;
    player.updateLockScreenMetadata({ title: track.title ?? track.raw, artist: track.artist ?? station.name, albumTitle: station.name });
  }, [player, station, track?.raw, track?.title, track?.artist]);

  const value = useMemo<Ctx>(() => ({ station, state, discover, play, toggle, stop }), [station, state, discover, play, toggle, stop]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer PlayerProvider içinde kullanılmalı');
  return ctx;
}

/** Bir türün ilk küratörlü istasyonunu çalar (etkinlik/sanatçı sayfasındaki "Bu sesi dinle"). */
export function usePlayGenre() {
  const qc = useQueryClient();
  const { play } = usePlayer();
  const genres = useGenres().data;
  return useCallback(
    async (slug: string) => {
      const list = await qc.fetchQuery({
        queryKey: ['stations', slug, false],
        queryFn: () => api<Station[]>(`/genres/${slug}/stations`),
        staleTime: 5 * 60_000,
      });
      const first = list[0];
      if (first) play(toPlayable(first, slug, genres?.find((g) => g.slug === slug)?.color));
    },
    [qc, play, genres],
  );
}
