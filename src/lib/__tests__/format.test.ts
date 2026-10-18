import { formatCount, formatKg, parseKg, percentOfGoal } from '../format';

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [7842, '7,842'],
    [10000, '10,000'],
    [1234567, '1,234,567'],
    [7841.6, '7,842'],
  ])('%p -> %p', (input, expected) => {
    expect(formatCount(input)).toBe(expected);
  });
});

describe('formatKg', () => {
  it('rounds to one decimal', () => {
    expect(formatKg(82.44)).toBe('82.4');
    expect(formatKg(82.45999)).toBe('82.5');
    expect(formatKg(75)).toBe('75.0');
  });
});

describe('percentOfGoal', () => {
  it('rounds and clamps', () => {
    expect(percentOfGoal(7842, 10000)).toBe(78);
    expect(percentOfGoal(15000, 10000)).toBe(100);
    expect(percentOfGoal(-5, 10000)).toBe(0);
    expect(percentOfGoal(100, 0)).toBe(0);
  });
});

describe('parseKg', () => {
  it('accepts dot or comma decimals', () => {
    expect(parseKg('82.4')).toBe(82.4);
    expect(parseKg(' 82,4 ')).toBe(82.4);
    expect(parseKg('75')).toBe(75);
  });

  it('rejects anything else', () => {
    expect(parseKg('')).toBeNaN();
    expect(parseKg('82.')).toBeNaN();
    expect(parseKg('8a')).toBeNaN();
    expect(parseKg('-3')).toBeNaN();
  });
});
