import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, ChipRow, Empty, Title } from '@/components/ui';
import { VenueCard } from '@/components/venue-card';
import { PLAYER_SPACE, topPadding } from '@/lib/layout';
import { useGenres, useVenues } from '@/lib/queries';
import { C, S } from '@/lib/theme';

export default function VenuesScreen() {
  const insets = useSafeAreaInsets();
  const [genre, setGenre] = useState<string | null>(null);
  const genres = useGenres();
  const venues = useVenues(genre);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: topPadding(insets.top), paddingHorizontal: S.lg, paddingBottom: S.xxl + PLAYER_SPACE, gap: S.md }}
      data={venues.data ?? []}
      keyExtractor={(v) => v.slug}
      renderItem={({ item }) => <VenueCard venue={item} />}
      ListHeaderComponent={
        <View style={{ marginBottom: S.xs }}>
          <Title sub="Sevdiğin sesi çalan yerler. Bu gece açık olanlar önce.">Mekânlar</Title>
          <ChipRow>
            <Chip label="Hepsi" color={C.place} active={!genre} onPress={() => setGenre(null)} />
            {(genres.data ?? []).map((g) => (
              <Chip key={g.slug} label={g.name} color={g.color} active={genre === g.slug} onPress={() => setGenre(genre === g.slug ? null : g.slug)} />
            ))}
          </ChipRow>
        </View>
      }
      ListEmptyComponent={
        venues.isLoading ? (
          <ActivityIndicator color={C.dim} style={{ marginTop: S.xl }} />
        ) : venues.isError ? (
          <Empty title="Mekânlar yüklenemedi" hint="Bağlantını kontrol edip tekrar dene." />
        ) : (
          <Empty title="Bu türde mekân yok" hint="Başka bir tür dene." />
        )
      }
    />
  );
}
