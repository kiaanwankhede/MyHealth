// The weekly look-back on Today, and plateau detection. Pure functions only.

import { addDays, calendarDaysBetween, startOfLocalDay } from './dates';
import type { TrendPoint } from './goal';
import { retestsDue, type Due, type LabReport } from './labs';
import type { DailySteps } from './steps';

/** Trend weight on a day: the last trend point on or before it. */
export function trendOn(series: readonly TrendPoint[], date: Date): number | null {
  let found: number | null = null;
  for (const p of series) {
    if (calendarDaysBetween(p.date, date) < 0) break;
    found = p.trend;
  }
  return found;
}

export type WeeklyReview = {
  /** Trend now minus trend a week ago; negative means lost. Null without a week of data. */
  trendChangeKg: number | null;
  /** Over the last 7 complete days (today is still going). */
  stepsAverage: number | null;
  goalDays: number;
  labsDue: Due[];
};

export function weeklyReview(args: {
  series: readonly TrendPoint[];
  steps: readonly DailySteps[];
  stepGoal: number;
  reports: readonly LabReport[];
  now: Date;
}): WeeklyReview {
  const { series, steps, stepGoal, reports, now } = args;
  const today = startOfLocalDay(now);
  const weekAgo = trendOn(series, addDays(today, -7));
  const current = series.length ? series[series.length - 1].trend : null;

  const week = steps.filter((d) => {
    const ago = calendarDaysBetween(d.date, today);
    return ago >= 1 && ago <= 7;
  });
  return {
    trendChangeKg: weekAgo !== null && current !== null ? current - weekAgo : null,
    stepsAverage: week.length ? Math.round(week.reduce((s, d) => s + d.steps, 0) / week.length) : null,
    goalDays: week.filter((d) => d.steps >= stepGoal).length,
    labsDue: retestsDue(reports, now),
  };
}

export const PLATEAU_DAYS = 21;
/** Trend moving less than this over PLATEAU_DAYS counts as flat. */
export const PLATEAU_KG = 0.3;
/** Need at least this many weigh-in days in the window to call it. */
export const PLATEAU_MIN_WEIGH_INS = 6;

export type Plateau = { days: number; changeKg: number };

/**
 * A plateau is a trend that has barely moved for three weeks while you kept weighing in.
 * Returns null when it isn't flat, or when there isn't enough recent data to tell.
 */
export function detectPlateau(series: readonly TrendPoint[], now: Date): Plateau | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  if (calendarDaysBetween(last.date, now) > 7) return null;
  const windowStart = addDays(startOfLocalDay(last.date), -PLATEAU_DAYS);
  const inWindow = series.filter((p) => calendarDaysBetween(windowStart, p.date) >= 0);
  if (inWindow.length < PLATEAU_MIN_WEIGH_INS) return null;
  const startTrend = trendOn(series, windowStart);
  if (startTrend === null) return null;
  const changeKg = last.trend - startTrend;
  return Math.abs(changeKg) < PLATEAU_KG ? { days: PLATEAU_DAYS, changeKg } : null;
}
