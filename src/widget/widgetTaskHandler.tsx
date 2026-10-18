import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { StepsWidget } from './StepsWidget';
import { openWidgetDatabase, refreshSnapshot } from './widgetData';

/** Runs in the background whenever Android asks the widget to draw (added, resized, every 30 min). */
export async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const db = await openWidgetDatabase();
  const snapshot = await refreshSnapshot(db);
  renderWidget(<StepsWidget snapshot={snapshot} width={widgetInfo.width} />);
}
