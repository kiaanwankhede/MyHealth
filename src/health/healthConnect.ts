import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  RecordingMethod,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { WEIGHT_LOOKBACK_DAYS } from '../config';
import { addDays, startOfLocalDay, toISODate } from '../lib/dates';
import type { DailySteps } from '../lib/steps';
import type { WeightReading } from '../lib/goal';
import { hasAllPermissions, REQUESTED_PERMISSIONS } from './permissions';

export type HealthConnectStatus =
  | 'unavailable' // Health Connect not installed / not supported on this device
  | 'needs-update' // Health Connect app must be updated from the Play Store
  | 'needs-permission'
  | 'ready';

export type { WeightReading };

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (!initialized) initialized = await initialize();
  return initialized;
}

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  const sdk = await getSdkStatus();
  if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'unavailable';
  if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
  if (!(await ensureInitialized())) return 'unavailable';
  return hasAllPermissions(await getGrantedPermissions()) ? 'ready' : 'needs-permission';
}

/** True when every requested permission is granted, including the optional ones (write, past data). */
export async function hasFullAccess(): Promise<boolean> {
  if (!(await ensureInitialized())) return false;
  return hasAllPermissions(await getGrantedPermissions(), REQUESTED_PERMISSIONS);
}

/** Shows the Health Connect permission sheet. Resolves true if the required reads were granted. */
export async function requestHealthConnectAccess(): Promise<boolean> {
  if (!(await ensureInitialized())) return false;
  return hasAllPermissions(await requestPermission(REQUESTED_PERMISSIONS));
}

export { openHealthConnectSettings };

/**
 * Steps since local midnight. Uses aggregation rather than summing raw records, so
 * Health Connect de-duplicates overlapping sources (e.g. Google Fit and a watch).
 */
export async function readStepsToday(now: Date = new Date()): Promise<number> {
  const result = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter: {
      operator: 'between',
      startTime: startOfLocalDay(now).toISOString(),
      endTime: now.toISOString(),
    },
  });
  return result.COUNT_TOTAL ?? 0;
}

/** Daily step totals for the last `days` days including today, oldest first; days without data are 0. */
export async function readDailySteps(days: number, now: Date = new Date()): Promise<DailySteps[]> {
  const first = addDays(startOfLocalDay(now), -(days - 1));
  const groups = await aggregateGroupByPeriod({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: first.toISOString(), endTime: now.toISOString() },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  // startTime comes back as a local date-time ("2026-10-17T00:00"), one group per day with data.
  const byDay = new Map<string, number>();
  for (const g of groups) byDay.set(g.startTime.slice(0, 10), g.result.COUNT_TOTAL ?? 0);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(first, i);
    return { date, steps: byDay.get(toISODate(date)) ?? 0 };
  });
}

export async function readLatestWeight(now: Date = new Date()): Promise<WeightReading | null> {
  const { records } = await readRecords('Weight', {
    timeRangeFilter: {
      operator: 'between',
      startTime: addDays(now, -WEIGHT_LOOKBACK_DAYS).toISOString(),
      endTime: now.toISOString(),
    },
    ascendingOrder: false,
    pageSize: 1,
  });
  const latest = records[0];
  return latest ? { kg: latest.weight.inKilograms, time: new Date(latest.time) } : null;
}

/** Every weigh-in between `from` and `to`, oldest first. */
export async function readWeightHistory(from: Date, to: Date): Promise<WeightReading[]> {
  const readings: WeightReading[] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Weight', {
      timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() },
      ascendingOrder: true,
      pageSize: 1000,
      pageToken,
    });
    for (const r of page.records) readings.push({ kg: r.weight.inKilograms, time: new Date(r.time) });
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return readings;
}

/** Saves a manual weigh-in to Health Connect, so Google Fit and other apps see it too. */
export async function writeWeight(kg: number, time: Date): Promise<void> {
  await insertRecords([
    {
      recordType: 'Weight',
      weight: { value: kg, unit: 'kilograms' },
      time: time.toISOString(),
      metadata: { recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY },
    },
  ]);
}
