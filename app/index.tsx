import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, typography, textOnColor } from '../src/theme';
import { CardStack } from '../src/components/wallet/CardStack';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, clearAll } = useCardsStore();
  const { sortMode } = useSettingsStore();
  const [fabOpen, setFabOpen] = useState(false);

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

      {/* FAB overlay: scrim + menu items when open */}
      {fabOpen && (
        <Pressable style={styles.scrim} onPress={() => setFabOpen(false)}>
          <View style={[styles.fabMenu, { bottom: insets.bottom + 80 }]}>
            <Pressable
              style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
              onPress={() => { setFabOpen(false); router.push('/add'); }}
            >
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                Add Card
              </Text>
            </Pressable>
            <Pressable
              style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
              onPress={() => { setFabOpen(false); router.push('/settings'); }}
            >
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                Settings
              </Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* FAB button */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.fab, { backgroundColor: fabOpen ? colors.surface : colors.accent }]}
          onPress={() => setFabOpen((v) => !v)}
        >
          <Text style={{
            color: fabOpen ? colors.text : textOnColor(colors.accent),
            fontSize: 22,
          }}>
            {fabOpen ? '✕' : '☰'}
          </Text>
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
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    gap: 8,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    zIndex: 100,
  },
  fab: {
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
