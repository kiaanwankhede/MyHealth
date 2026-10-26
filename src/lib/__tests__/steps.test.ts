import {
  describeRetro,
  distanceKm,
  retroGoal,
  stepStats,
  yearInsights,
  comparePeriods,
  dayByDay,
  yearChange,
  type DailySteps,
} from '../steps';

const GOAL = 10_000;

describe('retroGoal', () => {
  it('ignores the days before steps were first recorded', () => {
    expect(retroGoal([12000, 11000, 0, 0, 0], GOAL)).toEqual({ state: 'all', coveredDays: 2 });
  });

  it('asks for today first', () => {
    expect(retroGoal([7842, 20000], GOAL)).toEqual({ state: 'today', stepsNeeded: 2158 });
  });

  it('once today is met, asks for today + yesterday combined', () => {
    // 12,000 + 7,000 = 19,000 of 20,000
    expect(retroGoal([12000, 7000, 2000], GOAL)).toEqual({
      state: 'extend',
      coveredDays: 1,
      nextDays: 2,
      stepsNeeded: 1000,
    });
  });

  it('keeps adding days while the combined total holds', () => {
    // 2 days: 25,000 >= 20,000; 3 days: 30,000 >= 30,000; 4 days: 32,000 < 40,000
    expect(retroGoal([15000, 10000, 5000, 2000, 2000], GOAL)).toEqual({
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
  it('converts steps to distance', () => {
    expect(distanceKm(7842)).toBeCloseTo(5.98, 2);
  });
});

describe('yearInsights', () => {
  // Thu 1 Jan 2026 .. Sat 10 Jan 2026 (today), no data until 3 Jan.
  const steps = [0, 0, 12000, 11000, 4000, 10000, 10000, 10000, 3000, 10500];
  const days: DailySteps[] = steps.map((s, i) => ({ date: new Date(2026, 0, 1 + i), steps: s }));
  const y = yearInsights(days, GOAL)!;

  it('starts at the first day with data and leaves today out of averages', () => {
    expect(y.from.getDate()).toBe(3);
    expect(y.completedDays).toBe(7); // 3..9 Jan
    expect(y.total).toBe(70500);
    expect(y.average).toBe(8571); // 60,000 / 7
  });

  it('counts goal days, best day and streaks', () => {
    expect(y.goalDays).toBe(5);
    expect(y.goalRate).toBe(71);
    expect(y.best.steps).toBe(12000);
    expect(y.longestStreak).toEqual({ days: 3, end: new Date(2026, 0, 8) });
    // Yesterday (9 Jan) missed, today met: 1.
    expect(y.currentStreak).toBe(1);
  });

  it('averages by month and weekday', () => {
    expect(y.monthly).toEqual([{ month: 0, average: 8571 }]);
    // 3 Jan 2026 is a Saturday.
    expect(y.weekdays[6]).toBe(12000);
    expect(y.weekdays[5]).toBe(3000); // Fri 9 Jan
  });

  it('is null without any steps', () => {
    expect(yearInsights([{ date: new Date(2026, 0, 1), steps: 0 }], GOAL)).toBeNull();
  });
});

describe('comparePeriods', () => {
  const series = (values: number[]) =>
    values.map((steps, i) => ({ date: new Date(2026, 9, 1 + i), steps }));

  it('compares the last n full days with the n before, leaving out today', () => {
    // 7 days at 8,000, then 7 at 10,000, then today (partial).
    const days = series([...Array(7).fill(8000), ...Array(7).fill(10_000), 1200]);
    const { current, previous } = comparePeriods(days, 7, 9000);
    expect(current.average).toBe(10_000);
    expect(current.goalDays).toBe(7);
    expect(previous?.average).toBe(8000);
    expect(previous?.goalDays).toBe(0);
  });

  it('has no previous period without data for it', () => {
    const days = series([...Array(7).fill(0), ...Array(7).fill(10_000), 1200]);
    expect(comparePeriods(days, 7, 9000).previous).toBeNull();
    expect(comparePeriods(series([5000, 6000, 100]), 7, 9000).previous).toBeNull();
  });
});

describe('yearChange', () => {
  it('reports how the year’s numbers moved over the last week', () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 8, 1 + i),
      steps: i >= 23 ? 12_000 : 8000,
    }));
    const change = yearChange(days, 10_000)!;
    expect(change.total).toBe(7 * 12_000);
    expect(change.goalDays).toBe(6); // the last 7 days, minus today which is still going
    expect(change.average).toBeGreaterThan(0);
    expect(change.newBest).toBe(true);
    expect(change.longestStreak).toBe(7);
    expect(change.distanceKm).toBeCloseTo(distanceKm(7 * 12_000));
  });
});

describe('dayByDay', () => {
  const day = (i: number, steps: number): DailySteps => ({ date: new Date(2026, 9, 1 + i), steps });

  it('lists newest first and marks the covered window', () => {
    // oldest first: 3,000 / 14,000 / 8,000 / 12,000 (today). 12k + 8k + 14k = 34k ≥ 30k, + 3k = 37k < 40k.
    const out = dayByDay([day(0, 3000), day(1, 14000), day(2, 8000), day(3, 12000)], GOAL);
    expect(out.rows.map((r) => [r.steps, r.daysBack, r.covered])).toEqual([
      [12000, 1, true],
      [8000, 2, true],
      [14000, 3, true],
      [3000, 4, false],
    ]);
    expect(out.coveredDays).toBe(3);
    expect(out.coveredSteps).toBe(34000);
    expect(out.neededSteps).toBe(30000);
    expect(out.next).toMatchObject({ stepsNeeded: 3000, row: { steps: 3000, daysBack: 4 } });
  });

  it('covers nothing until today reaches the goal', () => {
    const out = dayByDay([day(0, 20000), day(1, 7000)], GOAL);
    expect(out.coveredDays).toBe(0);
    expect(out.rows.every((r) => !r.covered)).toBe(true);
    expect(out.next).toBeNull();
  });

  it('has no next day when everything is covered', () => {
    const out = dayByDay([day(0, 12000), day(1, 11000)], GOAL);
    expect(out.coveredDays).toBe(2);
    expect(out.next).toBeNull();
  });

  it('handles no data', () => {
    expect(dayByDay([], GOAL)).toEqual({
      rows: [],
      coveredDays: 0,
      coveredSteps: 0,
      startDate: null,
      average: null,
      neededSteps: 0,
      next: null,
    });
  });

  it('starts at the first day with steps and ignores the zeros before it', () => {
    // Nothing recorded before day 2; 3k, 12k, 14k (today). Padding zeros would otherwise be "covered".
    const out = dayByDay([day(0, 0), day(1, 0), day(2, 3000), day(3, 12000), day(4, 14000)], GOAL);
    expect(out.rows.map((r) => r.steps)).toEqual([14000, 12000, 3000]);
    expect(out.startDate).toEqual(day(2, 0).date);
    expect(out.coveredDays).toBe(2);
    expect(out.next).toMatchObject({ stepsNeeded: 1000 });
    // Average over completed days since the start: (12,000 + 3,000) / 2
    expect(out.average).toBe(7500);
  });

  it('keeps real zero days after tracking started', () => {
    const out = dayByDay([day(0, 9000), day(1, 0), day(2, 12000)], GOAL);
    expect(out.rows).toHaveLength(3);
    expect(out.average).toBe(4500);
  });
});
