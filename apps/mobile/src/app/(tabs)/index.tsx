import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRow, EventTile } from '@/components/event-card';
import { Icon } from '@/components/icon';
import { NowPlayingCard } from '@/components/now-playing-card';
import { StationRow } from '@/components/station-row';
import { Chip, ChipRow, Empty, Muted, SectionHeader } from '@/components/ui';
import { VenueChip } from '@/components/venue-card';
import { DiscoverNow, Genre } from '@/lib/api';
import { PLAYER_SPACE, topPadding } from '@/lib/layout';
import { useEvents, useGenres, useStations } from '@/lib/queries';
import { alpha, C, R, S } from '@/lib/theme';
import { toPlayable, usePlayer } from '@/player/player-context';

export default function ListenScreen() {
  const insets = useSafeAreaInsets();
  const { station, discover, play } = usePlayer();
  const genres = useGenres();
  const [picked, setPicked] = useState<string | null>(null);
  const [moreFor, setMoreFor] = useState<string | null>(null);

  const genre = picked ?? station?.genre ?? genres.data?.[0]?.slug ?? null;
  const genreObj = genres.data?.find((g) => g.slug === genre);
  const stations = useStations(genre, moreFor === genre);
  const playingGenre = genres.data?.find((g) => g.slug === station?.genre);

  const startFirst = () => {
    const first = stations.data?.[0];
    if (first && genre) play(toPlayable(first, genre, genreObj?.color));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: topPadding(insets.top), paddingHorizontal: S.lg, paddingBottom: S.xxl + PLAYER_SPACE }}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>
          play<Text style={{ color: C.play }}>ce</Text>
        </Text>
        <Muted>Müziği çal, mekânı bul.</Muted>
      </View>

      <NowPlayingCard onStart={startFirst} startLabel={genreObj ? `${genreObj.name} ile başla` : 'Başlat'} />

      {station ? <LiveBridge discover={discover} genre={playingGenre} /> : <TonightTeaser />}

      <SectionHeader title="Türler" />
      <ChipRow>
        {(genres.data ?? []).map((g) => (
          <Chip key={g.slug} label={g.name} color={g.color} active={g.slug === genre} onPress={() => setPicked(g.slug)} />
        ))}
      </ChipRow>

      <SectionHeader title={genreObj ? `${genreObj.name} istasyonları` : 'İstasyonlar'} accent={genreObj?.color} />
      {stations.isLoading ? (
        <ActivityIndicator color={C.dim} style={{ marginTop: S.lg }} />
      ) : stations.isError ? (
        <Empty title="İstasyonlar yüklenemedi" hint="API çalışıyor mu? (pnpm dev:api)" />
      ) : (
        <View style={{ gap: S.sm }}>
          {(stations.data ?? []).map((s) => (
            <StationRow
              key={s.id}
              station={toPlayable(s, genre, genreObj?.color)}
              subtitle={[s.country, s.curated ? 'Playce seçkisi' : 'radio-browser', s.hasMetadata ? null : 'parça bilgisi yok'].filter(Boolean).join(' · ')}
            />
          ))}
          {moreFor !== genre && genre ? (
            <Pressable onPress={() => setMoreFor(genre)} style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}>
              <Text style={styles.moreText}>Daha fazla istasyon</Text>
              <Icon ios="chevron.down" android="expand_more" size={14} color={C.dim} />
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

/** Çalan müziğin şehirdeki karşılığı: sanatçı sahnede mi, bu gece bu tür nerede çalıyor. */
function LiveBridge({ discover, genre }: { discover: DiscoverNow | undefined; genre: Genre | undefined }) {
  if (!discover) return null;
  const { artist, artistEvents, genreEvents, genreWindow, venues } = discover;
  const color = genre?.color ?? C.play;

  return (
    <View>
      {artist ? (
        <View style={[styles.artistBox, { borderColor: alpha(C.play, 0.45) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Icon ios="music.mic" android="mic" size={18} color={C.play} />
            <Text style={styles.artistTitle} numberOfLines={1}>
              {artistEvents.length ? `${artist.name} sahnede!` : `Şu an: ${artist.name}`}
            </Text>
          </View>
          {artistEvents.length ? (
            <View style={{ gap: S.sm, marginTop: S.md }}>
              {artistEvents.slice(0, 2).map((e) => (
                <EventRow key={e.id} event={e} highlight={C.play} />
              ))}
            </View>
          ) : (
            <Muted style={{ marginTop: 4 }}>Yakın tarihte konseri yok.</Muted>
          )}
          <Link href={{ pathname: '/artist/[slug]', params: { slug: artist.slug } }} style={styles.artistLink}>
            Sanatçı sayfası →
          </Link>
        </View>
      ) : null}

      {genreEvents.length ? (
        <>
          <SectionHeader title={`${genreWindow === 'tonight' ? 'Bu gece' : 'Yakında'} · ${genre?.name ?? 'bu ses'} canlı`} accent={color} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md }}>
            {genreEvents.map((e) => (
              <EventTile key={e.id} event={e} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {venues.length ? (
        <>
          <SectionHeader title={`${genre?.name ?? 'Bu ses'} çalan mekânlar`} accent={C.place} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm }}>
            {venues.map((v) => (
              <VenueChip key={v.slug} venue={v} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function TonightTeaser() {
  const events = useEvents({ when: 'tonight', limit: 8 });
  if (!events.data?.length) return null;
  return (
    <>
      <SectionHeader
        title="Bu gece şehirde"
        accent={C.place}
        action={
          <Link href="/tonight" style={styles.seeAll}>
            Tümü
          </Link>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md }}>
        {events.data.map((e) => (
          <EventTile key={e.id} event={e} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: S.lg, gap: 2 },
  wordmark: { color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  artistBox: { marginTop: S.xl, padding: S.md, borderRadius: R.md, borderWidth: 1, backgroundColor: alpha(C.play, 0.07) },
  artistTitle: { color: C.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  artistLink: { color: C.play, fontSize: 14, fontWeight: '700', marginTop: S.md },
  seeAll: { color: C.place, fontSize: 14, fontWeight: '700' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: S.md },
  moreText: { color: C.dim, fontSize: 14, fontWeight: '600' },
});
