import type { SQLiteDatabase } from 'expo-sqlite';

import { fromISODate, toISODate } from '../lib/dates';
import type { LabReport } from '../lib/cholesterol';
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

  if (version < 2) {
    // All lipid values in mg/dL; any of them may be missing from a report.
    await db.execAsync(`
      CREATE TABLE lab_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        lab TEXT,
        total REAL,
        ldl REAL,
        hdl REAL,
        triglycerides REAL,
        created_at TEXT NOT NULL
      );
      PRAGMA user_version = 2;
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

type LabReportRow = {
  id: number;
  date: string;
  lab: string | null;
  total: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
};

const fromRow = (r: LabReportRow): LabReport => ({ ...r, date: fromISODate(r.date) });

/** Newest first. */
export async function listLabReports(db: SQLiteDatabase): Promise<LabReport[]> {
  const rows = await db.getAllAsync<LabReportRow>(
    'SELECT id, date, lab, total, ldl, hdl, triglycerides FROM lab_reports ORDER BY date DESC, id DESC',
  );
  return rows.map(fromRow);
}

export async function getLabReport(db: SQLiteDatabase, id: number): Promise<LabReport | null> {
  const row = await db.getFirstAsync<LabReportRow>(
    'SELECT id, date, lab, total, ldl, hdl, triglycerides FROM lab_reports WHERE id = ?',
    id,
  );
  return row ? fromRow(row) : null;
}

/** Inserts when `id` is null, otherwise updates that report. */
export async function saveLabReport(db: SQLiteDatabase, report: Omit<LabReport, 'id'> & { id: number | null }) {
  const values = [
    toISODate(report.date),
    report.lab,
    report.total,
    report.ldl,
    report.hdl,
    report.triglycerides,
  ] as const;
  if (report.id === null) {
    await db.runAsync(
      'INSERT INTO lab_reports (date, lab, total, ldl, hdl, triglycerides, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ...values,
      new Date().toISOString(),
    );
  } else {
    await db.runAsync(
      'UPDATE lab_reports SET date = ?, lab = ?, total = ?, ldl = ?, hdl = ?, triglycerides = ? WHERE id = ?',
      ...values,
      report.id,
    );
  }
}

export async function deleteLabReport(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM lab_reports WHERE id = ?', id);
}
