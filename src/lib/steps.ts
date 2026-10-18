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
