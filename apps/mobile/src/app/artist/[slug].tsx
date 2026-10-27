import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Cover } from '@/components/cover';
import { DetailScreen, detailStyles } from '@/components/detail';
import { EventRow } from '@/components/event-card';
import { Icon } from '@/components/icon';
import { Button, Empty, GenrePills, SectionHeader } from '@/components/ui';
import { useArtist } from '@/lib/queries';
import { C, R, S } from '@/lib/theme';
import { usePlayGenre } from '@/player/player-context';

export default function ArtistScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useArtist(slug);
  const playGenre = usePlayGenre();
  const a = q.data;
  const g = a?.genres[0];

  return (
    <DetailScreen loading={q.isLoading} error={q.isError}>
      {a ? (
        <>
          <Stack.Screen options={{ title: '' }} />
          <Cover colors={a.genres.map((x) => x.color)} uri={a.imageUrl} height={220} radius={R.lg}>
            <View style={detailStyles.heroBottom}>
              <Text style={detailStyles.heroTitle}>{a.name}</Text>
              <GenrePills genres={a.genres} onCover />
            </View>
          </Cover>

          {a.bio ? <Text style={[detailStyles.body, { marginTop: S.lg }]}>{a.bio}</Text> : null}

          {g ? (
            <View style={detailStyles.actions}>
              <Button
                label={`Benzer sesi dinle · ${g.name}`}
                variant="ghost"
                color={g.color}
                onPress={() => playGenre(g.slug)}
                icon={<Icon ios="dot.radiowaves.left.and.right" android="radio" size={18} color={g.color} />}
              />
            </View>
          ) : null}

          <SectionHeader title="Sahne takvimi" accent={C.play} />
          {a.events.length ? (
            <View style={{ gap: S.sm }}>
              {a.events.map((e) => (
                <EventRow key={e.id} event={e} highlight={C.play} />
              ))}
            </View>
          ) : (
            <Empty title="Yakın tarihte konseri yok" hint="Radyoda çaldığında haber vereceğiz (yakında)." />
          )}
        </>
      ) : null}
    </DetailScreen>
  );
}
