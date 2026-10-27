import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import { GenreRef } from '@/lib/api';
import { alpha, C, R, S } from '@/lib/theme';

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: S.lg }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionHeader({ title, accent, action }: { title: string; accent?: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, flexShrink: 1 }}>
        {accent ? <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: accent }} /> : null}
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function Chip({ label, active, color = C.play, onPress }: { label: string; active?: boolean; color?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: alpha(color, 0.18), borderColor: color },
        pressed && { opacity: 0.7 },
      ]}>
      {active ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Yatay kayan çip satırı (ekran kenarına taşar). */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm }}>
      {children}
    </ScrollView>
  );
}

/** onCover: renkli kapak üstünde okunur kalsın diye koyu zemin + beyaz yazı. */
export function GenrePills({ genres, max = 3, onCover }: { genres: GenreRef[]; max?: number; onCover?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {genres.slice(0, max).map((g) => (
        <View key={g.slug} style={[styles.pill, { backgroundColor: onCover ? alpha(C.bg, 0.55) : alpha(g.color, 0.16) }]}>
          <View style={[styles.dot, { backgroundColor: g.color }]} />
          <Text style={[styles.pillText, { color: onCover ? C.text : g.color }]}>{g.name}</Text>
        </View>
      ))}
    </View>
  );
}

export function Badge({ label, color = C.play, solid }: { label: string; color?: string; solid?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: solid ? color : alpha(color, 0.18) }]}>
      <Text style={[styles.badgeText, { color: solid ? C.bg : color }]}>{label}</Text>
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[{ color: C.dim, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {hint ? <Muted style={{ textAlign: 'center', marginTop: 6 }}>{hint}</Muted> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  color = C.play,
  variant = 'solid',
  icon,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  variant?: 'solid' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        solid ? { backgroundColor: color } : { borderColor: alpha(color, 0.5), borderWidth: 1 },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
      ]}>
      {icon}
      <Text style={[styles.buttonText, { color: solid ? C.bg : color }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  sub: { color: C.dim, fontSize: 15, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xl, marginBottom: S.md },
  sectionTitle: { color: C.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  chipText: { color: C.dim, fontSize: 14, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  empty: { padding: S.xxl, alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, marginTop: S.md },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: R.pill, paddingHorizontal: S.xl },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
