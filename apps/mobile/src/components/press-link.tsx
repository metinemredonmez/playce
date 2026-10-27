import { Href, useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';

// Link asChild, Pressable'ın fonksiyon stillerini (pressed) uygulamıyor; bu yüzden router.push ile.
export function PressLink({ href, style, children }: { href: Href; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(href)} style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}
