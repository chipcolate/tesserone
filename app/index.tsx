import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, typography } from '../src/theme';
import { CardStack } from '../src/components/wallet/CardStack';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, clearAll } = useCardsStore();
  const { sortMode } = useSettingsStore();

  const cardsList = getSortedCards(cards, sortMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onLongPress={clearAll}>
          <Text style={[typography.title, { color: colors.text }]}>Tesserone</Text>
        </Pressable>
      </View>

      <View style={styles.stackWrap}>
        {cardsList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>+</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Add your first card
            </Text>
          </View>
        ) : (
          <CardStack cards={cardsList} />
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/add')}
        >
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  stackWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    fontWeight: '200',
  },
  bottomBar: {
    alignItems: 'center',
    paddingTop: 12,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
