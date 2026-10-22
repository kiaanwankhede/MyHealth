// Step maths. Pure functions only, unit tested.

import { formatCount } from './format';

export type DailySteps = { date: Date; steps: number };

/** Average adult stride, used for the distance estimate. */
export const STRIDE_M = 0.762;
/** ≈ kcal burned per step for a 70 kg adult; scaled by body weight when known. */
export const KCAL_PER_STEP_70KG = 0.04;

export function distanceKm(steps: number): number {
  return (steps * STRIDE_M) / 1000;
}

export function kcalFromSteps(steps: number, weightKg?: number | null): number {
  const scale = weightKg ? weightKg / 70 : 1;
  return steps * KCAL_PER_STEP_70KG * scale;
}

export type StepStats = { average: number; goalDays: number; best: DailySteps | null; total: number };

export function stepStats(days: readonly DailySteps[], goal: number): StepStats {
  if (days.length === 0) return { average: 0, goalDays: 0, best: null, total: 0 };
  const total = days.reduce((sum, d) => sum + d.steps, 0);
  const best = days.reduce((a, b) => (b.steps > a.steps ? b : a));
  return {
    average: Math.round(total / days.length),
    goalDays: days.filter((d) => d.steps >= goal).length,
    best,
    total,
  };
}

export type PeriodComparison = {
  /** The last `n` complete days (today is still going, so it is left out). */
  current: StepStats;
  /** The `n` days before those; null when there is no data for them. */
  previous: StepStats | null;
};

/** `days` is oldest first and ends with today. Compares the last `n` full days with the `n` before. */
export function comparePeriods(days: readonly DailySteps[], n: number, goal: number): PeriodComparison {
  const complete = days.slice(0, -1);
  const current = complete.slice(-n);
  const before = complete.slice(-2 * n, -n);
  const hasData = before.length === n && before.some((d) => d.steps > 0);
  return { current: stepStats(current, goal), previous: hasData ? stepStats(before, goal) : null };
}

/** How a year's numbers moved over the last week: `now` minus the same figures a week ago. */
export type YearChange = {
  total: number;
  average: number;
  goalDays: number;
  distanceKm: number;
  longestStreak: number;
  /** True when the best day of the year happened in the last 7 days. */
  newBest: boolean;
};

export function yearChange(days: readonly DailySteps[], goal: number): YearChange | null {
  const now = yearInsights(days, goal);
  const weekAgo = yearInsights(days.slice(0, -7), goal);
  if (!now || !weekAgo) return null;
  return {
    total: now.total - weekAgo.total,
    average: now.average - weekAgo.average,
    goalDays: now.goalDays - weekAgo.goalDays,
    distanceKm: now.distanceKm - weekAgo.distanceKm,
    longestStreak: now.longestStreak.days - weekAgo.longestStreak.days,
    newBest: now.best.steps > weekAgo.best.steps,
  };
}

/**
 * Retro goal: once today's goal is met, keep extending the window backwards one day at a
 * time while the combined steps still reach goal × days. The first window that falls short
 * is the next target.
 */
export type RetroGoal =
  /** Today's goal isn't met yet. */
  | { state: 'today'; stepsNeeded: number }
  /** The last `coveredDays` days together hit the goal; `stepsNeeded` more covers `nextDays`. */
  | { state: 'extend'; coveredDays: number; nextDays: number; stepsNeeded: number }
  /** Every day we have data for is covered. */
  | { state: 'all'; coveredDays: number };

/** `newestFirst[0]` is today, `[1]` yesterday, and so on. */
export function retroGoal(newestFirst: readonly number[], goal: number): RetroGoal {
  const today = newestFirst[0] ?? 0;
  if (today < goal) return { state: 'today', stepsNeeded: goal - today };

  let covered = 1;
  let sum = today;
  while (covered < newestFirst.length) {
    const nextSum = sum + newestFirst[covered];
    const needed = (covered + 1) * goal;
    if (nextSum < needed) {
      return { state: 'extend', coveredDays: covered, nextDays: covered + 1, stepsNeeded: needed - nextSum };
    }
    sum = nextSum;
    covered += 1;
  }
  return { state: 'all', coveredDays: covered };
}

export function describeRetro(r: RetroGoal): string {
  switch (r.state) {
    case 'today':
      return `${formatCount(r.stepsNeeded)} steps to go for today’s goal.`;
    case 'extend':
      if (r.coveredDays === 1) {
        return `Today’s goal done! ${formatCount(r.stepsNeeded)} more steps covers yesterday too.`;
      }
      return `Last ${r.coveredDays} days covered. ${formatCount(r.stepsNeeded)} more steps covers ${r.nextDays} days.`;
    case 'all':
      return `All of the last ${r.coveredDays} days covered.`;
  }
}

export type DayRow = {
  date: Date;
  steps: number;
  /** 1 for today, 2 for yesterday, and so on. */
  daysBack: number;
  /** Part of the retro-goal window. */
  covered: boolean;
};

export type DayByDay = {
  /** Newest first: today, yesterday, … back to the first day we have. */
  rows: DayRow[];
  coveredDays: number;
  coveredSteps: number;
  /** goal × coveredDays */
  neededSteps: number;
  /** The first day the window doesn't reach, and how many more steps would cover it. */
  next: { row: DayRow; stepsNeeded: number } | null;
};

/** `days` is oldest first and ends with today. Marks the days that make up the retro goal. */
export function dayByDay(days: readonly DailySteps[], goal: number): DayByDay {
  const newestFirst = [...days].reverse();
  const retro = retroGoal(
    newestFirst.map((d) => d.steps),
    goal,
  );
  const coveredDays = retro.state === 'today' ? 0 : retro.coveredDays;
  const rows = newestFirst.map((d, i) => ({ ...d, daysBack: i + 1, covered: i < coveredDays }));
  return {
    rows,
    coveredDays,
    coveredSteps: rows.slice(0, coveredDays).reduce((s, r) => s + r.steps, 0),
    neededSteps: coveredDays * goal,
    next: retro.state === 'extend' ? { row: rows[coveredDays], stepsNeeded: retro.stepsNeeded } : null,
  };
}

export type Streak ={ days: number; end: Date | null };

export type YearInsights = {
  /** First day with any steps; earlier days are treated as "no data", not as zero. */
  from: Date;
  /** Completed days (today excluded) from `from`. Averages use these so a half-finished today doesn't drag them down. */
  completedDays: number;
  total: number;
  average: number;
  goalDays: number;
  /** goalDays out of completed days, 0–100. */
  goalRate: number;
  best: DailySteps;
  longestStreak: Streak;
  /** Goal days in a row up to yesterday, plus today once its goal is met. */
  currentStreak: number;
  /** One entry per month that has data, in order. `month` is 0–11. */
  monthly: { month: number; average: number }[];
  /** Average steps by weekday, Sunday first; null where there are no completed days. */
  weekdays: (number | null)[];
  distanceKm: number;
};

/** `days` is oldest first and ends with today. Returns null if there are no steps at all. */
export function yearInsights(days: readonly DailySteps[], goal: number): YearInsights | null {
  const firstIdx = days.findIndex((d) => d.steps > 0);
  if (firstIdx === -1) return null;
  const range = days.slice(firstIdx);
  const completed = range.slice(0, -1);
  const today = range[range.length - 1];

  const total = range.reduce((s, d) => s + d.steps, 0);
  const completedTotal = completed.reduce((s, d) => s + d.steps, 0);
  const goalDays = completed.filter((d) => d.steps >= goal).length;

  let longest: Streak = { days: 0, end: null };
  let run = 0;
  for (const d of range) {
    run = d.steps >= goal ? run + 1 : 0;
    if (run > longest.days) longest = { days: run, end: d.date };
  }

  let current = 0;
  for (let i = completed.length - 1; i >= 0 && completed[i].steps >= goal; i--) current++;
  if (today.steps >= goal) current++;

  const byMonth = new Map<number, { sum: number; n: number }>();
  const byWeekday = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of completed) {
    const m = byMonth.get(d.date.getMonth()) ?? { sum: 0, n: 0 };
    m.sum += d.steps;
    m.n += 1;
    byMonth.set(d.date.getMonth(), m);
    byWeekday[d.date.getDay()].sum += d.steps;
    byWeekday[d.date.getDay()].n += 1;
  }

  return {
    from: range[0].date,
    completedDays: completed.length,
    total,
    average: completed.length ? Math.round(completedTotal / completed.length) : today.steps,
    goalDays,
    goalRate: completed.length ? Math.round((goalDays / completed.length) * 100) : 0,
    best: range.reduce((a, b) => (b.steps > a.steps ? b : a)),
    longestStreak: longest,
    currentStreak: current,
    monthly: [...byMonth.entries()].map(([month, { sum, n }]) => ({ month, average: Math.round(sum / n) })),
    weekdays: byWeekday.map(({ sum, n }) => (n ? Math.round(sum / n) : null)),
    distanceKm: distanceKm(total),
  };
}
