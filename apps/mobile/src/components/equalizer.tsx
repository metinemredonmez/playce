import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

// Çalarken oynayan, durunca yatışan küçük ekolayzer.
export function Equalizer({ playing, color, size = 16, bars = 4 }: { playing: boolean; color: string; size?: number; bars?: number }) {
  const [vals] = useState(() => Array.from({ length: bars }, () => new Animated.Value(0.3)));

  useEffect(() => {
    if (!playing) {
      vals.forEach((v, i) => Animated.timing(v, { toValue: 0.2 + (i % 2) * 0.1, duration: 250, useNativeDriver: true }).start());
      return;
    }
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 280 + i * 85, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25 + (i % 3) * 0.12, duration: 320 + i * 60, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, vals]);

  const w = Math.max(2, Math.round(size / 6));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: size, gap: w * 0.8 }}>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          style={{ width: w, height: size, borderRadius: w, backgroundColor: color, transformOrigin: 'bottom', transform: [{ scaleY: v }] }}
        />
      ))}
    </View>
  );
}
