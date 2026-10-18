import type { SQLiteDatabase } from 'expo-sqlite';

import { fromISODate, toISODate } from '../lib/dates';
import type { Goal } from '../lib/goal';

export const DATABASE_NAME = 'sehat.db';

/** Runs once per app start (SQLiteProvider onInit). Each step bumps PRAGMA user_version. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        start_kg REAL NOT NULL,
        target_kg REAL NOT NULL,
        target_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }
}

type GoalRow = { start_date: string; start_kg: number; target_kg: number; target_date: string };

/** The most recently saved goal. Older goals are kept as history. */
export async function getCurrentGoal(db: SQLiteDatabase): Promise<Goal | null> {
  const row = await db.getFirstAsync<GoalRow>(
    'SELECT start_date, start_kg, target_kg, target_date FROM goals ORDER BY id DESC LIMIT 1',
  );
  if (!row) return null;
  return {
    startDate: fromISODate(row.start_date),
    startKg: row.start_kg,
    targetKg: row.target_kg,
    targetDate: fromISODate(row.target_date),
  };
}

export async function saveGoal(db: SQLiteDatabase, goal: Goal): Promise<void> {
  await db.runAsync(
    'INSERT INTO goals (start_date, start_kg, target_kg, target_date, created_at) VALUES (?, ?, ?, ?, ?)',
    toISODate(goal.startDate),
    goal.startKg,
    goal.targetKg,
    toISODate(goal.targetDate),
    new Date().toISOString(),
  );
}
