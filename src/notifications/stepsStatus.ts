// The steps notification: a quiet notification that stays in the shade and on the lock screen.
// The app updates it whenever it has fresh numbers; a background task refreshes it about every
// 15 minutes while the app is closed (Android decides the exact timing).

import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getProfile, getValue, setValue } from '../db/database';
import { getHealthConnectStatus, readDailySteps } from '../health/healthConnect';
import { calendarDaysBetween } from '../lib/dates';
import { retroGoal, type RetroGoal } from '../lib/steps';
import { STEPS_STATUS_ID, stepsStatusContent } from '../lib/stepsStatus';
import { ensureNotificationPermission } from './reminders';

export const STEPS_STATUS_TASK = 'sehat-steps-status';
const CHANNEL_ID = 'steps-status';
const KEY = 'steps_status_enabled';

export async function isStepsStatusOn(db: SQLiteDatabase): Promise<boolean> {
  return (await getValue(db, KEY)) === '1';
}

/** Turns the notification on or off. Resolves false when notifications aren't allowed. */
export async function setStepsStatusOn(db: SQLiteDatabase, on: boolean): Promise<boolean> {
  if (on && !(await ensureNotificationPermission())) return false;
  await setValue(db, KEY, on ? '1' : '0');
  if (on) {
    await BackgroundTask.registerTaskAsync(STEPS_STATUS_TASK, { minimumInterval: 15 });
    await refreshStepsStatus(db);
  } else {
    await BackgroundTask.unregisterTaskAsync(STEPS_STATUS_TASK).catch(() => {});
    await Notifications.dismissNotificationAsync(STEPS_STATUS_ID).catch(() => {});
  }
  return true;
}

/** Shows (or replaces) the notification with these numbers, if it is turned on. */
export async function showStepsStatus(
  db: SQLiteDatabase,
  steps: number,
  goal: number,
  retro: RetroGoal,
): Promise<void> {
  if (!(await isStepsStatusOn(db))) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Steps on lock screen',
    description: 'Today’s steps, kept up to date',
    // Default importance so it shows on the lock screen (many phones hide silent ones there);
    // with no sound or vibration it never makes a noise.
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: null,
    enableVibrate: false,
    showBadge: false,
  });
  const { title, body } = stepsStatusContent(steps, goal, retro);
  await Notifications.scheduleNotificationAsync({
    identifier: STEPS_STATUS_ID,
    content: {
      title,
      body,
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

/** Reads today's steps and the retro goal from Health Connect, then updates the notification. */
export async function refreshStepsStatus(db: SQLiteDatabase): Promise<void> {
  if (!(await isStepsStatusOn(db))) return;
  if ((await getHealthConnectStatus()) !== 'ready') return;
  const now = new Date();
  const days = await readDailySteps(calendarDaysBetween(new Date(now.getFullYear(), 0, 1), now) + 1, now);
  const newestFirst = days.map((d) => d.steps).reverse();
  const { stepGoal } = await getProfile(db);
  await showStepsStatus(db, newestFirst[0] ?? 0, stepGoal, retroGoal(newestFirst, stepGoal));
}
