import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { PressLink } from '@/components/press-link';
import { StationRow } from '@/components/station-row';
import { Empty, SectionHeader, Title } from '@/components/ui';
import { useFavorites } from '@/lib/favorites';
import { PLAYER_SPACE, topPadding } from '@/lib/layout';
import { C, R, S } from '@/lib/theme';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const fav = useFavorites();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: topPadding(insets.top), paddingHorizontal: S.lg, paddingBottom: S.xxl + PLAYER_SPACE }}>
      <Title sub="Sevdiğin istasyonlar ve mekânlar.">Favoriler</Title>

      <SectionHeader title="İstasyonlar" accent={C.play} />
      {fav.stations.length ? (
        <View style={{ gap: S.sm }}>
          {fav.stations.map((s) => (
            <StationRow key={s.streamUrl} station={s} subtitle="Favori" />
          ))}
        </View>
      ) : (
        <Empty title="Henüz favori istasyon yok" hint="Dinle sekmesinde bir istasyonun yanındaki kalbe dokun." />
      )}

      <SectionHeader title="Mekânlar" accent={C.place} />
      {fav.venues.length ? (
        <View style={{ gap: S.sm }}>
          {fav.venues.map((v) => (
            <PressLink key={v.slug} href={{ pathname: '/venue/[slug]', params: { slug: v.slug } }} style={styles.venue}>
                <Icon ios="mappin.and.ellipse" android="location_on" size={20} color={C.place} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.venueName}>{v.name}</Text>
                  <Text style={styles.venueSub}>{v.district}</Text>
                </View>
                <Icon ios="chevron.right" android="chevron_right" size={14} color={C.faint} />
            </PressLink>
          ))}
        </View>
      ) : (
        <Empty title="Henüz favori mekân yok" hint="Bir mekânın sayfasındaki kalbe dokun." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  venue: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.card, borderRadius: R.md },
  venueName: { color: C.text, fontSize: 16, fontWeight: '700' },
  venueSub: { color: C.dim, fontSize: 13 },
});
