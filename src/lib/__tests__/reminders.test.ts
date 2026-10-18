import type { Medicine } from '../medicines';
import { DEFAULT_REMINDERS, parseReminderSettings, planReminders } from '../reminders';

const now = new Date(2026, 9, 18, 10);
const statin: Medicine = {
  id: 7,
  name: 'Rosuvastatin',
  dose: '10 mg',
  times: ['21:00'],
  remind: true,
  startDate: new Date(2026, 6, 1),
  stoppedDate: null,
};

describe('planReminders', () => {
  it('plans nothing by default', () => {
    expect(
      planReminders({ settings: DEFAULT_REMINDERS, medicines: [], retests: [], stepGoal: 10_000, now }),
    ).toEqual([]);
  });

  it('plans daily weigh-in, walk and medicine reminders', () => {
    const plan = planReminders({
      settings: { weighIn: '07:30', steps: '19:00', labs: false },
      medicines: [
        statin,
        { ...statin, id: 8, remind: false },
        { ...statin, id: 9, stoppedDate: new Date(2026, 8, 1) },
      ],
      retests: [],
      stepGoal: 8000,
      now,
    });
    expect(plan.map((p) => [p.key, p.trigger])).toEqual([
      ['weigh-in', { kind: 'daily', hour: 7, minute: 30 }],
      ['steps', { kind: 'daily', hour: 19, minute: 0 }],
      ['medicine-7-21:00', { kind: 'daily', hour: 21, minute: 0 }],
    ]);
    expect(plan[1].body).toContain('8,000');
    expect(plan[2].body).toBe('Time for 10 mg.');
  });

  it('plans lab reminders only for future due dates', () => {
    const plan = planReminders({
      settings: { ...DEFAULT_REMINDERS, labs: true },
      medicines: [],
      retests: [
        { group: 'lipids', name: 'Cholesterol', last: new Date(2026, 0, 5), due: new Date(2027, 0, 5) },
        { group: 'sugar', name: 'Blood sugar', last: new Date(2026, 0, 5), due: new Date(2026, 6, 5) },
      ],
      stepGoal: 10_000,
      now,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      key: 'lab-lipids',
      title: 'Cholesterol test due',
      trigger: { kind: 'date', date: new Date(2027, 0, 5, 9) },
    });
  });
});

describe('parseReminderSettings', () => {
  it('reads stored settings and ignores junk', () => {
    expect(parseReminderSettings(null)).toEqual(DEFAULT_REMINDERS);
    expect(parseReminderSettings('{"weighIn":"07:30","steps":"bad","labs":true}')).toEqual({
      weighIn: '07:30',
      steps: null,
      labs: true,
    });
    expect(parseReminderSettings('{')).toEqual(DEFAULT_REMINDERS);
  });
});
