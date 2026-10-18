import type {
  BackgroundAccessPermission,
  Permission,
  ReadHealthDataHistoryPermission,
} from 'react-native-health-connect';

/** Everything the app asks Health Connect for. Must match android.permissions in app.json. */
export const REQUESTED_PERMISSIONS: (Permission | ReadHealthDataHistoryPermission | BackgroundAccessPermission)[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  // Without this, Health Connect only shares data from 30 days before access was granted,
  // so a goal that started earlier would have no history.
  { accessType: 'read', recordType: 'ReadHealthDataHistory' },
  // Lets the home-screen widget refresh steps while the app is closed.
  { accessType: 'read', recordType: 'BackgroundAccessPermission' },
];

/**
 * The app can't work without these. Write access (logging a weigh-in), past-data and
 * background access are optional: without them only those features are limited.
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
