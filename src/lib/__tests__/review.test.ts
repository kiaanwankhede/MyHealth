import { addDays } from '../dates';
import type { TrendPoint } from '../goal';
import { detectPlateau, trendOn, weeklyReview } from '../review';

const now = new Date(2026, 9, 18, 9);
const day = (ago: number) => addDays(new Date(2026, 9, 18), -ago);
const point = (ago: number, trend: number): TrendPoint => ({ date: day(ago), kg: trend, trend });

describe('trendOn', () => {
  it('takes the last trend point on or before the day', () => {
    const series = [point(10, 80), point(5, 79.5), point(0, 79)];
    expect(trendOn(series, day(7))).toBe(80);
    expect(trendOn(series, day(0))).toBe(79);
    expect(trendOn(series, day(20))).toBeNull();
  });
});

describe('weeklyReview', () => {
  it('reports trend change, steps over the last 7 complete days and labs due', () => {
    const series = [point(14, 81), point(7, 80.4), point(0, 80)];
    const steps = Array.from({ length: 9 }, (_, i) => ({
      date: day(8 - i),
      steps: i === 8 ? 100 : 8000 + i * 500,
    }));
    const review = weeklyReview({ series, steps, stepGoal: 10_000, reports: [], now });
    expect(review.trendChangeKg).toBeCloseTo(-0.4);
    // Days 1..7 ago are i = 1..7: 8500 … 11500; today (i = 8) is left out.
    expect(review.stepsAverage).toBe(10_000);
    expect(review.goalDays).toBe(4);
    expect(review.labsDue).toEqual([]);
  });

  it('has no trend change without a week of history', () => {
    const review = weeklyReview({ series: [point(2, 80)], steps: [], stepGoal: 7000, reports: [], now });
    expect(review.trendChangeKg).toBeNull();
    expect(review.stepsAverage).toBeNull();
  });
});

describe('detectPlateau', () => {
  const flat = Array.from({ length: 12 }, (_, i) => point(33 - i * 3, 80 + (i % 2) * 0.1));

  it('spots a trend that barely moved for three weeks', () => {
    expect(detectPlateau(flat, now)).toEqual({ days: 21, changeKg: expect.any(Number) });
  });

  it('ignores a trend that is still falling', () => {
    const falling = Array.from({ length: 12 }, (_, i) => point(33 - i * 3, 82 - i * 0.2));
    expect(detectPlateau(falling, now)).toBeNull();
  });

  it('needs recent and frequent enough weigh-ins', () => {
    expect(detectPlateau(flat.slice(0, 8), now)).toBeNull(); // last weigh-in 12 days ago
    expect(detectPlateau([point(30, 80), point(10, 80), point(0, 80)], now)).toBeNull();
  });
});
