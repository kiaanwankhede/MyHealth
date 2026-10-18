import {
  bmi,
  classifyBmi,
  classifyWaist,
  classifyWaistToHeight,
  healthyWeightRange,
  validateWaist,
  waistToHeight,
} from '../body';

describe('BMI with Asian cut-offs', () => {
  it('computes BMI and bands it at 18.5 / 23 / 25', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(classifyBmi(18.4).label).toBe('Underweight');
    expect(classifyBmi(22.9).label).toBe('Healthy');
    expect(classifyBmi(23).label).toBe('Overweight');
    expect(classifyBmi(25).label).toBe('Obese');
  });

  it('gives the healthy weight range for a height', () => {
    const r = healthyWeightRange(175);
    expect(r.min).toBeCloseTo(56.7, 1);
    expect(r.max).toBeCloseTo(70.3, 1);
  });
});

describe('waist', () => {
  it('uses 90 cm for men and 80 cm for women', () => {
    expect(classifyWaist(89, 'male')!.tone).toBe('good');
    expect(classifyWaist(90, 'male')!.tone).toBe('bad');
    expect(classifyWaist(80, 'female')!.tone).toBe('bad');
    expect(classifyWaist(80, null)).toBeNull();
  });

  it('flags waist-to-height of 0.5 and above', () => {
    expect(waistToHeight(88, 176)).toBe(0.5);
    expect(classifyWaistToHeight(0.49).tone).toBe('good');
    expect(classifyWaistToHeight(0.5).tone).toBe('bad');
  });

  it('validates plausible waist sizes', () => {
    expect(validateWaist(85)).toBeNull();
    expect(validateWaist(20)).toMatch(/between/);
  });
});
