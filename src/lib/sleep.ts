// Sleep nights and resting heart rate from Health Connect records. Pure functions only.

import { addDays, calendarDaysBetween, startOfLocalDay, toISODate } from './dates';

export type SleepStage = { start: Date; end: Date; awake: boolean };
export type SleepSession = { start: Date; end: Date; stages: SleepStage[] };

export type Night = {
  /** The morning you woke up. */
  date: Date;
  asleepMinutes: number;
  bedtime: Date;
  wake: Date;
};

type Interval = [number, number];

/** Total length of the union of intervals (overlaps from two apps are counted once). */
function unionMinutes(intervals: Interval[]): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current: Interval | null = null;
  for (const [s, e] of sorted) {
    if (!current || s > current[1]) {
      if (current) total += current[1] - current[0];
      current = [s, e];
    } else {
      current[1] = Math.max(current[1], e);
    }
  }
  if (current) total += current[1] - current[0];
  return total / 60_000;
}

/** Time asleep in a session: its stages minus awake ones, or the whole session without stages. */
function asleepIntervals(s: SleepSession): Interval[] {
  if (s.stages.length === 0) return [[s.start.getTime(), s.end.getTime()]];
  return s.stages.filter((st) => !st.awake).map((st) => [st.start.getTime(), st.end.getTime()]);
}

/**
 * One entry per morning, newest first. Sessions are grouped by the day they ended, so a
 * night from 23:30 to 06:45 belongs to the morning of 06:45, and naps that day add to it.
 */
export function nights(sessions: readonly SleepSession[]): Night[] {
  const byDay = new Map<string, SleepSession[]>();
  for (const s of sessions) {
    const key = toISODate(s.end);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  return [...byDay.values()]
    .map((group) => ({
      date: startOfLocalDay(group[0].end),
      asleepMinutes: Math.round(unionMinutes(group.flatMap(asleepIntervals))),
      bedtime: new Date(Math.min(...group.map((s) => s.start.getTime()))),
      wake: new Date(Math.max(...group.map((s) => s.end.getTime()))),
    }))
    .filter((n) => n.asleepMinutes > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export type SleepSummary = { last: Night | null; averageMinutes: number | null; nights: number };

/**
 * Last night (if it was within the last day) and the average over the `days` mornings up to
 * `now`. Pass an earlier `now` to get the same figures for an earlier week.
 */
export function sleepSummary(all: readonly Night[], now: Date, days = 7): SleepSummary {
  const recent = all.filter((n) => {
    const ago = calendarDaysBetween(n.date, now);
    return ago >= 0 && ago < days;
  });
  const last = recent[0] && calendarDaysBetween(recent[0].date, now) <= 1 ? recent[0] : null;
  return {
    last,
    averageMinutes: recent.length
      ? Math.round(recent.reduce((s, n) => s + n.asleepMinutes, 0) / recent.length)
      : null,
    nights: recent.length,
  };
}

/** "7 h 05 m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

export type HeartReading = { time: Date; bpm: number };
export type HeartSummary = { latest: HeartReading | null; average: number | null };

/** Latest resting heart rate and the average over the `days` days up to `now`. */
export function restingHeartSummary(readings: readonly HeartReading[], now: Date, days = 7): HeartSummary {
  const since = addDays(startOfLocalDay(now), -(days - 1));
  const recent = readings.filter((r) => r.time >= since && r.time <= now);
  const latest = [...recent].sort((a, b) => b.time.getTime() - a.time.getTime())[0] ?? null;
  return {
    latest,
    average: recent.length ? Math.round(recent.reduce((s, r) => s + r.bpm, 0) / recent.length) : null,
  };
}
