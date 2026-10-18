import type {
  BackgroundAccessPermission,
  Permission,
  ReadHealthDataHistoryPermission,
} from 'react-native-health-connect';

/** Steps, weight and their history: the "Allow access" prompts on Steps and Weight are about these. */
export const CORE_PERMISSIONS: (Permission | ReadHealthDataHistoryPermission)[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  // Without this, Health Connect only shares data from 30 days before access was granted,
  // so a goal that started earlier would have no history.
  { accessType: 'read', recordType: 'ReadHealthDataHistory' },
];

/** Optional data a watch usually provides; Today shows it only when it's there. */
export const WATCH_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
];

/** Lets the home-screen widget refresh steps while the app is closed. Optional. */
export const BACKGROUND_PERMISSIONS: BackgroundAccessPermission[] = [
  { accessType: 'read', recordType: 'BackgroundAccessPermission' },
];

/** Everything the app asks Health Connect for. Must match android.permissions in app.json. */
export const REQUESTED_PERMISSIONS = [...CORE_PERMISSIONS, ...WATCH_PERMISSIONS, ...BACKGROUND_PERMISSIONS];

/**
 * The app can't work without these. Write access (logging a weigh-in) and past-data access
 * are optional: without them only those features are limited.
 */
export const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Weight' },
];

type GrantedPermission = { accessType: string; recordType: string };

export function hasAllPermissions(
  granted: readonly GrantedPermission[],
  required: readonly GrantedPermission[] = REQUIRED_PERMISSIONS,
): boolean {
  return required.every((r) =>
    granted.some((g) => g.accessType === r.accessType && g.recordType === r.recordType),
  );
}
