import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { alpha, C } from '@/lib/theme';

// Görsel yoksa türün renklerinden "frekans halkalı" degrade kapak; varsa fotoğraf + karartma.
export function Cover({
  colors,
  uri,
  height,
  radius = 16,
  rings = true,
  style,
  children,
}: {
  colors: string[];
  uri?: string | null;
  height: number;
  radius?: number;
  rings?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const a = colors[0] ?? C.play;
  const b = colors[1] ?? C.violet;
  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: C.card }, style]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <LinearGradient colors={['transparent', alpha(C.bg, 0.85)]} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <>
          <LinearGradient
            colors={[alpha(a, 0.95), alpha(b, 0.6), alpha(C.card, 1)]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {rings &&
            [1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  right: -i * 34 + 24,
                  top: -i * 34 + 24,
                  width: i * 68,
                  height: i * 68,
                  borderRadius: i * 34,
                  borderWidth: 1.2,
                  borderColor: `rgba(255,255,255,${0.2 - i * 0.035})`,
                }}
              />
            ))}
        </>
      )}
      {children}
    </View>
  );
}
