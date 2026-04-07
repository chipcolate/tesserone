import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Tesserone</Text>
      <Text style={styles.subtitle}>Drag the card to test Reanimated + Gesture Handler</Text>

      <View style={styles.cardArea}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <Text style={styles.cardName}>Esselunga</Text>
            <Text style={styles.cardCode}>1234 5678 9012</Text>
          </Animated.View>
        </GestureDetector>
      </View>

      <Text style={styles.hint}>
        Card should spring back to center on release
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  cardCode: {
    fontSize: 16,
    fontFamily: 'Courier',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 40,
  },
});
