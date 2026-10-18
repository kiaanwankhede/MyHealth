import {
  describeRetro,
  distanceKm,
  kcalFromSteps,
  retroGoal,
  stepStats,
  type DailySteps,
} from '../steps';

const GOAL = 10_000;

describe('retroGoal', () => {
  it('asks for today first', () => {
    expect(retroGoal([7842, 20000], GOAL)).toEqual({ state: 'today', stepsNeeded: 2158 });
  });

  it('once today is met, asks for today + yesterday combined', () => {
    // 12,000 + 7,000 = 19,000 of 20,000
    expect(retroGoal([12000, 7000, 15000], GOAL)).toEqual({
      state: 'extend',
      coveredDays: 1,
      nextDays: 2,
      stepsNeeded: 1000,
    });
  });

  it('keeps adding days while the combined total holds', () => {
    // 2 days: 25,000 >= 20,000; 3 days: 30,000 >= 30,000; 4 days: 32,000 < 40,000
    expect(retroGoal([15000, 10000, 5000, 2000, 50000], GOAL)).toEqual({
      state: 'extend',
      coveredDays: 3,
      nextDays: 4,
      stepsNeeded: 8000,
    });
  });

  it('stops at the first window that falls short, even if a longer one would pass', () => {
    // 2 days fails (11,000 + 0 < 20,000) although 3 days (41,000) would pass.
    expect(retroGoal([11000, 0, 30000], GOAL)).toMatchObject({ state: 'extend', coveredDays: 1 });
  });

  it('reports when every day with data is covered', () => {
    expect(retroGoal([10000, 10000, 10000], GOAL)).toEqual({ state: 'all', coveredDays: 3 });
  });

  it('handles no data', () => {
    expect(retroGoal([], GOAL)).toEqual({ state: 'today', stepsNeeded: GOAL });
  });
});

describe('describeRetro', () => {
  it('words each state', () => {
    expect(describeRetro({ state: 'today', stepsNeeded: 2158 })).toBe('2,158 steps to go for today’s goal.');
    expect(describeRetro({ state: 'extend', coveredDays: 1, nextDays: 2, stepsNeeded: 1000 })).toBe(
      'Today’s goal done! 1,000 more steps covers yesterday too.',
    );
    expect(describeRetro({ state: 'extend', coveredDays: 3, nextDays: 4, stepsNeeded: 8000 })).toBe(
      'Last 3 days covered. 8,000 more steps covers 4 days.',
    );
    expect(describeRetro({ state: 'all', coveredDays: 30 })).toBe('All of the last 30 days covered.');
  });
});

describe('stepStats', () => {
  const week: DailySteps[] = [9120, 11430, 6210, 10850, 5300, 10240, 7842].map((steps, i) => ({
    date: new Date(2026, 9, 11 + i),
    steps,
  }));

  it('matches the deck week', () => {
    const s = stepStats(week, GOAL);
    expect(s.average).toBe(8713);
    expect(s.goalDays).toBe(3);
    expect(s.best?.steps).toBe(11430);
    expect(s.total).toBe(60992);
  });

  it('handles an empty range', () => {
    expect(stepStats([], GOAL)).toEqual({ average: 0, goalDays: 0, best: null, total: 0 });
  });
});

describe('estimates', () => {
  it('converts steps to distance and calories', () => {
    expect(distanceKm(7842)).toBeCloseTo(5.98, 2);
    expect(Math.round(kcalFromSteps(7842))).toBe(314);
    expect(Math.round(kcalFromSteps(7842, 84))).toBe(376);
  });
});
