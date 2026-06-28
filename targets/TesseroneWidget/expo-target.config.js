/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  displayName: 'Tesserone',
  bundleIdentifier: '.widget',
  // AppIntents-driven widget configuration (AppIntentConfiguration /
  // AppIntentTimelineProvider / containerBackground) is iOS 17+. The main app
  // stays at 15.1; the widget just isn't offered on older systems.
  deploymentTarget: '17.0',
  icon: '../../assets/icon.png',
  // Widget tint color. iOS renders the configuration sheet's parameter VALUES
  // (e.g. the chosen card name) in this tint — white was illegible on the light
  // sheet. Use a dynamic Chipcolate purple: the brand purple on the light sheet,
  // a lighter purple on the dark sheet (both ~6.5:1 contrast). The widget views
  // themselves don't use $accent (they draw on card colors).
  colors: {
    $accent: { light: '#6C2DD7', dark: '#A78BFA' },
  },
  // Declare the App Group explicitly: @bacons' appGroupsByDefault only inherits
  // when the group is in app.json's ios.entitlements, but here it's injected
  // natively by expo-share-intent — so the widget needs it spelled out to read
  // the shared snapshot container.
  entitlements: {
    'com.apple.security.application-groups': ['group.com.chipcolate.tesserone'],
  },
});
