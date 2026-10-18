import { ageOn, DEFAULT_PROFILE, ldlTarget, parseProfile, validateProfile } from '../profile';

describe('profile', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(parseProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(parseProfile('not json')).toEqual(DEFAULT_PROFILE);
    expect(parseProfile('{"heightCm": 900, "sex": "x", "stepGoal": 8000, "heartRisk": "high"}')).toEqual({
      ...DEFAULT_PROFILE,
      stepGoal: 8000,
      heartRisk: 'high',
    });
  });

  it('maps heart risk to LAI LDL targets', () => {
    expect(ldlTarget('unknown')).toBeNull();
    expect(ldlTarget('low-moderate')).toBe(100);
    expect(ldlTarget('high')).toBe(70);
    expect(ldlTarget('very-high')).toBe(50);
    expect(ldlTarget('extreme')).toBe(30);
  });

  it('validates and computes age', () => {
    const now = new Date(2026, 9, 18);
    expect(validateProfile({ ...DEFAULT_PROFILE, heightCm: 172, birthYear: 1985 }, now)).toBeNull();
    expect(validateProfile({ ...DEFAULT_PROFILE, heightCm: 17 }, now)).toMatch(/Height/);
    expect(validateProfile({ ...DEFAULT_PROFILE, stepGoal: Number.NaN }, now)).toMatch(/Step goal/);
    expect(ageOn({ ...DEFAULT_PROFILE, birthYear: 1985 }, now)).toBe(41);
  });
});
