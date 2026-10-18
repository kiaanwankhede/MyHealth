import { buildSnapshot, stepsLine, withSteps } from '../snapshot';

const now = new Date('2026-10-18T09:41:00Z');

describe('buildSnapshot', () => {
  it('summarises steps, retro goal and weight goal', () => {
    const s = buildSnapshot({
      steps: 12000,
      goal: 10000,
      retro: { state: 'extend', coveredDays: 1, nextDays: 2, stepsNeeded: 1000 },
      trendKg: 82.71,
      progress: {
        trendKg: 82.7,
        planKg: 82.5,
        lostKg: 3.3,
        toGoKg: 7.7,
        percent: 30,
        behindKg: 0.2,
        behindDays: 4,
        paceKgPerWeek: 0.3,
        projectedFinish: null,
        reached: false,
      },
      now,
    });
    expect(s).toEqual({
      steps: 12000,
      goal: 10000,
      percent: 100,
      retro: 'Today’s goal done! 1,000 more steps covers yesterday too.',
      trendKg: '82.7 kg',
      goalLine: '30% · 0.2 kg behind plan (4 days)',
      updatedAt: now.toISOString(),
    });
    expect(stepsLine(s)).toBe('of 10,000 · 100%');
  });

  it('leaves out the retro line before today’s goal and weight without data', () => {
    const s = buildSnapshot({
      steps: 7842,
      goal: 10000,
      retro: { state: 'today', stepsNeeded: 2158 },
      trendKg: null,
      progress: null,
      now,
    });
    expect(s.retro).toBeNull();
    expect(s.trendKg).toBeNull();
    expect(s.goalLine).toBeNull();
    expect(s.percent).toBe(78);
  });
});

describe('withSteps', () => {
  it('updates steps but keeps the saved weight lines', () => {
    const base = buildSnapshot({
      steps: 100,
      goal: 10000,
      retro: { state: 'today', stepsNeeded: 9900 },
      trendKg: 80,
      progress: null,
      now: new Date('2026-10-17T08:00:00Z'),
    });
    const s = withSteps(base, 5000, 10000, { state: 'today', stepsNeeded: 5000 }, now);
    expect(s.steps).toBe(5000);
    expect(s.percent).toBe(50);
    expect(s.trendKg).toBe('80.0 kg');
    expect(s.updatedAt).toBe(now.toISOString());
  });

  it('works without a saved snapshot', () => {
    expect(withSteps(null, 0, 10000, { state: 'today', stepsNeeded: 10000 }, now).trendKg).toBeNull();
  });
});
