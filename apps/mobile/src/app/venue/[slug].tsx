import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Cover } from '@/components/cover';
import { DetailScreen, detailStyles, InfoRow } from '@/components/detail';
import { Equalizer } from '@/components/equalizer';
import { EventRow } from '@/components/event-card';
import { Icon } from '@/components/icon';
import { Empty, GenrePills, SectionHeader } from '@/components/ui';
import { useFavorites } from '@/lib/favorites';
import { priceLevel } from '@/lib/format';
import { openMaps } from '@/lib/links';
import { useVenue } from '@/lib/queries';
import { alpha, C, R, S } from '@/lib/theme';
import { toPlayable, usePlayer } from '@/player/player-context';

export default function VenueScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useVenue(slug);
  const fav = useFavorites();
  const { station, state, play, toggle } = usePlayer();
  const v = q.data;
  const soundColor = v?.genres.find((g) => g.slug === v.sound?.genre)?.color ?? C.place;
  const soundOn = !!v?.sound && station?.streamUrl === v.sound.streamUrl;

  return (
    <DetailScreen loading={q.isLoading} error={q.isError}>
      {v ? (
        <>
          <Stack.Screen
            options={{
              title: v.district,
              headerRight: () => (
                <Pressable hitSlop={10} onPress={() => fav.toggleVenue({ slug: v.slug, name: v.name, district: v.district })}>
                  <Icon ios={fav.isVenueFav(v.slug) ? 'heart.fill' : 'heart'} android="favorite" size={22} color={fav.isVenueFav(v.slug) ? C.play : C.text} />
                </Pressable>
              ),
            }}
          />
          <Cover colors={v.genres.map((g) => g.color)} uri={v.coverUrl} height={240} radius={R.lg}>
            <View style={detailStyles.heroBottom}>
              <Text style={detailStyles.heroTitle}>{v.name}</Text>
              <GenrePills genres={v.genres} max={4} onCover />
            </View>
          </Cover>

          {v.sound ? (
            <Pressable
              onPress={() => (soundOn ? toggle() : play(toPlayable(v.sound!, v.sound!.genre, soundColor)))}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.md, padding: S.md, borderRadius: R.md, backgroundColor: alpha(soundColor, 0.14), borderWidth: 1, borderColor: alpha(soundColor, 0.4) },
                pressed && { opacity: 0.8 },
              ]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: soundColor, alignItems: 'center', justifyContent: 'center' }}>
                <Icon ios={soundOn && state === 'playing' ? 'pause.fill' : 'play.fill'} android={soundOn && state === 'playing' ? 'pause' : 'play_arrow'} size={20} color={C.bg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>Mekânın sesini dinle</Text>
                <Text style={{ color: C.dim, fontSize: 13 }}>{v.sound.name} · buranın türünde canlı radyo</Text>
              </View>
              {soundOn ? <Equalizer playing={state === 'playing'} color={soundColor} size={20} /> : null}
            </Pressable>
          ) : null}

          <View style={{ marginTop: S.sm }}>
            <InfoRow
              ios="mappin.and.ellipse"
              android="location_on"
              label={v.address ?? v.district}
              value="Haritada aç"
              color={C.place}
              onPress={() => openMaps(v.name, v.lat, v.lng)}
            />
            {v.priceLevel ? <InfoRow ios="creditcard" android="payments" label={priceLevel(v.priceLevel)} value="Fiyat seviyesi" color={C.place} /> : null}
            {v.instagram ? <InfoRow ios="camera" android="photo_camera" label={`@${v.instagram}`} value="Instagram" color={C.place} /> : null}
          </View>

          {v.description ? (
            <>
              <SectionHeader title="Hakkında" />
              <Text style={detailStyles.body}>{v.description}</Text>
            </>
          ) : null}

          <SectionHeader title="Programı" accent={C.play} />
          {v.events.length ? (
            <View style={{ gap: S.sm }}>
              {v.events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </View>
          ) : (
            <Empty title="Yaklaşan etkinlik yok" />
          )}
        </>
      ) : null}
    </DetailScreen>
  );
}
