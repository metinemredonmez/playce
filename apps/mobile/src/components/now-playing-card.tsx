import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFavorites } from '@/lib/favorites';
import { alpha, C, R, S } from '@/lib/theme';
import { usePlayer } from '@/player/player-context';
import { Equalizer } from './equalizer';
import { Icon } from './icon';

/** Dinle ekranının üstündeki büyük oynatıcı. */
export function NowPlayingCard({ onStart, startLabel }: { onStart: () => void; startLabel: string }) {
  const { station, state, discover, toggle } = usePlayer();
  const fav = useFavorites();
  const color = station?.color ?? C.play;
  const track = discover?.track;
  const busy = state === 'loading';
  const playing = state === 'playing';

  const headline = !station ? 'Müziği aç, şehri keşfet' : track?.title ?? track?.raw ?? station.name;
  const subline = !station
    ? 'Dinlediğin sese göre bu gece nereye gideceğini gösterelim.'
    : state === 'error'
      ? 'Yayına ulaşılamadı — başka bir istasyon dene.'
      : track?.artist ?? (station.hasMetadata ? 'Canlı yayın' : 'Canlı yayın · parça bilgisi yok');

  return (
    <LinearGradient
      colors={[alpha(color, 0.55), alpha(C.violet, 0.25), C.card]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <View style={styles.top}>
        <View style={styles.live}>
          <View style={[styles.liveDot, { backgroundColor: playing ? C.play : C.faint }]} />
          <Text style={styles.liveText}>{station ? station.name.toUpperCase() : 'CANLI RADYO'}</Text>
        </View>
        {station ? (
          <Pressable hitSlop={10} onPress={() => fav.toggleStation(station)}>
            <Icon
              ios={fav.isStationFav(station.streamUrl) ? 'heart.fill' : 'heart'}
              android="favorite"
              size={22}
              color={fav.isStationFav(station.streamUrl) ? C.play : C.text}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: S.xl, gap: 6 }}>
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={styles.subline} numberOfLines={2}>
          {subline}
        </Text>
      </View>

      <View style={styles.bottom}>
        {station ? <Equalizer playing={playing} color={color} size={28} bars={5} /> : <Text style={styles.startHint}>{startLabel}</Text>}
        <Pressable
          onPress={station ? toggle : onStart}
          style={({ pressed }) => [styles.playBtn, { backgroundColor: C.text }, pressed && { transform: [{ scale: 0.95 }] }]}>
          {busy ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Icon ios={playing ? 'pause.fill' : 'play.fill'} android={playing ? 'pause' : 'play_arrow'} size={26} color={C.bg} />
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: alpha('#FFFFFF', 0.08) },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  headline: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, lineHeight: 32 },
  subline: { color: alpha(C.text, 0.75), fontSize: 15 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xl },
  playBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  startHint: { color: alpha(C.text, 0.8), fontSize: 14, fontWeight: '600', flexShrink: 1, marginRight: S.md },
});
