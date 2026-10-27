import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFavorites } from '@/lib/favorites';
import { alpha, C, R, S } from '@/lib/theme';
import { PlayableStation, usePlayer } from '@/player/player-context';
import { Equalizer } from './equalizer';
import { Icon } from './icon';

export function StationRow({ station, subtitle }: { station: PlayableStation; subtitle?: string }) {
  const { station: current, state, play, toggle } = usePlayer();
  const fav = useFavorites();
  const isCurrent = current?.streamUrl === station.streamUrl;
  const isFav = fav.isStationFav(station.streamUrl);

  return (
    <Pressable
      onPress={() => (isCurrent ? toggle() : play(station))}
      style={({ pressed }) => [styles.row, isCurrent && { backgroundColor: alpha(station.color, 0.14), borderColor: alpha(station.color, 0.5) }, pressed && { opacity: 0.75 }]}>
      <View style={[styles.logo, { backgroundColor: alpha(station.color, 0.22) }]}>
        {station.logoUrl ? (
          <Image source={{ uri: station.logoUrl }} style={styles.logoImg} contentFit="cover" />
        ) : isCurrent ? (
          <Equalizer playing={state === 'playing'} color={station.color} size={18} />
        ) : (
          <Text style={[styles.initial, { color: station.color }]}>{station.name.slice(0, 1)}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {isCurrent && state === 'loading' ? 'Bağlanıyor…' : isCurrent && state === 'error' ? 'Yayına ulaşılamadı' : subtitle}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={() => fav.toggleStation(station)} style={{ padding: 4 }}>
        <Icon ios={isFav ? 'heart.fill' : 'heart'} android="favorite" size={20} color={isFav ? C.play : C.faint} />
      </Pressable>
      <View style={[styles.play, { backgroundColor: isCurrent ? station.color : C.card2 }]}>
        <Icon
          ios={isCurrent && state !== 'paused' ? 'pause.fill' : 'play.fill'}
          android={isCurrent && state !== 'paused' ? 'pause' : 'play_arrow'}
          size={16}
          color={isCurrent ? C.bg : C.text}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.sm,
    paddingRight: S.md,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  logo: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 48, height: 48 },
  initial: { fontSize: 20, fontWeight: '800' },
  name: { color: C.text, fontSize: 16, fontWeight: '700' },
  sub: { color: C.dim, fontSize: 13, marginTop: 2 },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
