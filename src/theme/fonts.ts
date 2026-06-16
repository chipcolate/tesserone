import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from '@expo-google-fonts/jetbrains-mono';

/**
 * Bundled monospace family. The "Raw Aesthetics" direction renders the whole UI
 * in mono; we use weight-specific family names (rather than `fontWeight`) so the
 * correct face loads consistently on both iOS and Android — mixing `fontWeight`
 * with a single family triggers faux-bolding on Android.
 */
export const mono = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  bold: 'JetBrainsMono_700Bold',
  extrabold: 'JetBrainsMono_800ExtraBold',
} as const;

/** Font map passed to `useFonts` in the root layout. */
export const fontAssets = {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
};
