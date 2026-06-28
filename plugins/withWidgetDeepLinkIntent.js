/**
 * Makes Android widget/deep-link intents reliable.
 *
 * When the app's React Native context isn't ready yet (cold launch / a resume
 * after the OS reclaimed the JS context), `onNewIntent` is dropped before any JS
 * — including expo-router — can see the URL, so a widget tap just opens the home
 * screen. Overriding `onNewIntent` to call `setIntent(intent)` stores the URL on
 * the activity so `Linking.getInitialURL()` can recover it once JS mounts (see
 * the recovery effect in app/index.tsx).
 */
const { withMainActivity } = require('expo/config-plugins');

const OVERRIDE = `
  // Store deep-link intents that arrive before the RN context is ready so
  // Linking.getInitialURL() can recover them once JS mounts (widget taps).
  override fun onNewIntent(intent: android.content.Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }
`;

module.exports = function withWidgetDeepLinkIntent(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withWidgetDeepLinkIntent: expected a Kotlin MainActivity');
    }
    let src = cfg.modResults.contents;
    if (src.includes('override fun onNewIntent')) return cfg; // idempotent
    if (!/class MainActivity : ReactActivity\(\) \{/.test(src)) {
      throw new Error('withWidgetDeepLinkIntent: could not find MainActivity class declaration');
    }
    src = src.replace(/class MainActivity : ReactActivity\(\) \{/, (m) => `${m}\n${OVERRIDE}`);
    cfg.modResults.contents = src;
    return cfg;
  });
};
