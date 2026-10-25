// Custom entry: start Expo Router, then register the home-screen widget's background handler.
// The widget is optional: if its native part fails to load, the app must still open.
import 'expo-router/entry';

try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch (e) {
  console.warn('Home-screen widget unavailable', e);
}

// Background refresh for the steps notification on the lock screen. Optional in the same way.
try {
  require('./src/notifications/stepsStatusTask');
} catch (e) {
  console.warn('Steps notification task unavailable', e);
}
