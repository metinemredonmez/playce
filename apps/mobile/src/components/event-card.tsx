import { StyleSheet, Text, View } from 'react-native';
import { EventCard } from '@/lib/api';
import { dateBadge, dayLabel, isLiveNow, price, timeLabel } from '@/lib/format';
import { alpha, C, R, S } from '@/lib/theme';
import { Cover } from './cover';
import { PressLink } from './press-link';
import { Badge, GenrePills } from './ui';

const colorsOf = (e: EventCard) => e.genres.map((g) => g.color);

/** Liste satırı: solda tarih kapağı, sağda bilgiler. */
export function EventRow({ event, highlight }: { event: EventCard; highlight?: string }) {
  const d = dateBadge(event.startsAt);
  const live = isLiveNow(event.startsAt, event.endsAt);
  const p = price(event.priceFrom);
  return (
    <PressLink href={{ pathname: '/event/[slug]', params: { slug: event.slug } }} style={[styles.row, highlight ? { borderColor: alpha(highlight, 0.6) } : null]}>
        <Cover colors={colorsOf(event)} uri={event.coverUrl} height={84} radius={12} style={{ width: 72 }}>
          <View style={styles.dateBox}>
            <Text style={styles.dateDay}>{d.day}</Text>
            <Text style={styles.dateMonth}>{d.month}</Text>
          </View>
        </Cover>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {live ? <Badge label="ŞU AN" color={C.play} solid /> : <Text style={styles.when}>{dayLabel(event.startsAt)} · {timeLabel(event.startsAt)}</Text>}
            {event.source === 'DEMO' ? <Badge label="DEMO" color={C.faint} /> : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {event.venue.name} · {event.venue.district}
            {p ? `  ·  ${p}` : ''}
          </Text>
          <GenrePills genres={event.genres} max={2} />
        </View>
    </PressLink>
  );
}

/** Yatay şerit kartı. */
export function EventTile({ event }: { event: EventCard }) {
  const live = isLiveNow(event.startsAt, event.endsAt);
  return (
    <PressLink href={{ pathname: '/event/[slug]', params: { slug: event.slug } }} style={{ width: 210 }}>
        <Cover colors={colorsOf(event)} uri={event.coverUrl} height={118} radius={R.md}>
          <View style={styles.tileTop}>
            {live ? <Badge label="ŞU AN" color={C.play} solid /> : <Badge label={dayLabel(event.startsAt).toUpperCase()} color={C.text} />}
            {event.source === 'DEMO' ? <Badge label="DEMO" color={C.text} /> : null}
          </View>
          <Text style={styles.tileTime}>{timeLabel(event.startsAt)}</Text>
        </Cover>
        <Text style={[styles.title, { marginTop: S.sm }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {event.venue.name} · {event.venue.district}
        </Text>
    </PressLink>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: S.md,
    padding: S.sm,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  dateBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  dateMonth: { color: C.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, opacity: 0.85 },
  when: { color: C.place, fontSize: 12, fontWeight: '700' },
  title: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { color: C.dim, fontSize: 13 },
  tileTop: { flexDirection: 'row', gap: 6, padding: S.sm },
  tileTime: { position: 'absolute', bottom: 8, left: 10, color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
});
