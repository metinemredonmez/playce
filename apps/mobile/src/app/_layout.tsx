import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FavoritesProvider } from '@/lib/favorites';
import { C } from '@/lib/theme';
import { PlayerProvider } from '@/player/player-context';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.play, text: C.text, border: C.line },
};

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <FavoritesProvider>
        <PlayerProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: C.bg },
                headerTintColor: C.text,
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: C.bg },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="event/[slug]" options={{ title: '' }} />
              <Stack.Screen name="venue/[slug]" options={{ title: '' }} />
              <Stack.Screen name="artist/[slug]" options={{ title: '' }} />
            </Stack>
          </ThemeProvider>
        </PlayerProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}
