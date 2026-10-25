// Text for the steps notification on the lock screen. Pure functions only, unit tested.

import { formatCount } from './format';
import type { RetroGoal } from './steps';

/** Identifier of the one steps notification; showing it again replaces it. */
export const STEPS_STATUS_ID = 'steps-status';

export type StepsStatusContent = { title: string; body: string };

export function stepsStatusContent(steps: number, goal: number, retro: RetroGoal): StepsStatusContent {
  const toGo = goal - steps;
  const goalText = toGo > 0 ? `${formatCount(toGo)} to go for ${formatCount(goal)}` : `Goal ${formatCount(goal)} done`;
  let retroText: string | null = null;
  if (retro.state === 'all') {
    retroText = `Retro: all ${retro.coveredDays} ${retro.coveredDays === 1 ? 'day' : 'days'} covered`;
  } else if (retro.state === 'extend') {
    retroText = `Retro: ${retro.coveredDays} ${retro.coveredDays === 1 ? 'day' : 'days'}`;
  }
  return {
    title: `${formatCount(steps)} steps today`,
    body: retroText ? `${goalText} · ${retroText}` : goalText,
  };
}
