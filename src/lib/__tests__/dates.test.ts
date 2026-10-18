import {
  addDays,
  calendarDaysBetween,
  formatDate,
  formatDayHeading,
  formatDayMonth,
  fromISODate,
  formatRelativeDay,
  greetingFor,
  startOfLocalDay,
  toISODate,
} from '../dates';

describe('startOfLocalDay', () => {
  it('returns local midnight of the same day', () => {
    const d = startOfLocalDay(new Date(2026, 9, 17, 15, 42, 10));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 9, 17, 0, 0,
    ]);
  });
});

describe('calendarDaysBetween', () => {
  it('counts calendar days, not 24h blocks', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 16, 23, 59), new Date(2026, 9, 17, 0, 1))).toBe(1);
    expect(calendarDaysBetween(new Date(2026, 9, 17, 1), new Date(2026, 9, 17, 23))).toBe(0);
  });

  it('matches the deck example: 1 Aug 2026 to 31 Mar 2027 is 242 days', () => {
    expect(calendarDaysBetween(new Date(2026, 7, 1), new Date(2027, 2, 31))).toBe(242);
  });

  it('round-trips with addDays across month ends', () => {
    const start = new Date(2026, 0, 30);
    expect(calendarDaysBetween(start, addDays(start, 45))).toBe(45);
  });
});

describe('formatting', () => {
  it('formats the Today heading', () => {
    expect(formatDayHeading(new Date(2026, 9, 17))).toBe('Sat, 17 Oct');
  });

  it('formats relative days', () => {
    const now = new Date(2026, 9, 17, 9);
    expect(formatRelativeDay(new Date(2026, 9, 17, 7), now)).toBe('Today');
    expect(formatRelativeDay(new Date(2026, 9, 16, 22), now)).toBe('Yesterday');
    expect(formatRelativeDay(new Date(2026, 8, 12), now)).toBe('12 Sep');
  });

  it('picks a greeting by hour', () => {
    expect(greetingFor(new Date(2026, 9, 17, 6))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 9, 17, 12))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 9, 17, 18))).toBe('Good evening');
  });
});

describe('ISO dates', () => {
  it('round-trips local calendar days', () => {
    const d = new Date(2027, 2, 31, 15, 30);
    expect(toISODate(d)).toBe('2027-03-31');
    expect(fromISODate('2027-03-31').getTime()).toBe(new Date(2027, 2, 31).getTime());
  });

  it('formats dates for display', () => {
    expect(formatDate(new Date(2027, 2, 31))).toBe('31 Mar 2027');
    expect(formatDayMonth(new Date(2027, 3, 15))).toBe('15 Apr');
  });
});
