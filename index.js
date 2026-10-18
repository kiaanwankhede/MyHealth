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
