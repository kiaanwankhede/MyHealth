import {
  classify,
  classifyBp,
  classifyEgfr,
  classifyNonHdl,
  egfr,
  nonHdl,
  retestsDue,
  shouldSuggestLpa,
  validateReport,
  validateValue,
  valueChange,
  type LabReport,
} from '../labs';

const report = (id: number, month: number, values: LabReport['values']): LabReport => ({
  id,
  date: new Date(2026, month, 1),
  lab: null,
  values,
});

describe('classify', () => {
  it('uses ATP III ranges for lipids when no heart-risk level is set', () => {
    expect(classify('total', 196)).toEqual({ label: 'Desirable', tone: 'good' });
    expect(classify('ldl', 128)).toEqual({ label: 'Near optimal', tone: 'ok' });
    expect(classify('ldl', 99)!.label).toBe('Optimal');
    expect(classify('ldl', 190)!.label).toBe('Very high');
    expect(classify('hdl', 39)!.label).toBe('Low');
    expect(classify('triglycerides', 150)!.label).toBe('Borderline high');
  });

  it('judges LDL against the personal target when risk is set', () => {
    const ctx = { heartRisk: 'high' as const, sex: null, age: null };
    expect(classify('ldl', 65, ctx)).toEqual({ label: 'At target (under 70)', tone: 'good' });
    expect(classify('ldl', 85, ctx)).toEqual({ label: 'Above your target of 70', tone: 'warn' });
    expect(classify('ldl', 128, ctx)!.tone).toBe('bad');
  });

  it('classifies sugar, thyroid and vitamins', () => {
    expect(classify('hba1c', 5.6)!.label).toBe('Normal');
    expect(classify('hba1c', 5.7)!.label).toBe('Prediabetes range');
    expect(classify('hba1c', 6.5)!.label).toBe('Diabetes range');
    expect(classify('glucose', 126)!.label).toBe('Diabetes range');
    expect(classify('tsh', 4.5)!.label).toBe('Normal');
    expect(classify('tsh', 6)!.label).toBe('High');
    expect(classify('vitd', 18)!.label).toBe('Deficient');
    expect(classify('vitd', 25)!.label).toBe('Insufficient');
    expect(classify('vitd', 100)!.label).toBe('Sufficient');
    expect(classify('b12', 250)!.label).toBe('Borderline');
    expect(classify('lpa', 60)!.label).toBe('High (inherited risk)');
  });

  it('leaves blood pressure halves to classifyBp', () => {
    expect(classify('systolic', 120)).toBeNull();
    expect(classifyBp(118, 76).label).toBe('Normal');
    expect(classifyBp(134, 80).label).toBe('High-normal');
    expect(classifyBp(128, 88).label).toBe('High-normal');
    expect(classifyBp(145, 92).label).toBe('High (grade 1)');
    expect(classifyBp(165, 95).label).toBe('High (grade 2)');
  });

  it('judges creatinine through eGFR when age and sex are known', () => {
    expect(classify('creatinine', 1.0, { heartRisk: 'unknown', sex: 'male', age: 40 })!.label).toBe('Normal');
    expect(classify('creatinine', 1.5)!.label).toBe('High');
  });
});

describe('derived values', () => {
  it('computes non-HDL and judges it against LDL target + 30', () => {
    expect(nonHdl({ total: 196, hdl: 46 })).toBe(150);
    expect(nonHdl({ total: 196 })).toBeNull();
    expect(classifyNonHdl(150).label).toBe('Borderline high');
    expect(classifyNonHdl(95, { heartRisk: 'high', sex: null, age: null }).label).toBe(
      'At target (under 100)',
    );
  });

  it('computes eGFR with CKD-EPI 2021', () => {
    // Worked by hand: 142 × (Scr/κ)^-1.2 × 0.9938^age (× 1.012 for women).
    expect(egfr(1.0, 50, 'male')).toBeCloseTo(91.7, 1);
    expect(egfr(0.8, 50, 'female')).toBeCloseTo(89.7, 1);
    expect(classifyEgfr(95).label).toBe('Normal');
    expect(classifyEgfr(50).label).toBe('Mildly to moderately reduced');
  });
});

describe('validation', () => {
  it('checks plausible ranges and blood pressure pairs', () => {
    expect(validateValue('ldl', null)).toBeNull();
    expect(validateValue('ldl', 5)).toMatch(/LDL/);
    expect(validateValue('hba1c', Number.NaN)).toMatch(/HbA1c/);
    expect(validateReport({ systolic: 120 })).toContain('Enter both blood pressure numbers, e.g. 120 / 80.');
    expect(validateReport({ systolic: 80, diastolic: 120 })[0]).toMatch(/upper/);
    expect(validateReport({ systolic: 120, diastolic: 80, ldl: 100 })).toEqual([]);
  });
});

describe('valueChange', () => {
  const reports = [
    report(3, 8, { ldl: 128, hdl: 46, tsh: 3 }),
    report(2, 5, { ldl: 139, tsh: 2 }),
    report(1, 2, { hdl: 42 }),
  ];

  it('compares the two latest reports that have the value', () => {
    expect(valueChange(reports, 'ldl')).toEqual({ from: 139, to: 128, delta: -11, improved: true });
    expect(valueChange(reports, 'hdl')).toEqual({ from: 42, to: 46, delta: 4, improved: true });
    expect(valueChange(reports, 'tsh')!.improved).toBeNull();
    expect(valueChange(reports, 'vitd')).toBeNull();
  });
});

describe('retestsDue', () => {
  it('flags tested groups past their re-test date, sooner for high sugar', () => {
    const reports = [report(2, 0, { ldl: 120, hba1c: 6.0 })];
    expect(retestsDue(reports, new Date(2026, 5, 15)).map((d) => d.group)).toEqual([]);
    expect(retestsDue(reports, new Date(2026, 7, 1)).map((d) => d.group)).toEqual(['sugar']);
    expect(retestsDue(reports, new Date(2027, 0, 2)).map((d) => d.group)).toEqual(['sugar', 'lipids']);
  });

  it('does not count a once-only Lp(a) test as a cholesterol check', () => {
    const reports = [report(2, 0, { lpa: 20 })];
    expect(retestsDue(reports, new Date(2030, 0, 1))).toEqual([]);
  });

  it('suggests Lp(a) only to people tracking LDL who never had it', () => {
    expect(shouldSuggestLpa([report(1, 0, { ldl: 100 })])).toBe(true);
    expect(shouldSuggestLpa([report(1, 0, { ldl: 100, lpa: 20 })])).toBe(false);
    expect(shouldSuggestLpa([])).toBe(false);
  });
});
