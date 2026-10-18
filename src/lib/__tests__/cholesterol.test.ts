import { classify, lipidChange, validateLipid, type LabReport } from '../cholesterol';

describe('classify', () => {
  it('matches the deck sample report', () => {
    expect(classify('total', 196)).toEqual({ label: 'Desirable', tone: 'good' });
    expect(classify('ldl', 128)).toEqual({ label: 'Near optimal', tone: 'ok' });
    expect(classify('hdl', 46)).toEqual({ label: 'Acceptable', tone: 'ok' });
    expect(classify('triglycerides', 142)).toEqual({ label: 'Normal', tone: 'good' });
  });

  it('uses the band boundaries correctly', () => {
    expect(classify('total', 199).label).toBe('Desirable');
    expect(classify('total', 200).label).toBe('Borderline high');
    expect(classify('total', 240).label).toBe('High');
    expect(classify('ldl', 99).label).toBe('Optimal');
    expect(classify('ldl', 160).label).toBe('High');
    expect(classify('ldl', 190).label).toBe('Very high');
    expect(classify('hdl', 39).label).toBe('Low');
    expect(classify('hdl', 60).label).toBe('Good');
    expect(classify('triglycerides', 150).label).toBe('Borderline high');
    expect(classify('triglycerides', 500).label).toBe('Very high');
  });
});

describe('validateLipid', () => {
  it('allows empty and plausible values, rejects implausible ones', () => {
    expect(validateLipid('ldl', null)).toBeNull();
    expect(validateLipid('ldl', 128)).toBeNull();
    expect(validateLipid('ldl', 5)).toMatch(/LDL/);
    expect(validateLipid('hdl', Number.NaN)).toMatch(/HDL/);
  });
});

function report(id: number, values: Partial<LabReport>): LabReport {
  return { id, date: new Date(2026, id, 1), lab: null, total: null, ldl: null, hdl: null, triglycerides: null, ...values };
}

describe('lipidChange', () => {
  // Newest first, as the screen holds them.
  const reports = [report(8, { ldl: 128, hdl: 46 }), report(5, { ldl: 139 }), report(2, { ldl: 152, hdl: 42 })];

  it('compares the two most recent reports with a value', () => {
    expect(lipidChange(reports, 'ldl')).toEqual({ from: 139, to: 128, delta: -11, improved: true });
  });

  it('skips reports missing that value, and treats higher HDL as better', () => {
    expect(lipidChange(reports, 'hdl')).toEqual({ from: 42, to: 46, delta: 4, improved: true });
  });

  it('needs two values', () => {
    expect(lipidChange(reports, 'total')).toBeNull();
  });
});
