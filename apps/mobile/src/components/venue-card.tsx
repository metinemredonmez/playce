import { StyleSheet, Text, View } from 'react-native';
import { VenueCard as Venue } from '@/lib/api';
import { dayLabel, priceLevel, timeLabel } from '@/lib/format';
import { C, R, S } from '@/lib/theme';
import { Cover } from './cover';
import { Icon } from './icon';
import { PressLink } from './press-link';
import { Badge, GenrePills } from './ui';

export function VenueCard({ venue }: { venue: Venue }) {
  const next = venue.nextEvent;
  return (
    <PressLink href={{ pathname: '/venue/[slug]', params: { slug: venue.slug } }} style={styles.card}>
        <Cover colors={venue.genres.map((g) => g.color)} uri={venue.coverUrl} height={128} radius={0}>
          <View style={styles.coverTop}>
            {venue.tonight ? <Badge label="BU GECE AÇIK" color={C.place} solid /> : <View />}
            <Text style={styles.price}>{priceLevel(venue.priceLevel)}</Text>
          </View>
          <View style={styles.coverBottom}>
            <Text style={styles.name} numberOfLines={1}>
              {venue.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon ios="mappin.and.ellipse" android="location_on" size={13} color={C.text} />
              <Text style={styles.district}>{venue.district}</Text>
            </View>
          </View>
        </Cover>
        <View style={{ padding: S.md, gap: S.sm }}>
          <GenrePills genres={venue.genres} />
          {next ? (
            <Text style={styles.next} numberOfLines={1}>
              <Text style={{ color: venue.tonight ? C.place : C.dim, fontWeight: '700' }}>
                {dayLabel(next.startsAt)} {timeLabel(next.startsAt)}
              </Text>
              {'  '}
              {next.title}
            </Text>
          ) : (
            <Text style={[styles.next, { color: C.faint }]}>Yaklaşan etkinlik yok</Text>
          )}
        </View>
    </PressLink>
  );
}

/** Oynatıcı altındaki "bu türü çalan mekânlar" şeridi için küçük kart. */
export function VenueChip({ venue }: { venue: Venue }) {
  return (
    <PressLink href={{ pathname: '/venue/[slug]', params: { slug: venue.slug } }} style={styles.chip}>
        <Cover colors={venue.genres.map((g) => g.color)} uri={venue.coverUrl} height={44} radius={12} rings={false} style={{ width: 44 }} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.chipName} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={[styles.chipSub, venue.tonight && { color: C.place }]} numberOfLines={1}>
            {venue.tonight ? 'Bu gece açık' : venue.district}
          </Text>
        </View>
    </PressLink>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.md, overflow: 'hidden' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.sm },
  price: { color: C.text, fontSize: 13, fontWeight: '700', opacity: 0.85 },
  coverBottom: { position: 'absolute', left: S.md, right: S.md, bottom: S.md, gap: 2 },
  name: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  district: { color: C.text, fontSize: 13, fontWeight: '600', opacity: 0.9 },
  next: { color: C.text, fontSize: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.md, padding: 6, paddingRight: S.md, width: 190 },
  chipName: { color: C.text, fontSize: 14, fontWeight: '700' },
  chipSub: { color: C.dim, fontSize: 12 },
});
