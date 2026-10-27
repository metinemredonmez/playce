import { Platform } from 'react-native';

// iOS 26+: mini oynatıcı sekme çubuğuna gömülü (Apple Music gibi). Diğerlerinde yüzen kart.
export const HAS_TAB_ACCESSORY = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;
export const TAB_BAR_HEIGHT = Platform.select({ ios: 50, android: 80, default: 0 });
/** Yüzen mini oynatıcı içeriği örtmesin diye listelerin altına eklenecek boşluk. */
export const PLAYER_SPACE = HAS_TAB_ACCESSORY ? 0 : 76;

/**
 * Sekme ekranlarında üst boşluk. iOS'ta ScrollView'in otomatik içerik inset'i güvenli alanı
 * zaten ekliyor; Android'de elle eklemek gerekiyor.
 */
export function topPadding(insetTop: number) {
  return Platform.OS === 'ios' ? 8 : insetTop + 8;
}
