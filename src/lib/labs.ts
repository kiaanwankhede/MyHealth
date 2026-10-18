// Lab tests Sehat tracks, with plain-language status for each value. Pure functions only.
// Ranges are common adult reference ranges; LDL and non-HDL use the user's personal target
// when their heart-risk level is set (Lipid Association of India). Shown as information,
// not a diagnosis.

import { ldlTarget, type HeartRisk, type Sex } from './profile';

export type TestKey =
  | 'total'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'lpa'
  | 'hba1c'
  | 'glucose'
  | 'systolic'
  | 'diastolic'
  | 'tsh'
  | 'vitd'
  | 'b12'
  | 'creatinine';

export type GroupKey = 'lipids' | 'sugar' | 'bp' | 'thyroid' | 'vitamins' | 'kidney';

export type TestSpec = {
  key: TestKey;
  group: GroupKey;
  name: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  /** For "change since last": null when neither direction is simply better. */
  higherIsBetter: boolean | null;
};

export const TESTS: TestSpec[] = [
  {
    key: 'total',
    group: 'lipids',
    name: 'Total cholesterol',
    unit: 'mg/dL',
    min: 50,
    max: 600,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'ldl',
    group: 'lipids',
    name: 'LDL',
    unit: 'mg/dL',
    min: 10,
    max: 500,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'hdl',
    group: 'lipids',
    name: 'HDL',
    unit: 'mg/dL',
    min: 5,
    max: 200,
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'triglycerides',
    group: 'lipids',
    name: 'Triglycerides',
    unit: 'mg/dL',
    min: 10,
    max: 3000,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'lpa',
    group: 'lipids',
    name: 'Lp(a)',
    unit: 'mg/dL',
    min: 0.5,
    max: 500,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'hba1c',
    group: 'sugar',
    name: 'HbA1c',
    unit: '%',
    min: 3,
    max: 20,
    decimals: 1,
    higherIsBetter: false,
  },
  {
    key: 'glucose',
    group: 'sugar',
    name: 'Fasting glucose',
    unit: 'mg/dL',
    min: 30,
    max: 600,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'systolic',
    group: 'bp',
    name: 'Systolic (upper)',
    unit: 'mmHg',
    min: 60,
    max: 260,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'diastolic',
    group: 'bp',
    name: 'Diastolic (lower)',
    unit: 'mmHg',
    min: 30,
    max: 160,
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'tsh',
    group: 'thyroid',
    name: 'TSH',
    unit: 'µIU/mL',
    min: 0.005,
    max: 150,
    decimals: 2,
    higherIsBetter: null,
  },
  {
    key: 'vitd',
    group: 'vitamins',
    name: 'Vitamin D (25-OH)',
    unit: 'ng/mL',
    min: 2,
    max: 250,
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'b12',
    group: 'vitamins',
    name: 'Vitamin B12',
    unit: 'pg/mL',
    min: 30,
    max: 3000,
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'creatinine',
    group: 'kidney',
    name: 'Creatinine',
    unit: 'mg/dL',
    min: 0.1,
    max: 20,
    decimals: 2,
    higherIsBetter: false,
  },
];

export const GROUPS: { key: GroupKey; name: string }[] = [
  { key: 'lipids', name: 'Cholesterol' },
  { key: 'sugar', name: 'Blood sugar' },
  { key: 'bp', name: 'Blood pressure' },
  { key: 'thyroid', name: 'Thyroid' },
  { key: 'vitamins', name: 'Vitamins' },
  { key: 'kidney', name: 'Kidney' },
];

export const testSpec = (key: TestKey): TestSpec => TESTS.find((t) => t.key === key)!;
export const testsIn = (group: GroupKey): TestSpec[] => TESTS.filter((t) => t.group === group);

export type LabValues = Partial<Record<TestKey, number>>;

export type LabReport = { id: number; date: Date; lab: string | null; values: LabValues };

export type Tone = 'good' | 'ok' | 'warn' | 'bad';
export type Classification = { label: string; tone: Tone };

/** What classification depends on beyond the value itself. */
export type LabContext = { heartRisk: HeartRisk; sex: Sex | null; age: number | null };

export const NO_CONTEXT: LabContext = { heartRisk: 'unknown', sex: null, age: null };

/** [exclusive upper bound, label, tone], in order. */
type Bands = [number, string, Tone][];

const band = (bands: Bands, value: number): Classification => {
  const [, label, tone] = bands.find(([upper]) => value < upper)!;
  return { label, tone };
};

// NCEP ATP III, used for LDL and non-HDL when no personal target is set.
const LDL_BANDS: Bands = [
  [100, 'Optimal', 'good'],
  [130, 'Near optimal', 'ok'],
  [160, 'Borderline high', 'warn'],
  [190, 'High', 'bad'],
  [Infinity, 'Very high', 'bad'],
];
const NON_HDL_BANDS: Bands = [
  [130, 'Desirable', 'good'],
  [160, 'Borderline high', 'warn'],
  [190, 'High', 'bad'],
  [Infinity, 'Very high', 'bad'],
];

const BANDS: Partial<Record<TestKey, Bands>> = {
  total: [
    [200, 'Desirable', 'good'],
    [240, 'Borderline high', 'warn'],
    [Infinity, 'High', 'bad'],
  ],
  hdl: [
    [40, 'Low', 'bad'],
    [60, 'Acceptable', 'ok'],
    [Infinity, 'Good', 'good'],
  ],
  triglycerides: [
    [150, 'Normal', 'good'],
    [200, 'Borderline high', 'warn'],
    [500, 'High', 'bad'],
    [Infinity, 'Very high', 'bad'],
  ],
  // mg/dL; above 50 raises heart risk and is mostly inherited.
  lpa: [
    [30, 'Normal', 'good'],
    [50, 'Borderline', 'warn'],
    [Infinity, 'High (inherited risk)', 'bad'],
  ],
  hba1c: [
    [5.7, 'Normal', 'good'],
    [6.5, 'Prediabetes range', 'warn'],
    [Infinity, 'Diabetes range', 'bad'],
  ],
  glucose: [
    [70, 'Low', 'warn'],
    [100, 'Normal', 'good'],
    [126, 'Prediabetes range', 'warn'],
    [Infinity, 'Diabetes range', 'bad'],
  ],
  tsh: [
    [0.4, 'Low', 'warn'],
    [4.5001, 'Normal', 'good'],
    [10.0001, 'High', 'warn'],
    [Infinity, 'Very high', 'bad'],
  ],
  vitd: [
    [20, 'Deficient', 'bad'],
    [30, 'Insufficient', 'warn'],
    [100.0001, 'Sufficient', 'good'],
    [Infinity, 'Very high', 'warn'],
  ],
  b12: [
    [200, 'Low', 'bad'],
    [300, 'Borderline', 'warn'],
    [Infinity, 'Normal', 'good'],
  ],
};

/** Against a personal target: at/under it is good, up to 30% over is a warning. */
function againstTarget(value: number, target: number): Classification {
  if (value < target) return { label: `At target (under ${target})`, tone: 'good' };
  return { label: `Above your target of ${target}`, tone: value < target * 1.3 ? 'warn' : 'bad' };
}

/**
 * Status for one value. Blood pressure halves return null (use classifyBp on the pair);
 * creatinine is judged through eGFR when age and sex are known.
 */
export function classify(key: TestKey, value: number, ctx: LabContext = NO_CONTEXT): Classification | null {
  if (key === 'systolic' || key === 'diastolic') return null;
  if (key === 'ldl') {
    const target = ldlTarget(ctx.heartRisk);
    return target === null ? band(LDL_BANDS, value) : againstTarget(value, target);
  }
  if (key === 'creatinine') {
    if (ctx.age !== null && ctx.sex !== null) return classifyEgfr(egfr(value, ctx.age, ctx.sex));
    const [low, high] = ctx.sex === 'female' ? [0.5, 1.1] : ctx.sex === 'male' ? [0.7, 1.3] : [0.5, 1.3];
    if (value < low) return { label: 'Low', tone: 'ok' };
    return value <= high ? { label: 'Normal', tone: 'good' } : { label: 'High', tone: 'bad' };
  }
  return band(BANDS[key]!, value);
}

/** Indian Society of Hypertension (ISH 2020) grades, for one reading. */
export function classifyBp(systolic: number, diastolic: number): Classification {
  if (systolic < 90) return { label: 'Low', tone: 'warn' };
  if (systolic < 130 && diastolic < 85) return { label: 'Normal', tone: 'good' };
  if (systolic < 140 && diastolic < 90) return { label: 'High-normal', tone: 'warn' };
  if (systolic < 160 && diastolic < 100) return { label: 'High (grade 1)', tone: 'bad' };
  return { label: 'High (grade 2)', tone: 'bad' };
}

/** Total minus HDL: all the cholesterol that can clog arteries. */
export function nonHdl(values: LabValues): number | null {
  return values.total !== undefined && values.hdl !== undefined ? values.total - values.hdl : null;
}

export function classifyNonHdl(value: number, ctx: LabContext = NO_CONTEXT): Classification {
  const target = ldlTarget(ctx.heartRisk);
  return target === null ? band(NON_HDL_BANDS, value) : againstTarget(value, target + 30);
}

/** Estimated kidney filtration (CKD-EPI 2021, no race term), mL/min/1.73m². */
export function egfr(creatinine: number, age: number, sex: Sex): number {
  const female = sex === 'female';
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const r = creatinine / k;
  return 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
}

export function classifyEgfr(value: number): Classification {
  return band(
    [
      [15, 'Kidney failure range', 'bad'],
      [30, 'Severely reduced', 'bad'],
      [45, 'Moderately to severely reduced', 'bad'],
      [60, 'Mildly to moderately reduced', 'warn'],
      [90, 'Mildly reduced', 'ok'],
      [Infinity, 'Normal', 'good'],
    ],
    value,
  );
}

export function formatLabValue(key: TestKey, value: number): string {
  const { decimals } = testSpec(key);
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

/** null if the value is fine (or empty), else a message. */
export function validateValue(key: TestKey, value: number | null): string | null {
  if (value === null) return null;
  const spec = testSpec(key);
  if (!(value >= spec.min && value <= spec.max)) {
    return `${spec.name} should be between ${spec.min} and ${spec.max} ${spec.unit}.`;
  }
  return null;
}

/** Blood pressure needs both numbers or neither. */
export function validateReport(values: LabValues): string[] {
  const errors = TESTS.map(({ key }) => validateValue(key, values[key] ?? null)).filter(
    (e): e is string => !!e,
  );
  if ((values.systolic === undefined) !== (values.diastolic === undefined)) {
    errors.push('Enter both blood pressure numbers, e.g. 120 / 80.');
  } else if (values.systolic !== undefined && values.diastolic! >= values.systolic) {
    errors.push('The upper blood pressure number should be bigger than the lower one.');
  }
  return errors;
}

export type Reading = { value: number; date: Date };

/** Newest and previous value of one test across reports (newest first). */
export function history(reports: readonly LabReport[], key: TestKey): Reading[] {
  return reports
    .filter((r) => r.values[key] !== undefined)
    .map((r) => ({ value: r.values[key]!, date: r.date }));
}

export function latest(reports: readonly LabReport[], key: TestKey): Reading | null {
  return history(reports, key)[0] ?? null;
}

/**
 * Change between the previous report that has the value and the latest one.
 * `improved` is null when neither direction is simply better (e.g. TSH).
 */
export function valueChange(
  reports: readonly LabReport[],
  key: TestKey,
): { from: number; to: number; delta: number; improved: boolean | null } | null {
  const [to, from] = history(reports, key);
  if (!to || !from) return null;
  const delta = to.value - from.value;
  const better = testSpec(key).higherIsBetter;
  return {
    from: from.value,
    to: to.value,
    delta,
    improved: better === null ? null : better ? delta > 0 : delta < 0,
  };
}

/** Months until a group is worth re-testing, given its latest results. */
export function retestMonths(group: GroupKey, reports: readonly LabReport[]): number {
  if (group === 'bp') return 3;
  if (group === 'sugar') {
    const a1c = latest(reports, 'hba1c')?.value;
    const glucose = latest(reports, 'glucose')?.value;
    if ((a1c ?? 0) >= 6.5 || (glucose ?? 0) >= 126) return 3;
    if ((a1c ?? 0) >= 5.7 || (glucose ?? 0) >= 100) return 6;
  }
  return 12;
}

export type Due = { group: GroupKey; name: string; last: Date; due: Date };

/** Groups the user has tested before whose re-test date has passed, most overdue first. */
export function retestsDue(reports: readonly LabReport[], now: Date): Due[] {
  const due: Due[] = [];
  for (const g of GROUPS) {
    // Lp(a) is a once-in-a-lifetime test, so it doesn't keep the cholesterol panel "fresh".
    const keys = testsIn(g.key)
      .map((t) => t.key)
      .filter((k) => k !== 'lpa');
    const last = reports.find((r) => keys.some((k) => r.values[k] !== undefined))?.date;
    if (!last) continue;
    const dueDate = new Date(last);
    dueDate.setMonth(dueDate.getMonth() + retestMonths(g.key, reports));
    if (dueDate <= now) due.push({ group: g.key, name: g.name, last, due: dueDate });
  }
  return due.sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** A gentle once-only prompt: Lp(a) is worth measuring once, especially for South Asians. */
export function shouldSuggestLpa(reports: readonly LabReport[]): boolean {
  return reports.length > 0 && latest(reports, 'lpa') === null && latest(reports, 'ldl') !== null;
}
