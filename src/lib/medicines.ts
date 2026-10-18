// Medicines and daily doses. Pure functions only.

import { toISODate } from './dates';

export type Medicine = {
  id: number;
  name: string;
  dose: string | null;
  /** Times of day to take it, "HH:MM", sorted. */
  times: string[];
  remind: boolean;
  startDate: Date;
  /** Set when you stop taking it; the history stays. */
  stoppedDate: Date | null;
};

/** One taken dose: which medicine, which day ("2026-10-18") and which time slot. */
export type TakenDose = { medicineId: number; date: string; time: string };

export type DoseSlot = { medicine: Medicine; time: string; taken: boolean };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isTime = (t: string) => TIME.test(t);

/** "08:00" → { hour: 8, minute: 0 } */
export function parseTime(t: string): { hour: number; minute: number } {
  const [hour, minute] = t.split(':').map(Number);
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const isActive = (m: Medicine, on: Date) =>
  toISODate(m.startDate) <= toISODate(on) &&
  (m.stoppedDate === null || toISODate(m.stoppedDate) > toISODate(on));

/** Today's doses of every active medicine, in time order, each marked taken or not. */
export function dosesOn(medicines: readonly Medicine[], taken: readonly TakenDose[], date: Date): DoseSlot[] {
  const day = toISODate(date);
  const done = new Set(taken.filter((d) => d.date === day).map((d) => `${d.medicineId}|${d.time}`));
  return medicines
    .filter((m) => isActive(m, date))
    .flatMap((m) => m.times.map((time) => ({ medicine: m, time, taken: done.has(`${m.id}|${time}`) })))
    .sort((a, b) => a.time.localeCompare(b.time) || a.medicine.name.localeCompare(b.medicine.name));
}

/** null if the medicine can be saved, else a message. */
export function validateMedicine(m: Pick<Medicine, 'name' | 'times'>): string | null {
  if (m.name.trim() === '') return 'Enter the medicine’s name.';
  if (m.times.length === 0) return 'Add at least one time of day.';
  if (!m.times.every(isTime)) return 'A time is not valid.';
  if (new Set(m.times).size !== m.times.length) return 'The same time is listed twice.';
  return null;
}
