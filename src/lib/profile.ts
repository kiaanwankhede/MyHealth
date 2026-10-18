// The few personal details Sehat needs for body and lab maths. Stored locally (kv table).

export type Sex = 'male' | 'female';

/**
 * Heart-risk level as set by the user's doctor. Picks the LDL target from the
 * Lipid Association of India (LAI) risk categories.
 */
export type HeartRisk = 'unknown' | 'low-moderate' | 'high' | 'very-high' | 'extreme';

export type Profile = {
  heightCm: number | null;
  sex: Sex | null;
  birthYear: number | null;
  stepGoal: number;
  heartRisk: HeartRisk;
};

export const DEFAULT_PROFILE: Profile = {
  heightCm: null,
  sex: null,
  birthYear: null,
  stepGoal: 10_000,
  heartRisk: 'unknown',
};

/** LDL goals in mg/dL by LAI risk category. */
export const LDL_TARGETS: Record<Exclude<HeartRisk, 'unknown'>, number> = {
  'low-moderate': 100,
  high: 70,
  'very-high': 50,
  extreme: 30,
};

export const HEART_RISK_LABELS: Record<HeartRisk, string> = {
  unknown: 'Not set',
  'low-moderate': 'Low or moderate',
  high: 'High',
  'very-high': 'Very high',
  extreme: 'Extreme',
};

export function ldlTarget(risk: HeartRisk): number | null {
  return risk === 'unknown' ? null : LDL_TARGETS[risk];
}

export function ageOn(profile: Profile, date: Date): number | null {
  return profile.birthYear === null ? null : date.getFullYear() - profile.birthYear;
}

/** Reads a stored profile, filling anything missing or malformed with defaults. */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return DEFAULT_PROFILE;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    const num = (v: unknown, min: number, max: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
    return {
      heightCm: num(p.heightCm, 100, 250),
      sex: p.sex === 'male' || p.sex === 'female' ? p.sex : null,
      birthYear: num(p.birthYear, 1900, 2100),
      stepGoal: num(p.stepGoal, 1000, 50_000) ?? DEFAULT_PROFILE.stepGoal,
      heartRisk: p.heartRisk && p.heartRisk in HEART_RISK_LABELS ? p.heartRisk : 'unknown',
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** null if the profile can be saved, else a message for the first problem. */
export function validateProfile(p: Profile, now: Date): string | null {
  if (p.heightCm !== null && !(p.heightCm >= 100 && p.heightCm <= 250))
    return 'Height should be between 100 and 250 cm.';
  if (p.birthYear !== null && !(p.birthYear >= 1900 && p.birthYear <= now.getFullYear() - 10)) {
    return 'Please check the birth year.';
  }
  if (!(p.stepGoal >= 1000 && p.stepGoal <= 50_000)) return 'Step goal should be between 1,000 and 50,000.';
  return null;
}
