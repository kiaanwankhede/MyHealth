// One-page doctor summary as HTML, printed to PDF on the phone. Pure functions only.

import {
  bmi,
  classifyBmi,
  classifyWaist,
  classifyWaistToHeight,
  waistToHeight,
  type WaistEntry,
} from './body';
import { calendarDaysBetween, formatDate } from './dates';
import { formatCount, formatKg } from './format';
import type { TrendPoint } from './goal';
import {
  classify,
  classifyBp,
  classifyEgfr,
  classifyNonHdl,
  egfr,
  formatLabValue,
  GROUPS,
  history,
  nonHdl,
  testsIn,
  type Classification,
  type LabContext,
  type LabReport,
} from './labs';
import { isActive, type Medicine } from './medicines';
import { ageOn, HEART_RISK_LABELS, ldlTarget, type Profile } from './profile';
import { trendOn } from './review';
import { formatDuration, type HeartSummary, type SleepSummary } from './sleep';

export type SummaryData = {
  now: Date;
  profile: Profile;
  /** Weight trend, oldest first. */
  series: readonly TrendPoint[];
  waist: WaistEntry | null;
  steps: { average: number | null; days: number };
  sleep: SleepSummary | null;
  heart: HeartSummary | null;
  reports: readonly LabReport[];
  medicines: readonly Medicine[];
};

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

const status = (c: Classification | null) =>
  c ? `<span class="${c.tone}">${escapeHtml(c.label)}</span>` : '';

/** Small line chart of the weight trend (no axes; first and last value labelled). */
export function trendSparkline(series: readonly TrendPoint[], width = 520, height = 90): string {
  if (series.length < 2) return '';
  const values = series.map((p) => p.trend);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.5);
  const t0 = series[0].date.getTime();
  const t1 = series[series.length - 1].date.getTime();
  const x = (p: TrendPoint) => 4 + ((p.date.getTime() - t0) / Math.max(t1 - t0, 1)) * (width - 8);
  const y = (v: number) => 6 + (1 - (v - min) / span) * (height - 12);
  const points = series.map((p) => `${x(p).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  return (
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">` +
    `<polyline points="${points}" fill="none" stroke="#0B7262" stroke-width="2.5" stroke-linejoin="round"/></svg>`
  );
}

type Row = { name: string; value: string; date: Date; status: string; previous: string };

function labRows(reports: readonly LabReport[], ctx: LabContext): Row[] {
  const rows: Row[] = [];
  const prev = (r: { value: string; date: Date } | undefined) =>
    r ? `${r.value} (${formatDate(r.date)})` : '';
  for (const g of GROUPS) {
    if (g.key === 'bp') {
      const bp = reports.filter((r) => r.values.systolic !== undefined && r.values.diastolic !== undefined);
      if (bp[0]) {
        const v = (r: LabReport) => `${r.values.systolic}/${r.values.diastolic}`;
        rows.push({
          name: 'Blood pressure (mmHg)',
          value: v(bp[0]),
          date: bp[0].date,
          status: status(classifyBp(bp[0].values.systolic!, bp[0].values.diastolic!)),
          previous: prev(bp[1] && { value: v(bp[1]), date: bp[1].date }),
        });
      }
      continue;
    }
    for (const t of testsIn(g.key)) {
      const [latest, before] = history(reports, t.key);
      if (!latest) continue;
      const judgedByEgfr = t.key === 'creatinine' && ctx.age !== null && ctx.sex !== null;
      rows.push({
        name: `${t.name} (${t.unit})`,
        value: formatLabValue(t.key, latest.value),
        date: latest.date,
        status: judgedByEgfr ? '' : status(classify(t.key, latest.value, ctx)),
        previous: prev(before && { value: formatLabValue(t.key, before.value), date: before.date }),
      });
      if (t.key === 'hdl') {
        const withBoth = reports.find((r) => nonHdl(r.values) !== null);
        if (withBoth) {
          const value = nonHdl(withBoth.values)!;
          rows.push({
            name: 'Non-HDL, calculated (mg/dL)',
            value: formatCount(value),
            date: withBoth.date,
            status: status(classifyNonHdl(value, ctx)),
            previous: '',
          });
        }
      }
      if (judgedByEgfr) {
        const value = egfr(latest.value, ctx.age!, ctx.sex!);
        rows.push({
          name: 'eGFR, CKD-EPI 2021 (mL/min/1.73m²)',
          value: formatCount(value),
          date: latest.date,
          status: status(classifyEgfr(value)),
          previous: '',
        });
      }
    }
  }
  return rows;
}

export function summaryHtml(d: SummaryData): string {
  const { profile, now } = d;
  const age = ageOn(profile, now);
  const ctx: LabContext = { heartRisk: profile.heartRisk, sex: profile.sex, age };
  const latest = d.series.length ? d.series[d.series.length - 1] : null;
  const start90 = latest ? trendOn(d.series, new Date(now.getTime() - 90 * 86_400_000)) : null;
  const target = ldlTarget(profile.heartRisk);

  const about = [
    age !== null ? `${age} years` : null,
    profile.sex ? (profile.sex === 'male' ? 'Male' : 'Female') : null,
    profile.heightCm ? `${profile.heightCm} cm` : null,
    target !== null
      ? `Heart risk: ${HEART_RISK_LABELS[profile.heartRisk].toLowerCase()} (LDL goal < ${target})`
      : null,
  ].filter(Boolean);

  const body: string[] = [];
  if (latest) {
    const days = calendarDaysBetween(latest.date, now);
    body.push(
      `<tr><td>Weight (smoothed trend)</td><td><b>${formatKg(latest.trend)} kg</b></td><td>${
        start90 !== null
          ? `${latest.trend - start90 <= 0 ? '−' : '+'}${formatKg(Math.abs(latest.trend - start90))} kg in 90 days`
          : ''
      }</td><td>${days === 0 ? 'today' : formatDate(latest.date)}</td></tr>`,
    );
    if (profile.heightCm) {
      const value = bmi(latest.trend, profile.heightCm);
      body.push(
        `<tr><td>BMI (Asian cut-offs 23/25)</td><td><b>${value.toFixed(1)}</b></td><td>${status(classifyBmi(value))}</td><td></td></tr>`,
      );
    }
  }
  if (d.waist) {
    body.push(
      `<tr><td>Waist</td><td><b>${formatKg(d.waist.cm)} cm</b></td><td>${status(classifyWaist(d.waist.cm, profile.sex))}</td><td>${formatDate(d.waist.date)}</td></tr>`,
    );
    if (profile.heightCm) {
      const ratio = waistToHeight(d.waist.cm, profile.heightCm);
      body.push(
        `<tr><td>Waist ÷ height</td><td><b>${ratio.toFixed(2)}</b></td><td>${status(classifyWaistToHeight(ratio))}</td><td></td></tr>`,
      );
    }
  }

  const activity: string[] = [];
  if (d.steps.average !== null) {
    activity.push(
      `<tr><td>Steps per day</td><td><b>${formatCount(d.steps.average)}</b></td><td>average of the last ${d.steps.days} days</td></tr>`,
    );
  }
  if (d.sleep?.averageMinutes != null) {
    activity.push(
      `<tr><td>Sleep</td><td><b>${formatDuration(d.sleep.averageMinutes)}</b></td><td>average of ${d.sleep.nights} nights</td></tr>`,
    );
  }
  if (d.heart?.average != null) {
    activity.push(
      `<tr><td>Resting heart rate</td><td><b>${d.heart.average} bpm</b></td><td>7-day average</td></tr>`,
    );
  }

  const labs = labRows(d.reports, ctx);
  const meds = [...d.medicines].sort((a, b) => Number(!isActive(a, now)) - Number(!isActive(b, now)));

  const section = (title: string, html: string) => (html ? `<h2>${title}</h2>${html}` : '');
  const table = (rows: string[], head?: string) =>
    rows.length ? `<table>${head ?? ''}${rows.join('')}</table>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: sans-serif; color: #14231F; font-size: 11pt; margin: 28px; }
    h1 { font-size: 18pt; margin: 0; } h2 { font-size: 12.5pt; margin: 18px 0 6px; color: #0B5A4E; }
    .sub { color: #4A5A55; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { text-align: left; padding: 4px 6px; border-bottom: 1px solid #DDE5DC; vertical-align: top; }
    th { font-size: 9.5pt; color: #4A5A55; font-weight: normal; }
    .good, .ok { color: #0B5A4E; } .warn { color: #8A3A0E; } .bad { color: #A3241B; font-weight: bold; }
    .foot { margin-top: 18px; font-size: 8.5pt; color: #4A5A55; }
  </style></head><body>
  <h1>Health summary</h1>
  <div class="sub">${about.map((a) => escapeHtml(a!)).join(' · ')}${about.length ? ' · ' : ''}Prepared ${formatDate(now)}</div>
  ${section('Body', table(body) + trendSparkline(d.series))}
  ${section('Activity and sleep', table(activity))}
  ${section(
    'Lab results',
    table(
      labs.map(
        (r) =>
          `<tr><td>${r.name}</td><td><b>${r.value}</b></td><td>${formatDate(r.date)}</td><td>${r.status}</td><td>${r.previous}</td></tr>`,
      ),
      '<tr><th>Test</th><th>Latest</th><th>Date</th><th>Status</th><th>Previous</th></tr>',
    ),
  )}
  ${section(
    'Medicines',
    table(
      meds.map(
        (m) =>
          `<tr><td><b>${escapeHtml(m.name)}</b></td><td>${escapeHtml(m.dose ?? '')}</td><td>${m.times.join(', ')}</td><td>${
            m.stoppedDate
              ? `${formatDate(m.startDate)} – ${formatDate(m.stoppedDate)} (stopped)`
              : `since ${formatDate(m.startDate)}`
          }</td></tr>`,
      ),
    ),
  )}
  <div class="foot">Lab values typed in by the patient from their reports. Status uses common adult reference ranges
  (lipids: NCEP ATP III, or the LAI goal when a heart-risk level is set; blood pressure: ISH 2020; BMI and waist:
  Asian Indian cut-offs). Steps, sleep and heart rate from Health Connect. Made with Sehat; not a diagnosis.</div>
  </body></html>`;
}
