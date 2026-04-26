import { useEffect, useState } from 'react';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useTranslation } from 'react-i18next';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { ThemeProvider, useTheme } from '../src/theme';
import { initI18n } from '../src/i18n';
import { useSettingsStore } from '../src/stores/settings';
import { useCardsStore } from '../src/stores/cards';
import { sweepOrphanLogos } from '../src/services/logos';

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
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
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

  if (!ready) return null;

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
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>{t('error.title')}</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable style={styles.errorButton} onPress={() => retry()}>
        <Text style={styles.errorButtonText}>{t('error.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorRoot: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#A0A0A0',
    fontSize: 15,
    lineHeight: 22,
  },
  errorButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6C2DD7',
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
