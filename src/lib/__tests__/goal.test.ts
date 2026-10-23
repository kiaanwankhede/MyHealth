import { addDays, calendarDaysBetween } from '../dates';
import {
  dailyAverages,
  describeStatus,
  goalProgress,
  measuredPace,
  planGoal,
  planWeightOn,
  trendSeries,
  validateGoal,
  type DailyWeight,
  type Goal,
} from '../goal';

// The worked example from the product deck.
const deckGoal: Goal = {
  startDate: new Date(2026, 7, 1), // 1 Aug 2026
  startKg: 86,
  targetKg: 75,
  targetDate: new Date(2027, 2, 31), // 31 Mar 2027
};

describe('validateGoal', () => {
  it('accepts the deck example', () => {
    expect(validateGoal(deckGoal)).toBeNull();
  });

  it('rejects a target at or above the start weight', () => {
    expect(validateGoal({ ...deckGoal, targetKg: 86 })).toMatch(/below/);
  });

  it('rejects a target date less than a week away', () => {
    expect(validateGoal({ ...deckGoal, targetDate: addDays(deckGoal.startDate, 6) })).toMatch(/week/);
  });

  it('rejects implausible weights', () => {
    expect(validateGoal({ ...deckGoal, startKg: 0 })).toMatch(/start weight/);
    expect(validateGoal({ ...deckGoal, targetKg: Number.NaN })).toMatch(/target weight/);
  });
});

describe('planGoal', () => {
  const plan = planGoal(deckGoal);

  it('matches the deck numbers', () => {
    expect(plan.kgToLose).toBeCloseTo(11, 6);
    expect(plan.totalDays).toBe(242);
    expect(plan.weeks).toBeCloseTo(34.57, 2);
    expect(plan.kgPerWeek).toBeCloseTo(0.318, 3);
    expect(plan.maxSafeKgPerWeek).toBeCloseTo(0.86, 6);
    expect(plan.isSafe).toBe(true);
  });

  it('flags a goal faster than 1% of body weight a week and suggests a safe date', () => {
    const rushed = { ...deckGoal, targetDate: addDays(deckGoal.startDate, 56) }; // 11 kg in 8 weeks
    const p = planGoal(rushed);
    expect(p.isSafe).toBe(false);
    // 11 kg at 0.86 kg/week = 12.8 weeks = 90 days.
    expect(calendarDaysBetween(rushed.startDate, p.earliestSafeDate)).toBe(90);
    expect(planGoal({ ...rushed, targetDate: p.earliestSafeDate }).isSafe).toBe(true);
  });
});

describe('planWeightOn', () => {
  it('is a straight line from start to target', () => {
    expect(planWeightOn(deckGoal, deckGoal.startDate)).toBe(86);
    expect(planWeightOn(deckGoal, deckGoal.targetDate)).toBe(75);
    // Deck: day 77 of 242 (17 Oct) -> 82.5 kg.
    expect(planWeightOn(deckGoal, new Date(2026, 9, 17))).toBeCloseTo(82.5, 1);
  });

  it('clamps before the start and after the target date', () => {
    expect(planWeightOn(deckGoal, new Date(2026, 0, 1))).toBe(86);
    expect(planWeightOn(deckGoal, new Date(2028, 0, 1))).toBe(75);
  });
});

describe('dailyAverages', () => {
  it('averages readings per local day and sorts oldest first', () => {
    const out = dailyAverages([
      { kg: 82, time: new Date(2026, 9, 17, 21) },
      { kg: 83, time: new Date(2026, 9, 16, 7) },
      { kg: 81, time: new Date(2026, 9, 17, 7) },
    ]);
    expect(out.map((d) => [d.date.getDate(), d.kg])).toEqual([
      [16, 83],
      [17, 81.5],
    ]);
  });
});

describe('trendSeries', () => {
  it('starts at the first weigh-in and moves 10% toward each new one', () => {
    const s = trendSeries([
      { date: new Date(2026, 9, 1), kg: 80 },
      { date: new Date(2026, 9, 2), kg: 90 },
    ]);
    expect(s[0].trend).toBe(80);
    expect(s[1].trend).toBeCloseTo(81, 6);
  });

  it('treats a gap as that many days of smoothing', () => {
    const s = trendSeries([
      { date: new Date(2026, 9, 1), kg: 80 },
      { date: new Date(2026, 9, 4), kg: 90 }, // 3 days later
    ]);
    // 1 - 0.9^3 = 0.271
    expect(s[1].trend).toBeCloseTo(82.71, 2);
  });

  it('ignores day-to-day noise', () => {
    const noisy = Array.from({ length: 30 }, (_, i) => ({
      date: addDays(new Date(2026, 9, 1), i),
      kg: 80 + (i % 2 === 0 ? 1 : -1),
    }));
    const last = trendSeries(noisy).at(-1)!;
    expect(Math.abs(last.trend - 80)).toBeLessThan(0.7);
  });
});

/** Steady loss of `perWeek` kg/week from `startKg`, one weigh-in a day. */
function steadyLoss(start: Date, days: number, startKg: number, perWeek: number): DailyWeight[] {
  return Array.from({ length: days + 1 }, (_, i) => ({
    date: addDays(start, i),
    kg: startKg - (perWeek / 7) * i,
  }));
}

describe('measuredPace', () => {
  it('needs at least a week of data', () => {
    const s = trendSeries(steadyLoss(deckGoal.startDate, 5, 86, 0.5));
    expect(measuredPace(s, deckGoal.startDate)).toBeNull();
  });

  it('recovers a steady loss rate once the trend has caught up', () => {
    // Warm up for 60 days so the EMA lag is constant, then measure.
    const s = trendSeries(steadyLoss(deckGoal.startDate, 90, 86, 0.5));
    expect(measuredPace(s, deckGoal.startDate)).toBeCloseTo(0.5, 2);
  });

  it('ignores readings from before the goal started', () => {
    const before = steadyLoss(addDays(deckGoal.startDate, -30), 29, 90, -1); // gaining
    const s = trendSeries([...before, ...steadyLoss(deckGoal.startDate, 3, 86, 0.5)]);
    expect(measuredPace(s, deckGoal.startDate)).toBeNull();
  });
});

describe('goalProgress', () => {
  it('reports progress, plan gap and projected finish', () => {
    const today = new Date(2026, 9, 17); // day 77
    // Losing 0.30 kg/week from 86.0 since 1 Aug.
    const s = trendSeries(steadyLoss(deckGoal.startDate, 77, 86, 0.3));
    const p = goalProgress(deckGoal, s, today)!;

    expect(p.planKg).toBeCloseTo(82.5, 1);
    expect(p.lostKg).toBeCloseTo(86 - p.trendKg, 6);
    expect(p.toGoKg).toBeCloseTo(p.trendKg - 75, 6);
    expect(p.behindKg).toBeGreaterThan(0); // 0.30 < planned 0.32 kg/week
    expect(p.behindDays).toBeGreaterThan(0);
    expect(p.paceKgPerWeek).toBeCloseTo(0.3, 2);
    expect(p.reached).toBe(false);
    // Finishes after the 31 Mar target at this slower pace.
    expect(p.projectedFinish!.getTime()).toBeGreaterThan(deckGoal.targetDate.getTime());
    expect(p.percent).toBeGreaterThan(0);
    expect(p.percent).toBeLessThan(100);
  });

  it('marks the goal reached and caps progress at 100%', () => {
    const s = trendSeries([{ date: new Date(2026, 9, 17), kg: 74 }]);
    const p = goalProgress(deckGoal, s, new Date(2026, 9, 17))!;
    expect(p.reached).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.toGoKg).toBe(0);
  });

  it('has no projection when not losing weight', () => {
    const s = trendSeries(steadyLoss(deckGoal.startDate, 30, 86, -0.2));
    const p = goalProgress(deckGoal, s, addDays(deckGoal.startDate, 30))!;
    expect(p.projectedFinish).toBeNull();
    expect(p.percent).toBe(0);
  });

  it('returns null without any weigh-ins', () => {
    expect(goalProgress(deckGoal, [], new Date())).toBeNull();
  });
});

describe('describeStatus', () => {
  const base = {
    trendKg: 82.7,
    scaleKg: 82.6,
    planKg: 82.5,
    lostKg: 3.3,
    toGoKg: 7.7,
    percent: 30,
    behindKg: 0.2,
    behindDays: 4,
    paceKgPerWeek: 0.3,
    projectedFinish: null,
    reached: false,
    reachedOnScale: false,
  };

  it('says how far behind, in kg and days', () => {
    expect(describeStatus(base)).toEqual({ text: '0.2 kg behind plan (4 days)', tone: 'warn' });
  });

  it('says how far ahead', () => {
    expect(describeStatus({ ...base, behindKg: -0.4, behindDays: -9 })).toEqual({
      text: '0.4 kg ahead of plan (9 days)',
      tone: 'good',
    });
  });

  it('treats tiny gaps as on plan, and reports a reached goal', () => {
    expect(describeStatus({ ...base, behindKg: 0.02, behindDays: 0 }).text).toBe('Right on plan');
    expect(describeStatus({ ...base, reached: true }).text).toBe('Goal reached');
  });

  it('uses the singular for one day', () => {
    expect(describeStatus({ ...base, behindKg: 0.2, behindDays: 1 }).text).toBe(
      '0.2 kg behind plan (1 day)',
    );
  });

  it('treats gaps within the trend noise as on plan', () => {
    expect(describeStatus({ ...base, behindKg: 0.1, behindDays: 2 }).text).toBe('Right on plan');
  });

  it('celebrates a weigh-in at target even when the trend is still behind', () => {
    expect(describeStatus({ ...base, reachedOnScale: true })).toEqual({
      text: 'Latest weigh-in is at your target',
      tone: 'good',
    });
  });
});

describe('a fast small drop to the target', () => {
  // Weight stays at 89.2 for a month, then 89.1, 89.0, 88.9, 88.8 over four days; goal 19 -> 26 Oct, target 88.8.
  const goalDay = new Date(2026, 9, 19);
  const today = new Date(2026, 9, 22);
  const readings = [
    ...Array.from({ length: 30 }, (_, i) => ({ kg: 89.2, time: addDays(goalDay, i - 30) })),
    { kg: 89.1, time: goalDay },
    { kg: 89.0, time: addDays(goalDay, 1) },
    { kg: 88.9, time: addDays(goalDay, 2) },
    { kg: 88.8, time: today },
  ];
  const series = trendSeries(dailyAverages(readings));

  it.each([89.0, 89.1])('is not "behind" with a goal started at %s kg', (startKg) => {
    const goal: Goal = { startDate: goalDay, startKg, targetKg: 88.8, targetDate: addDays(goalDay, 7) };
    const status = describeStatus(goalProgress(goal, series, today)!);
    expect(status.tone).toBe('good');
    expect(status.text).not.toMatch(/behind/);
  });
});

describe('starting a goal from the trend', () => {
  // A month at 89.2, then 89.1, then a single lower weigh-in of 89.0 on the second day of the goal.
  const goalDay = new Date(2026, 9, 19);
  const today = new Date(2026, 9, 20);
  const readings = [
    ...Array.from({ length: 30 }, (_, i) => ({ kg: 89.2, time: addDays(goalDay, i - 30) })),
    { kg: 89.1, time: goalDay },
    { kg: 89.0, time: today },
  ];
  const series = trendSeries(dailyAverages(readings));
  const trendToday = series[series.length - 1].trend;
  const week = (startKg: number): Goal => ({
    startDate: goalDay,
    startKg,
    targetKg: 88.8,
    targetDate: addDays(goalDay, 7),
  });

  it('shows you behind plan on day one when the goal starts from a single low weigh-in', () => {
    const progress = goalProgress(week(89.0), series, today)!;
    expect(progress.behindKg).toBeGreaterThan(0.1);
    expect(progress.behindDays).toBeGreaterThanOrEqual(3);
  });

  it('is on plan on day one when the goal starts from the trend', () => {
    const progress = goalProgress(week(Math.round(trendToday * 10) / 10), series, today)!;
    expect(describeStatus(progress).text).toBe('Right on plan');
  });
});
