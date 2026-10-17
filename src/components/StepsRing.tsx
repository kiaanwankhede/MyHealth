import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme';

type Props = { percent: number; size?: number; stroke?: number };

export function StepsRing({ percent, size = 96, stroke = 12 }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  const c = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.ringTrack} strokeWidth={stroke} />
      {filled > 0 && (
        <Circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={colors.orange}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      )}
    </Svg>
  );
}
