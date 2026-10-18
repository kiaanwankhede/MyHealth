// What the home-screen widget shows. Built in the app (and, when allowed, in the background)
// and saved, so the widget can always draw the last known values.

import { formatCount, formatKg, percentOfGoal } from '../lib/format';
import { describeStatus, type GoalProgress } from '../lib/goal';
import { describeRetro, type RetroGoal } from '../lib/steps';

export type WidgetSnapshot = {
  steps: number;
  goal: number;
  percent: number;
  /** Retro-goal line once today's goal is met, else null. */
  retro: string | null;
  trendKg: string | null;
  /** e.g. "30% · 0.2 kg behind plan (4 days)" */
  goalLine: string | null;
  updatedAt: string;
};

export function buildSnapshot(args: {
  steps: number;
  goal: number;
  retro: RetroGoal;
  trendKg: number | null;
  progress: GoalProgress | null;
  now: Date;
}): WidgetSnapshot {
  const { steps, goal, retro, trendKg, progress, now } = args;
  return {
    steps,
    goal,
    percent: percentOfGoal(steps, goal),
    retro: retro.state === 'today' ? null : describeRetro(retro),
    trendKg: trendKg === null ? null : `${formatKg(trendKg)} kg`,
    goalLine: progress ? `${progress.percent}% · ${describeStatus(progress).text}` : null,
    updatedAt: now.toISOString(),
  };
}

/** Keeps the weight part of an older snapshot and replaces the steps part. */
export function withSteps(base: WidgetSnapshot | null, steps: number, goal: number, retro: RetroGoal, now: Date) {
  return {
    ...(base ?? { trendKg: null, goalLine: null }),
    steps,
    goal,
    percent: percentOfGoal(steps, goal),
    retro: retro.state === 'today' ? null : describeRetro(retro),
    updatedAt: now.toISOString(),
  } satisfies WidgetSnapshot;
}

export function stepsLine(s: WidgetSnapshot): string {
  return `of ${formatCount(s.goal)} · ${s.percent}%`;
}
