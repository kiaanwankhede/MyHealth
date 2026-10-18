import type { SQLiteDatabase } from 'expo-sqlite';

import type { WidgetSnapshot } from './snapshot';
import { saveSnapshot } from './widgetData';

/** Called by the app whenever it has fresh numbers: saves them and redraws any widgets on the home screen. */
export async function updateWidget(db: SQLiteDatabase, snapshot: WidgetSnapshot): Promise<void> {
  await saveSnapshot(db, snapshot);
  // Loaded here rather than at the top so a widget problem can never stop the app from opening.
  const { requestWidgetUpdate } =
    require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { StepsWidget, WIDGET_NAME } = require('./StepsWidget') as typeof import('./StepsWidget');
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => <StepsWidget snapshot={snapshot} width={info.width} />,
  });
}
