import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, typography } from '../src/theme';
import { CardStack } from '../src/components/wallet/CardStack';
import { FidelityCard } from '../src/types';

const SAMPLE_CARDS: Omit<FidelityCard, 'id' | 'sortIndex' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Esselunga', code: '8003520014009', format: 'EAN13', logoSlug: 'esselunga', color: '#00205b' },
  { name: 'Coop', code: '2345678901234', format: 'EAN13', color: '#D32F2F' },
  { name: 'IKEA', code: 'https://ikea.com/loyalty/1234567', format: 'QR', color: '#0051BA' },
  { name: 'Decathlon', code: '34567890', format: 'EAN8', color: '#0082C3' },
  { name: 'Lidl', code: 'LIDL90281773', format: 'CODE128', color: '#FFE500' },
];

function makeCard(
  sample: (typeof SAMPLE_CARDS)[number],
  index: number
): FidelityCard {
  const now = new Date().toISOString();
  return {
    ...sample,
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sortIndex: index,
    createdAt: now,
    updatedAt: now,
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, addCard, clearAll } = useCardsStore();
  const { sortMode, themeMode, setThemeMode } = useSettingsStore();

  const cardsList = getSortedCards(cards, sortMode);

  const handleAddSample = () => {
    const sample = SAMPLE_CARDS[Object.keys(cards).length % SAMPLE_CARDS.length];
    addCard(makeCard(sample, Object.keys(cards).length));
  };

  const cycleTheme = () => {
    const modes = ['system', 'light', 'dark'] as const;
    const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
    setThemeMode(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Tesserone</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Phase 4a — Static card stack
        </Text>
      </View>

      <View style={styles.stackWrap}>
        <CardStack cards={cardsList} />
      </View>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        <Pressable style={styles.button} onPress={handleAddSample}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>
            + Card
          </Text>
        </Pressable>
        <Pressable style={styles.button} onPress={cycleTheme}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>
            {themeMode}
          </Text>
        </Pressable>
        <Pressable style={styles.button} onPress={clearAll}>
          <Text style={[typography.label, { color: '#ff6b6b', fontWeight: '600' }]}>
            Clear
          </Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {cardsList.length} cards
        </Text>
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
