// Backup file format: everything Sehat stores itself, as JSON. Steps and weight live in
// Health Connect and are not included. Pure functions only.

import { fromISODate, toISODate } from './dates';
import type { Goal } from './goal';
import { TESTS, type LabReport, type LabValues, type TestKey } from './labs';
import type { WaistEntry } from './body';

export const BACKUP_VERSION = 1;

export type BackupData = {
  goals: (Goal & { createdAt: string })[];
  labReports: Omit<LabReport, 'id'>[];
  waist: Omit<WaistEntry, 'id'>[];
  /** Key/value settings such as the profile, as stored. */
  settings: Record<string, string>;
};

type BackupFile = {
  app: 'sehat';
  version: number;
  exportedAt: string;
  goals: { startDate: string; startKg: number; targetKg: number; targetDate: string; createdAt: string }[];
  labReports: { date: string; lab: string | null; values: LabValues }[];
  waist: { date: string; cm: number }[];
  settings: Record<string, string>;
};

export function toBackupJson(data: BackupData, now: Date): string {
  const file: BackupFile = {
    app: 'sehat',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    goals: data.goals.map((g) => ({
      startDate: toISODate(g.startDate),
      startKg: g.startKg,
      targetKg: g.targetKg,
      targetDate: toISODate(g.targetDate),
      createdAt: g.createdAt,
    })),
    labReports: data.labReports.map((r) => ({ date: toISODate(r.date), lab: r.lab, values: r.values })),
    waist: data.waist.map((w) => ({ date: toISODate(w.date), cm: w.cm })),
    settings: data.settings,
  };
  return JSON.stringify(file, null, 2);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const KNOWN_TESTS = new Set<string>(TESTS.map((t) => t.key));

/** Parses and checks a backup file. Throws an Error with a readable message if it isn't one. */
export function parseBackupJson(text: string): BackupData {
  let file: Partial<BackupFile>;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Sehat backup (it is not valid JSON).');
  }
  if (file?.app !== 'sehat') throw new Error('This file is not a Sehat backup.');
  if (!isNum(file.version) || file.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of Sehat. Update the app first.');
  }
  const date = (v: unknown) => {
    if (typeof v !== 'string' || !ISO_DATE.test(v)) throw new Error('The backup has an invalid date.');
    return fromISODate(v);
  };
  const list = <T>(v: unknown): T[] => (Array.isArray(v) ? v : []);

  return {
    goals: list<BackupFile['goals'][number]>(file.goals).map((g) => {
      if (!isNum(g.startKg) || !isNum(g.targetKg)) throw new Error('The backup has an invalid goal.');
      return {
        startDate: date(g.startDate),
        startKg: g.startKg,
        targetKg: g.targetKg,
        targetDate: date(g.targetDate),
        createdAt: typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString(),
      };
    }),
    labReports: list<BackupFile['labReports'][number]>(file.labReports).map((r) => {
      const values: LabValues = {};
      for (const [k, v] of Object.entries(r.values ?? {})) {
        if (KNOWN_TESTS.has(k) && isNum(v)) values[k as TestKey] = v;
      }
      return { date: date(r.date), lab: typeof r.lab === 'string' ? r.lab : null, values };
    }),
    waist: list<BackupFile['waist'][number]>(file.waist).map((w) => {
      if (!isNum(w.cm)) throw new Error('The backup has an invalid waist entry.');
      return { date: date(w.date), cm: w.cm };
    }),
    settings: Object.fromEntries(
      Object.entries(file.settings ?? {}).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>,
  };
}

const csvCell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per lab report, one column per test, oldest first: opens in any spreadsheet. */
export function labReportsCsv(reports: readonly Omit<LabReport, 'id'>[]): string {
  const header = ['Date', 'Lab', ...TESTS.map((t) => `${t.name} (${t.unit})`)];
  const rows = [...reports]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((r) => [toISODate(r.date), r.lab, ...TESTS.map((t) => r.values[t.key])]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
