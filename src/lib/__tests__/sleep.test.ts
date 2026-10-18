import { formatDuration, nights, restingHeartSummary, sleepSummary, type SleepSession } from '../sleep';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);
const session = (start: Date, end: Date, stages: SleepSession['stages'] = []): SleepSession => ({
  start,
  end,
  stages,
});

describe('nights', () => {
  it('puts a night on the morning you woke up', () => {
    const [n] = nights([session(at(17, 23, 30), at(18, 6, 45))]);
    expect(n.date).toEqual(new Date(2026, 9, 18));
    expect(n.asleepMinutes).toBe(435);
    expect(n.bedtime).toEqual(at(17, 23, 30));
  });

  it('leaves out awake stages', () => {
    const [n] = nights([
      session(at(17, 23), at(18, 7), [
        { start: at(17, 23), end: at(18, 3), awake: false },
        { start: at(18, 3), end: at(18, 3, 30), awake: true },
        { start: at(18, 3, 30), end: at(18, 7), awake: false },
      ]),
    ]);
    expect(n.asleepMinutes).toBe(450);
  });

  it('counts the same night recorded by two apps once', () => {
    const [n] = nights([session(at(17, 23), at(18, 6)), session(at(17, 23, 15), at(18, 6, 30))]);
    expect(n.asleepMinutes).toBe(450);
  });

  it('adds a separate nap on the same day and sorts newest first', () => {
    const list = nights([
      session(at(16, 23), at(17, 6)),
      session(at(17, 23), at(18, 6)),
      session(at(18, 14), at(18, 14, 40)),
    ]);
    expect(list.map((n) => n.date.getDate())).toEqual([18, 17]);
    expect(list[0].asleepMinutes).toBe(420 + 40);
  });
});

describe('summaries', () => {
  const now = at(18, 9);

  it('averages the last 7 mornings and finds last night', () => {
    const list = nights([
      session(at(17, 23), at(18, 6)),
      session(at(15, 23), at(16, 7)),
      session(at(1, 23), at(2, 7)),
    ]);
    const s = sleepSummary(list, now);
    expect(s.last?.asleepMinutes).toBe(420);
    expect(s.nights).toBe(2);
    expect(s.averageMinutes).toBe(450);
  });

  it('has no "last night" when the latest is older than yesterday', () => {
    expect(sleepSummary(nights([session(at(14, 23), at(15, 7))]), now).last).toBeNull();
  });

  it('summarises resting heart rate', () => {
    const s = restingHeartSummary(
      [
        { time: at(18, 7), bpm: 62 },
        { time: at(16, 7), bpm: 66 },
        { time: at(5, 7), bpm: 80 },
      ],
      now,
    );
    expect(s.latest?.bpm).toBe(62);
    expect(s.average).toBe(64);
  });

  it('formats durations', () => {
    expect(formatDuration(425)).toBe('7 h 05 m');
  });
});
