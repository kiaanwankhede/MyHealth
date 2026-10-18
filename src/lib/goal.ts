// Weight-goal maths. Pure functions only: no React, no storage, no Health Connect.
// Every number on the Weight and Goal screens comes from here, so it is unit tested.

import { addDays, calendarDaysBetween, startOfLocalDay } from './dates';

/** ≈ energy in 1 kg of body fat. A standard estimate, shown to the user as a guide. */
export const KCAL_PER_KG = 7700;

/** Losing more than 1% of body weight per week is flagged as too fast. */
export const MAX_SAFE_WEEKLY_FRACTION = 0.01;

/** Smoothing for the trend line: each day moves the trend 10% of the way to the scale. */
export const TREND_ALPHA = 0.1;

/** Actual pace is measured over at most this many recent days. */
export const PACE_WINDOW_DAYS = 28;

/** Pace isn't reported until the trend covers at least this many days. */
export const MIN_PACE_DAYS = 7;

export type Goal = {
  startDate: Date;
  startKg: number;
  targetKg: number;
  targetDate: Date;
};

export type WeightReading = { kg: number; time: Date };
export type DailyWeight = { date: Date; kg: number };
export type TrendPoint = DailyWeight & { trend: number };

export type GoalPlan = {
  kgToLose: number;
  totalDays: number;
  weeks: number;
  kgPerWeek: number;
  kcalPerDay: number;
  maxSafeKgPerWeek: number;
  isSafe: boolean;
  /** Earliest target date that keeps the pace within the safe limit. */
  earliestSafeDate: Date;
};

export type GoalProgress = {
  trendKg: number;
  planKg: number;
  lostKg: number;
  toGoKg: number;
  /** 0–100 */
  percent: number;
  /** trend − plan: positive means behind plan, negative ahead. */
  behindKg: number;
  /** behindKg expressed in days of planned progress (positive = behind). */
  behindDays: number;
  /** Measured loss per week from the trend; null until there's enough data. */
  paceKgPerWeek: number | null;
  /** When the goal is reached at the measured pace; null if not losing or no pace yet. */
  projectedFinish: Date | null;
  reached: boolean;
};

export function validateGoal(goal: Goal): string | null {
  const { startKg, targetKg, startDate, targetDate } = goal;
  if (!(startKg > 20 && startKg < 400)) return 'Enter a start weight between 20 and 400 kg.';
  if (!(targetKg > 20 && targetKg < 400)) return 'Enter a target weight between 20 and 400 kg.';
  if (targetKg >= startKg) return 'Target weight must be below your start weight.';
  if (calendarDaysBetween(startDate, targetDate) < 7) {
    return 'Target date must be at least a week after the start date.';
  }
  return null;
}

export function planGoal(goal: Goal): GoalPlan {
  const kgToLose = goal.startKg - goal.targetKg;
  const totalDays = calendarDaysBetween(goal.startDate, goal.targetDate);
  const weeks = totalDays / 7;
  const kgPerWeek = kgToLose / weeks;
  const maxSafeKgPerWeek = goal.startKg * MAX_SAFE_WEEKLY_FRACTION;
  const safeDays = Math.ceil((kgToLose / maxSafeKgPerWeek) * 7);
  return {
    kgToLose,
    totalDays,
    weeks,
    kgPerWeek,
    kcalPerDay: (kgToLose * KCAL_PER_KG) / totalDays,
    maxSafeKgPerWeek,
    // Small tolerance so a date picked from earliestSafeDate always passes.
    isSafe: kgPerWeek <= maxSafeKgPerWeek + 1e-9,
    earliestSafeDate: addDays(startOfLocalDay(goal.startDate), safeDays),
  };
}

/** Where the straight-line plan says you should be on `date` (clamped to start/target). */
export function planWeightOn(goal: Goal, date: Date): number {
  const total = calendarDaysBetween(goal.startDate, goal.targetDate);
  const elapsed = Math.min(Math.max(calendarDaysBetween(goal.startDate, date), 0), total);
  return goal.startKg - ((goal.startKg - goal.targetKg) * elapsed) / total;
}

/** One value per calendar day (the mean of that day's readings), oldest first. */
export function dailyAverages(readings: readonly WeightReading[]): DailyWeight[] {
  const byDay = new Map<number, { sum: number; n: number; date: Date }>();
  for (const r of readings) {
    const date = startOfLocalDay(r.time);
    const key = date.getTime();
    const entry = byDay.get(key) ?? { sum: 0, n: 0, date };
    entry.sum += r.kg;
    entry.n += 1;
    byDay.set(key, entry);
  }
  return [...byDay.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ sum, n, date }) => ({ date, kg: sum / n }));
}

/**
 * Exponentially smoothed trend. Gaps between weigh-ins are handled by applying the
 * daily smoothing once per elapsed day, so a week without weighing moves the trend
 * as far as seven daily weigh-ins would.
 */
export function trendSeries(daily: readonly DailyWeight[], alpha = TREND_ALPHA): TrendPoint[] {
  const out: TrendPoint[] = [];
  let trend: number | null = null;
  let prev: Date | null = null;
  for (const d of daily) {
    if (trend === null || prev === null) {
      trend = d.kg;
    } else {
      const days = Math.max(1, calendarDaysBetween(prev, d.date));
      const weight = 1 - Math.pow(1 - alpha, days);
      trend += weight * (d.kg - trend);
    }
    prev = d.date;
    out.push({ ...d, trend });
  }
  return out;
}

/** Loss per week measured from the trend over the last PACE_WINDOW_DAYS (positive = losing). */
export function measuredPace(series: readonly TrendPoint[], since: Date): number | null {
  const inGoal = series.filter((p) => calendarDaysBetween(since, p.date) >= 0);
  if (inGoal.length < 2) return null;
  const last = inGoal[inGoal.length - 1];
  const windowStart = addDays(last.date, -PACE_WINDOW_DAYS);
  const first = inGoal.find((p) => calendarDaysBetween(windowStart, p.date) >= 0) ?? inGoal[0];
  const days = calendarDaysBetween(first.date, last.date);
  if (days < MIN_PACE_DAYS) return null;
  return ((first.trend - last.trend) / days) * 7;
}

export function goalProgress(goal: Goal, series: readonly TrendPoint[], today: Date): GoalProgress | null {
  if (series.length === 0) return null;
  const trendKg = series[series.length - 1].trend;
  const planKg = planWeightOn(goal, today);
  const kgToLose = goal.startKg - goal.targetKg;
  const lostKg = goal.startKg - trendKg;
  const toGoKg = Math.max(0, trendKg - goal.targetKg);
  const reached = trendKg <= goal.targetKg;
  const plannedKgPerDay = kgToLose / calendarDaysBetween(goal.startDate, goal.targetDate);
  const behindKg = trendKg - planKg;
  const paceKgPerWeek = measuredPace(series, goal.startDate);

  let projectedFinish: Date | null = null;
  if (reached) {
    projectedFinish = startOfLocalDay(today);
  } else if (paceKgPerWeek !== null && paceKgPerWeek > 0) {
    projectedFinish = addDays(startOfLocalDay(today), Math.ceil((toGoKg / paceKgPerWeek) * 7));
  }

  return {
    trendKg,
    planKg,
    lostKg,
    toGoKg,
    percent: Math.min(100, Math.max(0, Math.round((lostKg / kgToLose) * 100))),
    behindKg,
    behindDays: Math.round(behindKg / plannedKgPerDay),
    paceKgPerWeek,
    projectedFinish,
    reached,
  };
}

export type GoalStatus = { text: string; tone: 'good' | 'warn' };

/** One-line status for the goal: reached, on plan, or how far ahead/behind (kg and days). */
export function describeStatus(p: GoalProgress): GoalStatus {
  if (p.reached) return { text: 'Goal reached', tone: 'good' };
  const kg = Math.abs(p.behindKg).toFixed(1);
  const days = Math.abs(p.behindDays);
  const dayText = days === 1 ? '1 day' : `${days} days`;
  if (Math.abs(p.behindKg) < 0.05) return { text: 'Right on plan', tone: 'good' };
  if (p.behindKg > 0) return { text: `${kg} kg behind plan (${dayText})`, tone: 'warn' };
  return { text: `${kg} kg ahead of plan (${dayText})`, tone: 'good' };
}
