// Lipid panel classification against common adult reference ranges (NCEP ATP III), in mg/dL.
// Shown to the user as information, not a diagnosis.

export type LipidKey = 'total' | 'ldl' | 'hdl' | 'triglycerides';

export type LabReport = {
  id: number;
  date: Date;
  lab: string | null;
  total: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
};

export type Tone = 'good' | 'ok' | 'warn' | 'bad';
export type Classification = { label: string; tone: Tone };

export const LIPIDS: { key: LipidKey; name: string; min: number; max: number; higherIsBetter: boolean }[] = [
  { key: 'total', name: 'Total', min: 50, max: 600, higherIsBetter: false },
  { key: 'ldl', name: 'LDL', min: 10, max: 500, higherIsBetter: false },
  { key: 'hdl', name: 'HDL', min: 5, max: 200, higherIsBetter: true },
  { key: 'triglycerides', name: 'Triglycerides', min: 10, max: 3000, higherIsBetter: false },
];

/** Upper bounds (exclusive) of each band, in order. */
const BANDS: Record<LipidKey, [number, string, Tone][]> = {
  total: [
    [200, 'Desirable', 'good'],
    [240, 'Borderline high', 'warn'],
    [Infinity, 'High', 'bad'],
  ],
  ldl: [
    [100, 'Optimal', 'good'],
    [130, 'Near optimal', 'ok'],
    [160, 'Borderline high', 'warn'],
    [190, 'High', 'bad'],
    [Infinity, 'Very high', 'bad'],
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
};

export function classify(key: LipidKey, value: number): Classification {
  const band = BANDS[key].find(([upper]) => value < upper)!;
  return { label: band[1], tone: band[2] };
}

/** null if the value is fine (or empty), else a message. */
export function validateLipid(key: LipidKey, value: number | null): string | null {
  if (value === null) return null;
  const spec = LIPIDS.find((l) => l.key === key)!;
  if (!(value >= spec.min && value <= spec.max)) {
    return `${spec.name} should be between ${spec.min} and ${spec.max} mg/dL.`;
  }
  return null;
}

/**
 * Change in one value between the previous report that has it and the latest one.
 * Reports are newest first. `improved` accounts for HDL, where higher is better.
 */
export function lipidChange(
  reports: readonly LabReport[],
  key: LipidKey,
): { from: number; to: number; delta: number; improved: boolean } | null {
  const withValue = reports.filter((r) => r[key] !== null);
  if (withValue.length < 2) return null;
  const to = withValue[0][key]!;
  const from = withValue[1][key]!;
  const delta = to - from;
  const higherIsBetter = LIPIDS.find((l) => l.key === key)!.higherIsBetter;
  return { from, to, delta, improved: higherIsBetter ? delta > 0 : delta < 0 };
}
