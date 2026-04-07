import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, textOnColor, typography } from '../src/theme';
import { FidelityCard } from '../src/types';

const SAMPLE_CARDS: Omit<FidelityCard, 'id' | 'sortIndex' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Esselunga', code: '1234567890123', format: 'EAN13', color: '#1B5E20' },
  { name: 'Coop', code: '9876543210987', format: 'EAN13', color: '#D32F2F' },
  { name: 'IKEA', code: 'IKEA-FAMILY-001', format: 'CODE128', color: '#0051BA', logoSlug: 'ikea' },
];

function makeCard(sample: (typeof SAMPLE_CARDS)[number], index: number): FidelityCard {
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
  const { cards, addCard, removeCard, clearAll } = useCardsStore();
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

  // Draggable test card
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      scale.value = withSpring(1.05, { damping: 15, stiffness: 250 });
    })
    .onUpdate((event) => {
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Text style={[typography.title, { color: colors.text }]}>Tesserone</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
        Phase 0–2: Reanimated + Stores + Theme
      </Text>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.dragCard, { backgroundColor: colors.accent }, animatedStyle]}>
          <Text style={[typography.label, { color: textOnColor(colors.accent), fontWeight: '600' }]}>
            Drag me
          </Text>
        </Animated.View>
      </GestureDetector>

      <View style={styles.buttons}>
        <Pressable style={[styles.button, { backgroundColor: colors.surface }]} onPress={handleAddSample}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>+ Add Card</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: colors.surface }]} onPress={cycleTheme}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>
            Theme: {themeMode}
          </Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: '#7f1d1d' }]} onPress={clearAll}>
          <Text style={[typography.label, { color: '#F5F5F5', fontWeight: '600' }]}>Clear</Text>
        </Pressable>
      </View>

      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 12 }]}>
        {cardsList.length} cards (sort: {sortMode})
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {cardsList.map((card) => {
          const bg = card.color || '#333';
          return (
            <Pressable
              key={card.id}
              style={[styles.cardRow, { backgroundColor: bg }]}
              onPress={() => removeCard(card.id)}
            >
              <Text style={[typography.cardName, { color: textOnColor(bg) }]}>{card.name}</Text>
              <Text style={[typography.caption, { color: textOnColor(bg), opacity: 0.7, marginTop: 4 }]}>
                {card.format} | {card.code} | tap to remove
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  dragCard: {
    width: 200,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  list: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  cardRow: {
    padding: 16,
    borderRadius: 12,
  },
});
