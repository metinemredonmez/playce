import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Cover } from '@/components/cover';
import { DetailScreen, detailStyles, InfoRow } from '@/components/detail';
import { Icon } from '@/components/icon';
import { PressLink } from '@/components/press-link';
import { Badge, Button, GenrePills, Muted, SectionHeader } from '@/components/ui';
import { fullDate, isLiveNow, price } from '@/lib/format';
import { openMaps, openTicket } from '@/lib/links';
import { useEvent } from '@/lib/queries';
import { alpha, C, R, S } from '@/lib/theme';
import { usePlayer, usePlayGenre } from '@/player/player-context';

export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const q = useEvent(slug);
  const playGenre = usePlayGenre();
  const { station } = usePlayer();
  const e = q.data;

  return (
    <DetailScreen loading={q.isLoading} error={q.isError}>
      {e ? (
        <>
          <Stack.Screen options={{ title: e.venue.name }} />
          <Cover colors={e.genres.map((g) => g.color)} uri={e.coverUrl} height={260} radius={R.lg}>
            <View style={{ flexDirection: 'row', gap: 6, padding: S.md }}>
              {isLiveNow(e.startsAt, e.endsAt) ? <Badge label="ŞU AN SAHNEDE" color={C.play} solid /> : null}
              {e.source === 'DEMO' ? <Badge label="DEMO" color={C.text} /> : null}
            </View>
            <View style={detailStyles.heroBottom}>
              <Text style={detailStyles.heroTitle}>{e.title}</Text>
              <GenrePills genres={e.genres} onCover />
            </View>
          </Cover>

          <View style={{ marginTop: S.md }}>
            <InfoRow ios="calendar" android="event" label={fullDate(e.startsAt)} value={e.endsAt ? `Bitiş ~${fullDate(e.endsAt).split(' · ')[1]}` : null} color={C.place} />
            <InfoRow
              ios="mappin.and.ellipse"
              android="location_on"
              label={e.venue.name}
              value={e.venue.address ?? e.venue.district}
              color={C.place}
              onPress={() => router.push({ pathname: '/venue/[slug]', params: { slug: e.venue.slug } })}
            />
            <InfoRow ios="ticket" android="confirmation_number" label={price(e.priceFrom) ?? 'Fiyat açıklanmadı'} value={e.priceFrom ? 'başlayan fiyatlarla' : null} color={C.place} />
          </View>

          {e.artists.length ? (
            <>
              <SectionHeader title="Sahnede" accent={C.play} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                {e.artists.map((a, i) => (
                  <PressLink
                    key={a.slug}
                    href={{ pathname: '/artist/[slug]', params: { slug: a.slug } }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: i === 0 ? alpha(C.play, 0.16) : C.card }}>
                      <Icon ios="music.mic" android="mic" size={15} color={i === 0 ? C.play : C.dim} />
                      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{a.name}</Text>
                  </PressLink>
                ))}
              </View>
            </>
          ) : null}

          {e.description ? (
            <>
              <SectionHeader title="Hakkında" />
              <Text style={detailStyles.body}>{e.description}</Text>
            </>
          ) : null}

          <View style={detailStyles.actions}>
            {e.ticketUrl ? (
              <Button label="Bilet al" color={C.play} onPress={() => openTicket(e.ticketUrl!)} icon={<Icon ios="ticket.fill" android="confirmation_number" size={18} color={C.bg} />} />
            ) : (
              <Button label="Bilet bağlantısı yakında" color={C.play} disabled />
            )}
            {e.genres[0] ? (
              <Button
                label={station?.genre === e.genres[0].slug ? `${e.genres[0].name} çalıyor` : `${e.genres[0].name} dinle`}
                variant="ghost"
                color={e.genres[0].color}
                onPress={() => playGenre(e.genres[0].slug)}
                icon={<Icon ios="dot.radiowaves.left.and.right" android="radio" size={18} color={e.genres[0].color} />}
              />
            ) : null}
            <Button
              label="Haritada aç"
              variant="ghost"
              color={C.place}
              onPress={() => openMaps(e.venue.name, e.venue.lat, e.venue.lng)}
              icon={<Icon ios="map" android="map" size={18} color={C.place} />}
            />
          </View>
          {e.source === 'DEMO' ? <Muted style={{ marginTop: S.lg, fontSize: 12, textAlign: 'center' }}>Bu etkinlik geliştirme amaçlı demo veridir.</Muted> : null}
        </>
      ) : null}
    </DetailScreen>
  );
}
