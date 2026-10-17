import { hasAllPermissions, REQUESTED_PERMISSIONS, REQUIRED_PERMISSIONS } from '../permissions';

describe('hasAllPermissions', () => {
  it('requires read access to steps and weight', () => {
    expect(REQUIRED_PERMISSIONS).toEqual([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Weight' },
    ]);
  });

  it('is true when every required read is granted, even without write', () => {
    expect(
      hasAllPermissions([
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'Steps' },
      ]),
    ).toBe(true);
  });

  it('is false when a read is missing', () => {
    expect(hasAllPermissions([{ accessType: 'read', recordType: 'Steps' }])).toBe(false);
  });

  it('does not treat write access as read access', () => {
    expect(
      hasAllPermissions([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'write', recordType: 'Weight' },
      ]),
    ).toBe(false);
  });

  it('is true when everything requested is granted', () => {
    expect(hasAllPermissions(REQUESTED_PERMISSIONS)).toBe(true);
  });
});
