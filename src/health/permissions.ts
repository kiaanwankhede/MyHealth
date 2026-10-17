import type { Permission } from 'react-native-health-connect';

/** Everything the app asks Health Connect for. Must match android.permissions in app.json. */
export const REQUESTED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
];

/** The app works without write access (manual weigh-ins just stay local), but not without these. */
export const REQUIRED_PERMISSIONS: Permission[] = REQUESTED_PERMISSIONS.filter(
  (p) => p.accessType === 'read',
);

type GrantedPermission = { accessType: string; recordType: string };

export function hasAllPermissions(
  granted: readonly GrantedPermission[],
  required: readonly Permission[] = REQUIRED_PERMISSIONS,
): boolean {
  return required.every((r) =>
    granted.some((g) => g.accessType === r.accessType && g.recordType === r.recordType),
  );
}
