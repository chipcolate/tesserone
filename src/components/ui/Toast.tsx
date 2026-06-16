import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastInstance extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(opts: ToastOptions) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastInstance | null>(null);
  const idRef = useRef(0);

  const show = useCallback((opts: ToastOptions) => {
    idRef.current += 1;
    setToast({ ...opts, id: idRef.current });
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastHost toast={toast} onHide={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastHost({ toast, onHide }: { toast: ToastInstance; onHide: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(140);
  const opacity = useSharedValue(0);

  const hide = useCallback(() => {
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(140, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onHide)();
    });
  }, [onHide, opacity, translateY]);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 220 });
    opacity.value = withTiming(1, { duration: 220 });
    const timer = setTimeout(() => hide(), toast.duration ?? 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 16 }, animStyle]}
    >
      <Animated.View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text numberOfLines={2} style={[styles.message, { color: colors.text }]}>
          {toast.message}
        </Text>
        {toast.actionLabel ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              toast.onAction?.();
              hide();
            }}
          >
            <Text style={[styles.action, { color: colors.accent }]}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: CHROME_RADIUS,
  },
  message: {
    flex: 1,
    fontFamily: mono.regular,
    fontSize: 14,
  },
  action: {
    fontFamily: mono.bold,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
