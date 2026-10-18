import { dosesOn, formatTime, isActive, parseTime, validateMedicine, type Medicine } from '../medicines';

const med = (over: Partial<Medicine>): Medicine => ({
  id: 1,
  name: 'Rosuvastatin',
  dose: '10 mg',
  times: ['21:00'],
  remind: true,
  startDate: new Date(2026, 6, 1),
  stoppedDate: null,
  ...over,
});

describe('medicines', () => {
  const today = new Date(2026, 9, 18, 10);

  it('lists today’s doses in time order and marks taken ones', () => {
    const meds = [med({ id: 1 }), med({ id: 2, name: 'Thyronorm', dose: '50 mcg', times: ['07:00'] })];
    const doses = dosesOn(meds, [{ medicineId: 2, date: '2026-10-18', time: '07:00' }], today);
    expect(doses.map((d) => [d.medicine.name, d.time, d.taken])).toEqual([
      ['Thyronorm', '07:00', true],
      ['Rosuvastatin', '21:00', false],
    ]);
  });

  it('ignores doses from other days and medicines not active today', () => {
    const meds = [
      med({ id: 1 }),
      med({ id: 3, stoppedDate: new Date(2026, 9, 1) }),
      med({ id: 4, startDate: new Date(2026, 9, 19) }),
    ];
    const doses = dosesOn(meds, [{ medicineId: 1, date: '2026-10-17', time: '21:00' }], today);
    expect(doses.map((d) => [d.medicine.id, d.taken])).toEqual([[1, false]]);
  });

  it('is active from the start date until the day it was stopped', () => {
    const m = med({ startDate: new Date(2026, 9, 1), stoppedDate: new Date(2026, 9, 10) });
    expect(isActive(m, new Date(2026, 9, 1, 8))).toBe(true);
    expect(isActive(m, new Date(2026, 9, 9, 23))).toBe(true);
    expect(isActive(m, new Date(2026, 9, 10, 8))).toBe(false);
  });

  it('validates name and times', () => {
    expect(validateMedicine({ name: ' ', times: ['08:00'] })).toMatch(/name/);
    expect(validateMedicine({ name: 'A', times: [] })).toMatch(/time/);
    expect(validateMedicine({ name: 'A', times: ['24:00'] })).toMatch(/not valid/);
    expect(validateMedicine({ name: 'A', times: ['08:00', '08:00'] })).toMatch(/twice/);
    expect(validateMedicine({ name: 'A', times: ['08:00', '20:00'] })).toBeNull();
  });

  it('parses and formats times', () => {
    expect(parseTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(formatTime(7, 5)).toBe('07:05');
  });
});
