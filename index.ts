// Custom entry: boot expo-router as usual, then register the Android widget
// task handler + configuration screen (Android only; the library is a no-op
// elsewhere). Set as `main` in package.json.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
  } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  const { WidgetConfigurationScreen } = require('./src/widgets/WidgetConfigurationScreen');

  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigurationScreen);
}
