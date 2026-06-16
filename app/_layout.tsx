import { useEffect, useState } from 'react';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { useTranslation } from 'react-i18next';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { ThemeProvider, useTheme } from '../src/theme';
import { darkColors, lightColors, DEFAULT_ACCENT, textOnColor } from '../src/theme/colors';
import { mono } from '../src/theme/fonts';
import { CHROME_RADIUS } from '../src/theme/geometry';
import { fontAssets } from '../src/theme/fonts';
import { ToastProvider } from '../src/components/ui/Toast';
import { initI18n } from '../src/i18n';
import { useSettingsStore } from '../src/stores/settings';
import { useCardsStore } from '../src/stores/cards';
import { sweepOrphanLogos } from '../src/services/logos';
import { startWatchSync } from '../src/services/watch';

function Inner({ cardsReady }: { cardsReady: boolean }) {
  const { dark, colors } = useTheme();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  useEffect(() => {
    if (!cardsReady || !hasShareIntent) return;
    const file = shareIntent?.files?.[0];
    if (!file?.path) return;
    if (file.mimeType && !file.mimeType.startsWith('image/')) {
      resetShareIntent();
      return;
    }
    router.push({ pathname: '/add', params: { sharedImageUri: file.path } });
    resetShareIntent();
  }, [cardsReady, hasShareIntent, shareIntent, resetShareIntent]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <SafeAreaProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen
                name="add"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="card/[id]"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="settings"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </ToastProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const language = useSettingsStore((s) => s.language);
  const hydrated = useSettingsStore.persist?.hasHydrated?.() ?? true;
  const [ready, setReady] = useState(hydrated);

  const cardsHydrated = useCardsStore.persist?.hasHydrated?.() ?? true;
  const [cardsReady, setCardsReady] = useState(cardsHydrated);

  useEffect(() => {
    if (!ready) {
      const unsub = useSettingsStore.persist?.onFinishHydration?.(() => setReady(true));
      return unsub;
    }
  }, [ready]);

  useEffect(() => {
    if (!cardsReady) {
      const unsub = useCardsStore.persist?.onFinishHydration?.(() => setCardsReady(true));
      return unsub;
    }
  }, [cardsReady]);

  useEffect(() => {
    if (ready) initI18n(language);
  }, [ready, language]);

  useEffect(() => {
    if (cardsReady) sweepOrphanLogos(useCardsStore.getState().cards);
  }, [cardsReady]);

  useEffect(() => {
    if (!cardsReady) return;
    let cleanup: (() => void) | undefined;
    startWatchSync().then((c) => {
      cleanup = c;
    });
    return () => cleanup?.();
  }, [cardsReady]);

  if (!ready || !fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ShareIntentProvider>
        <Inner cardsReady={cardsReady} />
      </ShareIntentProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : lightColors;

  return (
    <View style={[styles.errorRoot, { backgroundColor: c.bg }]}>
      <Text style={[styles.errorTitle, { color: c.text }]}>{t('error.title')}</Text>
      <Text style={[styles.errorMessage, { color: c.textSecondary }]}>{error.message}</Text>
      <View style={styles.errorButtons}>
        <Pressable
          style={[styles.errorButton, { backgroundColor: DEFAULT_ACCENT }]}
          onPress={() => retry()}
        >
          <Text style={[styles.errorButtonText, { color: textOnColor(DEFAULT_ACCENT) }]}>
            {t('error.retry')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.errorButton, { borderColor: c.border, borderWidth: 1 }]}
          onPress={() => router.replace('/')}
        >
          <Text style={[styles.errorButtonText, { color: c.text }]}>
            {t('error.goHome', { defaultValue: 'Go Home' })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorRoot: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  errorTitle: {
    fontFamily: mono.bold,
    fontSize: 22,
  },
  errorMessage: {
    fontFamily: mono.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: CHROME_RADIUS,
  },
  errorButtonText: {
    fontFamily: mono.bold,
    fontSize: 15,
  },
});
