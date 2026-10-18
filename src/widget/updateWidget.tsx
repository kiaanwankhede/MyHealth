import type { SQLiteDatabase } from 'expo-sqlite';
import { requestWidgetUpdate } from 'react-native-android-widget';

import type { WidgetSnapshot } from './snapshot';
import { StepsWidget, WIDGET_NAME } from './StepsWidget';
import { saveSnapshot } from './widgetData';

/** Called by the app whenever it has fresh numbers: saves them and redraws any widgets on the home screen. */
export async function updateWidget(db: SQLiteDatabase, snapshot: WidgetSnapshot): Promise<void> {
  await saveSnapshot(db, snapshot);
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => <StepsWidget snapshot={snapshot} width={info.width} />,
  });
}
