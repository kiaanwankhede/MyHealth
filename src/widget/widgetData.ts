import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME, getProfile, getValue, migrate, setValue } from '../db/database';
import { getHealthConnectStatus, readDailySteps } from '../health/healthConnect';
import { retroGoal } from '../lib/steps';
import { withSteps, type WidgetSnapshot } from './snapshot';

const KEY = 'widget_snapshot';

/** How far back the widget's retro goal looks when it refreshes on its own. */
const WIDGET_RETRO_DAYS = 60;

export async function loadSnapshot(db: SQLiteDatabase): Promise<WidgetSnapshot | null> {
  const raw = await getValue(db, KEY);
  return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
}

export async function saveSnapshot(db: SQLiteDatabase, snapshot: WidgetSnapshot): Promise<void> {
  await setValue(db, KEY, JSON.stringify(snapshot));
}

/** The widget runs without the app's SQLiteProvider, so it opens the database itself. */
export async function openWidgetDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
}

/**
 * Fresh steps from Health Connect when it allows a background read, merged into the saved
 * snapshot (weight lines come from the last time the app was open). Falls back to the saved
 * snapshot when Health Connect refuses.
 */
export async function refreshSnapshot(db: SQLiteDatabase): Promise<WidgetSnapshot | null> {
  const saved = await loadSnapshot(db);
  try {
    if ((await getHealthConnectStatus()) !== 'ready') return saved;
    const now = new Date();
    const days = await readDailySteps(WIDGET_RETRO_DAYS, now);
    const newestFirst = days.map((d) => d.steps).reverse();
    const { stepGoal } = await getProfile(db);
    const snapshot = withSteps(saved, newestFirst[0] ?? 0, stepGoal, retroGoal(newestFirst, stepGoal), now);
    await saveSnapshot(db, snapshot);
    return snapshot;
  } catch {
    return saved;
  }
}
