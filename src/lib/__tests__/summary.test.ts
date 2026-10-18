import { DEFAULT_PROFILE } from '../profile';
import { escapeHtml, summaryHtml, trendSparkline, type SummaryData } from '../summary';

const now = new Date(2026, 9, 18, 10);
const day = (ago: number) => new Date(2026, 9, 18 - ago);

const data: SummaryData = {
  now,
  profile: { ...DEFAULT_PROFILE, heightCm: 172, sex: 'male', birthYear: 1980, heartRisk: 'high' },
  series: [
    { date: day(120), kg: 86, trend: 86 },
    { date: day(90), kg: 85, trend: 85.2 },
    { date: day(0), kg: 82.4, trend: 82.7 },
  ],
  waist: { id: 1, date: day(10), cm: 96 },
  steps: { average: 8240, days: 30 },
  sleep: { last: null, averageMinutes: 410, nights: 6 },
  heart: { latest: { time: day(0), bpm: 62 }, average: 64 },
  reports: [
    {
      id: 2,
      date: day(5),
      lab: 'Lal <PathLabs>',
      values: { total: 190, ldl: 96, hdl: 44, systolic: 132, diastolic: 84, creatinine: 1.0 },
    },
    { id: 1, date: day(200), lab: null, values: { ldl: 128, systolic: 140, diastolic: 90 } },
  ],
  medicines: [
    {
      id: 1,
      name: 'Rosu<vastatin>',
      dose: '10 mg',
      times: ['21:00'],
      remind: true,
      startDate: day(100),
      stoppedDate: null,
    },
  ],
};

describe('summaryHtml', () => {
  const html = summaryHtml(data);

  it('includes body, activity and the 90-day weight change', () => {
    expect(html).toContain('82.7 kg');
    expect(html).toContain('−2.5 kg in 90 days');
    expect(html).toContain('BMI (Asian cut-offs 23/25)');
    expect(html).toContain('8,240');
    expect(html).toContain('6 h 50 m');
    expect(html).toContain('64 bpm');
  });

  it('lists lab results with status, previous value and derived rows', () => {
    expect(html).toContain('Above your target of 70');
    expect(html).toContain('128 (');
    expect(html).toContain('132/84');
    expect(html).toContain('High-normal');
    expect(html).toContain('Non-HDL, calculated');
    expect(html).toContain('eGFR, CKD-EPI 2021');
    expect(html).toContain('LDL goal &lt; 70');
  });

  it('escapes text the user typed', () => {
    expect(html).toContain('Rosu&lt;vastatin&gt;');
    expect(html).not.toContain('<vastatin>');
    expect(escapeHtml(`a&b"'`)).toBe('a&amp;b&quot;&#39;');
  });

  it('draws a sparkline only with two or more points', () => {
    expect(trendSparkline(data.series)).toMatch(/^<svg/);
    expect(trendSparkline(data.series.slice(0, 1))).toBe('');
  });
});
