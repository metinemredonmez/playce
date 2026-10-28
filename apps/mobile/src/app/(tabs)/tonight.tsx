import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRow } from '@/components/event-card';
import { Chip, ChipRow, Empty, Title } from '@/components/ui';
import { When } from '@/lib/api';
import { PLAYER_SPACE, topPadding } from '@/lib/layout';
import { useEvents, useGenres } from '@/lib/queries';
import { C, S } from '@/lib/theme';

const WHENS: { key: When; label: string }[] = [
  { key: 'tonight', label: 'Bu gece' },
  { key: 'weekend', label: 'Hafta sonu' },
  { key: 'upcoming', label: 'Yakında' },
];

export default function TonightScreen() {
  const insets = useSafeAreaInsets();
  const [when, setWhen] = useState<When>('tonight');
  const [genre, setGenre] = useState<string | null>(null);
  const genres = useGenres();
  const events = useEvents({ when, genre, limit: 50 }); // sayfalama Faz 4'te

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: topPadding(insets.top), paddingHorizontal: S.lg, paddingBottom: S.xxl + PLAYER_SPACE, gap: S.sm }}
      data={events.data ?? []}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventRow event={item} />}
      ListHeaderComponent={
        <View style={{ marginBottom: S.sm }}>
          <Title sub="Şehirde hangi müzik nerede çalıyor?">Ne çalıyor?</Title>
          <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.md }}>
            {WHENS.map((w) => (
              <Chip key={w.key} label={w.label} color={C.place} active={when === w.key} onPress={() => setWhen(w.key)} />
            ))}
          </View>
          <ChipRow>
            <Chip label="Tüm türler" active={!genre} onPress={() => setGenre(null)} />
            {(genres.data ?? []).map((g) => (
              <Chip key={g.slug} label={g.name} color={g.color} active={genre === g.slug} onPress={() => setGenre(genre === g.slug ? null : g.slug)} />
            ))}
          </ChipRow>
        </View>
      }
      ListEmptyComponent={
        events.isLoading ? (
          <ActivityIndicator color={C.dim} style={{ marginTop: S.xl }} />
        ) : events.isError ? (
          <Empty title="Etkinlikler yüklenemedi" hint="Bağlantını kontrol edip tekrar dene." />
        ) : (
          <Empty title="Bu filtrede etkinlik yok" hint={when === 'tonight' ? '“Yakında” sekmesine göz at.' : 'Başka bir tür dene.'} />
        )
      }
    />
  );
}
