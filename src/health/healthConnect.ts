import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { WEIGHT_LOOKBACK_DAYS } from '../config';
import { addDays, startOfLocalDay } from '../lib/dates';
import { hasAllPermissions, REQUESTED_PERMISSIONS } from './permissions';

export type HealthConnectStatus =
  | 'unavailable' // Health Connect not installed / not supported on this device
  | 'needs-update' // Health Connect app must be updated from the Play Store
  | 'needs-permission'
  | 'ready';

export type WeightReading = { kg: number; time: Date };

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
