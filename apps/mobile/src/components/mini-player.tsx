import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, C, R, S } from '@/lib/theme';
import { usePlayer } from '@/player/player-context';
import { Equalizer } from './equalizer';
import { Icon } from './icon';

/** Sekme çubuğundaki küçük oynatıcı. compact: iOS 26 küçültülmüş (inline) sekme çubuğu. */
export function MiniPlayer({ compact, floating }: { compact?: boolean; floating?: boolean }) {
  const router = useRouter();
  const { station, state, discover, toggle } = usePlayer();
  if (!station) return null;
  const t = discover?.track;
  const line = state === 'error' ? 'Yayına ulaşılamadı' : t?.raw ?? station.name;

  return (
    <Pressable
      onPress={() => router.navigate('/')}
      style={[styles.wrap, floating && styles.floating, floating && { borderColor: alpha(station.color, 0.4) }]}>
      <View style={[styles.art, { backgroundColor: alpha(station.color, 0.25) }]}>
        <Equalizer playing={state === 'playing'} color={station.color} size={compact ? 12 : 16} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {line}
        </Text>
        {!compact ? (
          <Text style={styles.sub} numberOfLines={1}>
            {t?.raw ? station.name : 'Canlı'}
          </Text>
        ) : null}
      </View>
      <Pressable hitSlop={12} onPress={toggle} style={styles.btn}>
        {state === 'loading' ? (
          <ActivityIndicator color={C.text} size="small" />
        ) : (
          <Icon ios={state === 'playing' ? 'pause.fill' : 'play.fill'} android={state === 'playing' ? 'pause' : 'play_arrow'} size={compact ? 18 : 22} />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md },
  floating: {
    position: 'absolute',
    left: S.md,
    right: S.md,
    height: 60,
    borderRadius: R.md,
    backgroundColor: C.card2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  art: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 14, fontWeight: '700' },
  sub: { color: C.dim, fontSize: 12 },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
