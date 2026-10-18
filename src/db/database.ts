import type { SQLiteDatabase } from 'expo-sqlite';

import { fromISODate, toISODate } from '../lib/dates';
import type { BackupData } from '../lib/backup';
import type { WaistEntry } from '../lib/body';
import type { Goal } from '../lib/goal';
import type { Medicine, TakenDose } from '../lib/medicines';
import { parseReminderSettings, type ReminderSettings } from '../lib/reminders';
import type { LabReport, LabValues, TestKey } from '../lib/labs';
import { parseProfile, type Profile } from '../lib/profile';

export const DATABASE_NAME = 'sehat.db';

/**
 * Runs once per app start (SQLiteProvider onInit), and by the home-screen widget, which opens the
 * database on its own. Each step bumps PRAGMA user_version and tolerates tables that already exist.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
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
      CREATE TABLE IF NOT EXISTS lab_reports (
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

  if (version < 3) {
    // Small key/value store, e.g. the home-screen widget's last snapshot.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      PRAGMA user_version = 3;
    `);
  }

  if (version < 4) {
    // Lab reports hold any number of tests, one row per value. The lipid columns on
    // lab_reports are copied over and no longer read.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS lab_values (
        report_id INTEGER NOT NULL,
        test TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (report_id, test)
      );
      INSERT OR IGNORE INTO lab_values SELECT id, 'total', total FROM lab_reports WHERE total IS NOT NULL;
      INSERT OR IGNORE INTO lab_values SELECT id, 'ldl', ldl FROM lab_reports WHERE ldl IS NOT NULL;
      INSERT OR IGNORE INTO lab_values SELECT id, 'hdl', hdl FROM lab_reports WHERE hdl IS NOT NULL;
      INSERT OR IGNORE INTO lab_values
        SELECT id, 'triglycerides', triglycerides FROM lab_reports WHERE triglycerides IS NOT NULL;
      CREATE TABLE IF NOT EXISTS waist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        cm REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      PRAGMA user_version = 4;
    `);
  }

  if (version < 5) {
    // times: JSON array of "HH:MM". A stopped medicine keeps its history.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dose TEXT,
        times TEXT NOT NULL,
        remind INTEGER NOT NULL DEFAULT 1,
        start_date TEXT NOT NULL,
        stopped_date TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS medicine_doses (
        medicine_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        taken_at TEXT NOT NULL,
        PRIMARY KEY (medicine_id, date, time)
      );
      PRAGMA user_version = 5;
    `);
  }
}

export async function getValue(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setValue(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
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

type LabRow = { id: number; date: string; lab: string | null };
type ValueRow = { report_id: number; test: string; value: number };

async function withValues(db: SQLiteDatabase, rows: LabRow[]): Promise<LabReport[]> {
  if (rows.length === 0) return [];
  const values = await db.getAllAsync<ValueRow>(
    `SELECT report_id, test, value FROM lab_values WHERE report_id IN (${rows.map(() => '?').join(',')})`,
    ...rows.map((r) => r.id),
  );
  const byReport = new Map<number, LabValues>();
  for (const v of values) {
    const entry = byReport.get(v.report_id) ?? {};
    entry[v.test as TestKey] = v.value;
    byReport.set(v.report_id, entry);
  }
  return rows.map((r) => ({ id: r.id, date: fromISODate(r.date), lab: r.lab, values: byReport.get(r.id) ?? {} }));
}

/** Newest first. */
export async function listLabReports(db: SQLiteDatabase): Promise<LabReport[]> {
  const rows = await db.getAllAsync<LabRow>('SELECT id, date, lab FROM lab_reports ORDER BY date DESC, id DESC');
  return withValues(db, rows);
}

export async function getLabReport(db: SQLiteDatabase, id: number): Promise<LabReport | null> {
  const row = await db.getFirstAsync<LabRow>('SELECT id, date, lab FROM lab_reports WHERE id = ?', id);
  return row ? (await withValues(db, [row]))[0] : null;
}

/** Inserts when `id` is null, otherwise replaces that report's date, lab and values. */
export async function saveLabReport(db: SQLiteDatabase, report: Omit<LabReport, 'id'> & { id: number | null }) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    let id = report.id;
    if (id === null) {
      const result = await tx.runAsync(
        'INSERT INTO lab_reports (date, lab, created_at) VALUES (?, ?, ?)',
        toISODate(report.date),
        report.lab,
        new Date().toISOString(),
      );
      id = result.lastInsertRowId;
    } else {
      await tx.runAsync('UPDATE lab_reports SET date = ?, lab = ? WHERE id = ?', toISODate(report.date), report.lab, id);
      await tx.runAsync('DELETE FROM lab_values WHERE report_id = ?', id);
    }
    for (const [test, value] of Object.entries(report.values)) {
      if (value !== undefined) {
        await tx.runAsync('INSERT INTO lab_values (report_id, test, value) VALUES (?, ?, ?)', id, test, value);
      }
    }
  });
}

export async function deleteLabReport(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM lab_values WHERE report_id = ?', id);
    await tx.runAsync('DELETE FROM lab_reports WHERE id = ?', id);
  });
}

type WaistRow = { id: number; date: string; cm: number };

/** Newest first. */
export async function listWaist(db: SQLiteDatabase): Promise<WaistEntry[]> {
  const rows = await db.getAllAsync<WaistRow>('SELECT id, date, cm FROM waist ORDER BY date DESC, id DESC');
  return rows.map((r) => ({ id: r.id, date: fromISODate(r.date), cm: r.cm }));
}

export async function addWaist(db: SQLiteDatabase, date: Date, cm: number): Promise<void> {
  await db.runAsync(
    'INSERT INTO waist (date, cm, created_at) VALUES (?, ?, ?)',
    toISODate(date),
    cm,
    new Date().toISOString(),
  );
}

export async function deleteWaist(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM waist WHERE id = ?', id);
}

const PROFILE_KEY = 'profile';

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  return parseProfile(await getValue(db, PROFILE_KEY));
}

export async function saveProfile(db: SQLiteDatabase, profile: Profile): Promise<void> {
  await setValue(db, PROFILE_KEY, JSON.stringify(profile));
}

type MedicineRow = {
  id: number;
  name: string;
  dose: string | null;
  times: string;
  remind: number;
  start_date: string;
  stopped_date: string | null;
};

const medicineFromRow = (r: MedicineRow): Medicine => ({
  id: r.id,
  name: r.name,
  dose: r.dose,
  times: JSON.parse(r.times) as string[],
  remind: r.remind === 1,
  startDate: fromISODate(r.start_date),
  stoppedDate: r.stopped_date ? fromISODate(r.stopped_date) : null,
});

/** Current medicines first (by name), then stopped ones. */
export async function listMedicines(db: SQLiteDatabase): Promise<Medicine[]> {
  const rows = await db.getAllAsync<MedicineRow>(
    'SELECT id, name, dose, times, remind, start_date, stopped_date FROM medicines ORDER BY stopped_date IS NOT NULL, name COLLATE NOCASE',
  );
  return rows.map(medicineFromRow);
}

export async function getMedicine(db: SQLiteDatabase, id: number): Promise<Medicine | null> {
  const row = await db.getFirstAsync<MedicineRow>(
    'SELECT id, name, dose, times, remind, start_date, stopped_date FROM medicines WHERE id = ?',
    id,
  );
  return row ? medicineFromRow(row) : null;
}

/** Inserts when `id` is null, otherwise updates that medicine. */
export async function saveMedicine(db: SQLiteDatabase, m: Omit<Medicine, 'id'> & { id: number | null }) {
  const values = [
    m.name.trim(),
    m.dose?.trim() || null,
    JSON.stringify([...m.times].sort()),
    m.remind ? 1 : 0,
    toISODate(m.startDate),
    m.stoppedDate ? toISODate(m.stoppedDate) : null,
  ] as const;
  if (m.id === null) {
    await db.runAsync(
      'INSERT INTO medicines (name, dose, times, remind, start_date, stopped_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ...values,
      new Date().toISOString(),
    );
  } else {
    await db.runAsync(
      'UPDATE medicines SET name = ?, dose = ?, times = ?, remind = ?, start_date = ?, stopped_date = ? WHERE id = ?',
      ...values,
      m.id,
    );
  }
}

export async function deleteMedicine(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM medicine_doses WHERE medicine_id = ?', id);
    await tx.runAsync('DELETE FROM medicines WHERE id = ?', id);
  });
}

type DoseRow = { medicine_id: number; date: string; time: string };

/** Doses taken on or after `from` ("YYYY-MM-DD"). */
export async function listTakenDoses(db: SQLiteDatabase, from: string): Promise<TakenDose[]> {
  const rows = await db.getAllAsync<DoseRow>(
    'SELECT medicine_id, date, time FROM medicine_doses WHERE date >= ?',
    from,
  );
  return rows.map((r) => ({ medicineId: r.medicine_id, date: r.date, time: r.time }));
}

export async function setDoseTaken(db: SQLiteDatabase, dose: TakenDose, taken: boolean): Promise<void> {
  if (taken) {
    await db.runAsync(
      'INSERT OR REPLACE INTO medicine_doses (medicine_id, date, time, taken_at) VALUES (?, ?, ?, ?)',
      dose.medicineId,
      dose.date,
      dose.time,
      new Date().toISOString(),
    );
  } else {
    await db.runAsync(
      'DELETE FROM medicine_doses WHERE medicine_id = ? AND date = ? AND time = ?',
      dose.medicineId,
      dose.date,
      dose.time,
    );
  }
}

const REMINDERS_KEY = 'reminders';

export async function getReminderSettings(db: SQLiteDatabase): Promise<ReminderSettings> {
  return parseReminderSettings(await getValue(db, REMINDERS_KEY));
}

export async function saveReminderSettings(db: SQLiteDatabase, settings: ReminderSettings): Promise<void> {
  await setValue(db, REMINDERS_KEY, JSON.stringify(settings));
}

/** Everything Sehat stores itself, for a backup file. */
export async function readBackupData(db: SQLiteDatabase): Promise<BackupData> {
  const goals = await db.getAllAsync<GoalRow & { created_at: string }>(
    'SELECT start_date, start_kg, target_kg, target_date, created_at FROM goals ORDER BY id',
  );
  const settings = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM kv');
  return {
    goals: goals.map((g) => ({
      startDate: fromISODate(g.start_date),
      startKg: g.start_kg,
      targetKg: g.target_kg,
      targetDate: fromISODate(g.target_date),
      createdAt: g.created_at,
    })),
    labReports: await listLabReports(db),
    waist: await listWaist(db),
    medicines: await listMedicines(db),
    doses: await listTakenDoses(db, '0000-00-00'),
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
  };
}

/** Replaces everything Sehat stores with the backup's contents, all or nothing. */
export async function restoreBackupData(db: SQLiteDatabase, data: BackupData): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      DELETE FROM goals; DELETE FROM lab_values; DELETE FROM lab_reports; DELETE FROM waist;
      DELETE FROM medicine_doses; DELETE FROM medicines; DELETE FROM kv;
    `);
    for (const g of data.goals) {
      await tx.runAsync(
        'INSERT INTO goals (start_date, start_kg, target_kg, target_date, created_at) VALUES (?, ?, ?, ?, ?)',
        toISODate(g.startDate),
        g.startKg,
        g.targetKg,
        toISODate(g.targetDate),
        g.createdAt,
      );
    }
    for (const r of data.labReports) {
      const { lastInsertRowId: id } = await tx.runAsync(
        'INSERT INTO lab_reports (date, lab, created_at) VALUES (?, ?, ?)',
        toISODate(r.date),
        r.lab,
        new Date().toISOString(),
      );
      for (const [test, value] of Object.entries(r.values)) {
        await tx.runAsync('INSERT INTO lab_values (report_id, test, value) VALUES (?, ?, ?)', id, test, value);
      }
    }
    for (const w of data.waist) {
      await tx.runAsync(
        'INSERT INTO waist (date, cm, created_at) VALUES (?, ?, ?)',
        toISODate(w.date),
        w.cm,
        new Date().toISOString(),
      );
    }
    // Medicines get new ids here, so their doses are re-linked through the backup's ids.
    const newIds = new Map<number, number>();
    for (const m of data.medicines) {
      const { lastInsertRowId } = await tx.runAsync(
        'INSERT INTO medicines (name, dose, times, remind, start_date, stopped_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        m.name,
        m.dose,
        JSON.stringify(m.times),
        m.remind ? 1 : 0,
        toISODate(m.startDate),
        m.stoppedDate ? toISODate(m.stoppedDate) : null,
        new Date().toISOString(),
      );
      newIds.set(m.id, lastInsertRowId);
    }
    for (const d of data.doses) {
      const id = newIds.get(d.medicineId);
      if (id === undefined) continue;
      await tx.runAsync(
        'INSERT OR IGNORE INTO medicine_doses (medicine_id, date, time, taken_at) VALUES (?, ?, ?, ?)',
        id,
        d.date,
        d.time,
        new Date().toISOString(),
      );
    }
    for (const [key, value] of Object.entries(data.settings)) {
      await tx.runAsync('INSERT INTO kv (key, value) VALUES (?, ?)', key, value);
    }
  });
}
