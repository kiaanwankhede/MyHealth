/** 7842 -> "7,842". Avoids Intl so output is identical on every device. */
export function formatCount(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 82.44 -> "82.4" */
export function formatKg(value: number): string {
  return value.toFixed(1);
}

/** Share of a goal as a whole percent, clamped to 0..100. */
export function percentOfGoal(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)));
}

/** Parses a typed weight: accepts "82.4" or "82,4"; NaN if it isn't a number. */
export function parseKg(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}
