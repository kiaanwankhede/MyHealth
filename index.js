// Custom entry: register the home-screen widget's background handler, then start Expo Router.
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
