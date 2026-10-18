import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getProfile, getReminderSettings, listLabReports, listMedicines } from '../db/database';
import { retestDates } from '../lib/labs';
import { planReminders, type PlannedReminder } from '../lib/reminders';

const CHANNEL_ID = 'reminders';

// Show reminders even when Sehat is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Asks for notification permission if needed. Resolves true when Sehat may notify. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function trigger(r: PlannedReminder): Notifications.NotificationTriggerInput {
  return r.trigger.kind === 'daily'
    ? {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.trigger.hour,
        minute: r.trigger.minute,
        channelId: CHANNEL_ID,
      }
    : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.trigger.date, channelId: CHANNEL_ID };
}

/**
 * Replaces every scheduled Sehat reminder with the current plan. Called after anything that
 * changes it (settings, medicines, lab reports, step goal) and when Today opens.
 */
export async function syncReminders(db: SQLiteDatabase, now = new Date()): Promise<void> {
  const [settings, medicines, reports, profile] = await Promise.all([
    getReminderSettings(db),
    listMedicines(db),
    listLabReports(db),
    getProfile(db),
  ]);
  const plan = planReminders({
    settings,
    medicines,
    retests: retestDates(reports),
    stepGoal: profile.stepGoal,
    now,
  });

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (plan.length === 0 || !(await Notifications.getPermissionsAsync()).granted) return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body },
      trigger: trigger(r),
    });
  }
}
