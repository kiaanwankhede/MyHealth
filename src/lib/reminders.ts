// Which notifications to schedule, worked out from settings, medicines and lab dates.
// Pure: the app passes the plan to expo-notifications.

import { formatCount } from './format';
import { formatDate } from './dates';
import type { RetestDate } from './labs';
import { isActive, parseTime, type Medicine } from './medicines';

export type ReminderSettings = {
  /** "HH:MM", or null when off. */
  weighIn: string | null;
  steps: string | null;
  labs: boolean;
};

export const DEFAULT_REMINDERS: ReminderSettings = { weighIn: null, steps: null, labs: false };

export function parseReminderSettings(raw: string | null): ReminderSettings {
  if (!raw) return DEFAULT_REMINDERS;
  try {
    const r = JSON.parse(raw) as Partial<ReminderSettings>;
    const time = (v: unknown) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : null);
    return { weighIn: time(r.weighIn), steps: time(r.steps), labs: r.labs === true };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export type PlannedReminder = {
  /** Stable key, so the same reminder isn't scheduled twice. */
  key: string;
  title: string;
  body: string;
  trigger: { kind: 'daily'; hour: number; minute: number } | { kind: 'date'; date: Date };
};

/** Lab re-test reminders go out at this time on the due date. */
export const LAB_REMINDER_HOUR = 9;

export function planReminders(args: {
  settings: ReminderSettings;
  medicines: readonly Medicine[];
  retests: readonly RetestDate[];
  stepGoal: number;
  now: Date;
}): PlannedReminder[] {
  const { settings, medicines, retests, stepGoal, now } = args;
  const plan: PlannedReminder[] = [];

  if (settings.weighIn) {
    plan.push({
      key: 'weigh-in',
      title: 'Morning weigh-in',
      body: 'Weigh yourself before breakfast and log it in Sehat. The trend smooths out day-to-day swings.',
      trigger: { kind: 'daily', ...parseTime(settings.weighIn) },
    });
  }
  if (settings.steps) {
    plan.push({
      key: 'steps',
      title: 'Time for a walk?',
      body: `A 15-minute walk adds about 2,000 steps towards your ${formatCount(stepGoal)} goal.`,
      trigger: { kind: 'daily', ...parseTime(settings.steps) },
    });
  }
  for (const m of medicines) {
    if (!m.remind || !isActive(m, now)) continue;
    for (const time of m.times) {
      plan.push({
        key: `medicine-${m.id}-${time}`,
        title: m.name,
        body: m.dose ? `Time for ${m.dose}.` : 'Time for your dose.',
        trigger: { kind: 'daily', ...parseTime(time) },
      });
    }
  }
  if (settings.labs) {
    for (const r of retests) {
      const date = new Date(r.due.getFullYear(), r.due.getMonth(), r.due.getDate(), LAB_REMINDER_HOUR);
      if (date <= now) continue;
      plan.push({
        key: `lab-${r.group}`,
        title: `${r.name} test due`,
        body: `Your last ${r.name.toLowerCase()} test was on ${formatDate(r.last)}. Time to book a re-test.`,
        trigger: { kind: 'date', date },
      });
    }
  }
  return plan;
}
