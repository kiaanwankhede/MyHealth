import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatCount } from '../lib/format';
import { stepsLine, type WidgetSnapshot } from './snapshot';

export const WIDGET_NAME = 'Sehat';

// Widgets only take hex colours; these match src/theme.ts.
const C = {
  surface: '#FBFCF9',
  ink: '#14231F',
  muted: '#4A5A55',
  teal: '#0B7262',
  orange: '#E07B39',
  orangeDark: '#B04A12',
  track: '#E3E9E2',
  border: '#DDE5DC',
} as const;

function time(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Home-screen widget: today's steps with progress and the retro goal; weight trend and goal when wide enough. */
export function StepsWidget({ snapshot, width }: { snapshot: WidgetSnapshot | null; width: number }) {
  if (!snapshot) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: C.surface,
          borderRadius: 24,
          padding: 16,
          justifyContent: 'center',
        }}
      >
        <TextWidget text="Open Sehat to load your steps" style={{ fontSize: 14, color: C.muted }} />
      </FlexWidget>
    );
  }

  const filled = Math.min(100, Math.max(0, snapshot.percent));
  const wide = width >= 240;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.surface,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'row',
        flexGap: 14,
      }}
    >
      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget text="STEPS TODAY" style={{ fontSize: 11, fontWeight: 'bold', color: C.teal, letterSpacing: 0.08 }} />
        <TextWidget text={formatCount(snapshot.steps)} style={{ fontSize: 30, fontWeight: 'bold', color: C.ink }} />
        <TextWidget text={stepsLine(snapshot)} style={{ fontSize: 13, color: C.muted }} />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 8,
            marginTop: 6,
            backgroundColor: C.track,
            borderRadius: 4,
            flexDirection: 'row',
          }}
        >
          {filled > 0 && (
            <FlexWidget style={{ flex: filled, height: 'match_parent', backgroundColor: C.orange, borderRadius: 4 }} />
          )}
          {filled < 100 && <FlexWidget style={{ flex: 100 - filled, height: 'match_parent' }} />}
        </FlexWidget>
        {snapshot.retro && (
          <TextWidget
            text={snapshot.retro}
            maxLines={2}
            truncate="END"
            style={{ fontSize: 12, fontWeight: '600', color: C.orangeDark, marginTop: 6 }}
          />
        )}
      </FlexWidget>

      {wide && (
        <FlexWidget
          style={{
            width: 120,
            height: 'match_parent',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeftWidth: 1,
            borderLeftColor: C.border,
            paddingLeft: 12,
          }}
        >
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget text="WEIGHT TREND" style={{ fontSize: 11, fontWeight: 'bold', color: C.teal }} />
            <TextWidget text={snapshot.trendKg ?? '–'} style={{ fontSize: 22, fontWeight: 'bold', color: C.ink }} />
            {snapshot.goalLine && (
              <TextWidget
                text={snapshot.goalLine}
                maxLines={3}
                truncate="END"
                style={{ fontSize: 12, color: C.muted, marginTop: 2 }}
              />
            )}
          </FlexWidget>
          <TextWidget text={`Updated ${time(snapshot.updatedAt)}`} style={{ fontSize: 10, color: C.muted }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
