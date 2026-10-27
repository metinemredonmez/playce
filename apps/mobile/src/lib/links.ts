import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export function openMaps(name: string, lat: number | null, lng: number | null) {
  const q = encodeURIComponent(name);
  const url =
    lat !== null && lng !== null
      ? Platform.select({ ios: `maps:?q=${q}&ll=${lat},${lng}`, default: `geo:${lat},${lng}?q=${lat},${lng}(${q})` })
      : Platform.select({ ios: `maps:?q=${q}`, default: `geo:0,0?q=${q}` });
  Linking.openURL(url).catch(() => {});
}

export function openTicket(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}
