import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PLAYER_SPACE } from '@/lib/layout';
import { C, R, S } from '@/lib/theme';
import { Icon } from './icon';
import { Empty } from './ui';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/** Detay sayfası iskeleti: yükleniyor / hata durumları + kaydırılabilir içerik. */
export function DetailScreen({ loading, error, children }: { loading: boolean; error: boolean; children: ReactNode }) {
  if (loading) return <ActivityIndicator color={C.dim} style={{ flex: 1, backgroundColor: C.bg }} />;
  if (error)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: S.lg }}>
        <Empty title="Bulunamadı" hint="Bu sayfa kaldırılmış olabilir." />
      </View>
    );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl + PLAYER_SPACE }}>
      {children}
    </ScrollView>
  );
}

export function InfoRow({
  ios,
  android,
  label,
  value,
  color = C.dim,
  onPress,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  label: string;
  value?: string | null;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.info, pressed && { opacity: 0.7 }]}>
      <View style={styles.infoIcon}>
        <Icon ios={ios} android={android} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {value ? <Text style={styles.infoValue}>{value}</Text> : null}
      </View>
      {onPress ? <Icon ios="chevron.right" android="chevron_right" size={14} color={C.faint} /> : null}
    </Pressable>
  );
}

export const detailStyles = StyleSheet.create({
  heroTitle: { color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: -1, lineHeight: 34 },
  heroBottom: { position: 'absolute', left: S.lg, right: S.lg, bottom: S.lg, gap: S.sm },
  body: { color: C.dim, fontSize: 15, lineHeight: 22 },
  actions: { gap: S.sm, marginTop: S.xl },
});

const styles = StyleSheet.create({
  info: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  infoIcon: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  infoValue: { color: C.dim, fontSize: 13, marginTop: 1 },
});
