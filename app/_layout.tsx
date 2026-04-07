import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '../src/theme';

function Inner() {
  const { dark, colors } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
