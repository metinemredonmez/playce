import { AndroidSymbol, SFSymbol, SymbolView } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';
import { C } from '@/lib/theme';

// iOS'ta SF Symbols, Android'de Material Symbols.
export function Icon({
  ios,
  android,
  size = 20,
  color = C.text,
  style,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} style={[{ width: size, height: size }, style]} />;
}
