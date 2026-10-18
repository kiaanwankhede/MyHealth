// Reads lab values out of text recognised from a report (PDF page or photo). Pure functions only.
//
// OCR gives lines with positions. Tables come back as separate columns, so lines are first
// put back into rows by their vertical position, then each row is matched against the test
// names Indian labs use (Thyrocare, Dr Lal PathLabs, SRL/Agilus, Metropolis, Healthians…).
// Everything found is shown to the user to check before it is saved.

import type { LabValues, TestKey } from './labs';

export type TextLine = { text: string; left: number; top: number; right: number; bottom: number };

/** A row of a page: its cells left to right. */
export type Row = string[];

/** Puts OCR lines back into table rows: lines whose vertical middles fall within a row join it. */
export function toRows(lines: readonly TextLine[]): Row[] {
  const sorted = [...lines]
    .filter((l) => l.text.trim() !== '')
    .sort((a, b) => (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
  const rows: { top: number; bottom: number; cells: TextLine[] }[] = [];
  for (const line of sorted) {
    const mid = (line.top + line.bottom) / 2;
    const row = rows[rows.length - 1];
    if (row && mid >= row.top && mid <= row.bottom) {
      row.cells.push(line);
    } else {
      rows.push({ top: line.top, bottom: line.bottom, cells: [line] });
    }
  }
  return rows.map((r) => r.cells.sort((a, b) => a.left - b.left).map((c) => c.text.trim()));
}

type Matcher = { key: TestKey; match: RegExp; not?: RegExp };

/** "TC/HDL", "Chol / HDL", "LDL/HDL": ratios, not results. (A bare "/" also appears in units like mg/dL.) */
const RATIO = /ratio|\b(tc|chol\w*|ldl|hdl|tg)\s*\/\s*(hdl|ldl)\b/i;

// Order matters: more specific tests first (e.g. HDL before total cholesterol).
const MATCHERS: Matcher[] = [
  { key: 'hdl', match: /\bhdl\b/i, not: new RegExp(`${RATIO.source}|non[\\s-]*hdl|vldl`, 'i') },
  { key: 'ldl', match: /\bldl\b/i, not: new RegExp(`${RATIO.source}|vldl|non[\\s-]*hdl`, 'i') },
  { key: 'triglycerides', match: /triglycerides?/i, not: RATIO },
  { key: 'lpa', match: /lipoprotein\s*\(?\s*a\s*\)|\blp\s*\(\s*a\s*\)|\blpa\b/i },
  { key: 'total', match: /cholesterol/i, not: new RegExp(`${RATIO.source}|hdl|ldl|vldl|non`, 'i') },
  {
    key: 'hba1c',
    match: /hb\s*a\s*1\s*c|glyc(at|osyl)ated\s+ha?emoglobin|\ba1c\b/i,
    not: /average|eag|mean/i,
  },
  {
    key: 'glucose',
    match: /(fasting|\bfbs\b|\bfpg\b).*(glucose|sugar)|(glucose|sugar).*fasting|\bfbs\b|\bfpg\b/i,
    not: /post|prandial|\bpp\b|random|average|urine/i,
  },
  { key: 'tsh', match: /\btsh\b|thyroid\s+stimulating/i },
  { key: 'vitd', match: /vitamin\s*-?\s*d\b|25[\s-]*(oh|hydroxy)|\bvit\.?\s*d\b/i, not: /1[,\s]*25/i },
  { key: 'b12', match: /vitamin\s*-?\s*b\s*-?\s*12|\bb\s*-?\s*12\b|cobalamin/i },
  { key: 'creatinine', match: /creatinine/i, not: /clearance|ratio|urine|urinary|egfr/i },
];

/** A plain result number, optionally flagged high/low ("128", "5.8 H", "*142"). Not a range or limit. */
const VALUE = /^[*]?\s*(\d{1,5}(?:[.,]\d{1,3})?)\s*(?:[HL]|high|low)?\s*$/i;
/** The number at the start of a cell like "128 mg/dL" or "5.8 %". */
const LEADING_VALUE =
  /^[*]?\s*(\d{1,5}(?:[.,]\d{1,3})?)\s*(?:[HL]\b)?\s*(mg\/dl|mmol\/l|nmol\/l|ng\/ml|pg\/ml|pmol\/l|µ?u?iu\/ml|miu\/l|%|umol\/l|µmol\/l)/i;

const num = (s: string) => Number(s.replace(',', '.'));

/** The result in a row: the first plain number after the test name, skipping ranges like "0-100" or "<200". */
function findValue(cells: Row, nameIndex: number, nameRest: string): { value: number; unit: string } | null {
  const unitOf = (text: string) =>
    text.match(/mg\/dl|mmol\/l|nmol\/l|ng\/ml|pg\/ml|pmol\/l|µ?u?iu\/ml|miu\/l|%|[uµ]mol\/l/i)?.[0] ?? '';
  const rowText = cells.join(' ');
  const candidates = [nameRest, ...cells.slice(nameIndex + 1)];
  for (const cell of candidates) {
    const text = cell.trim();
    if (text === '') continue;
    const plain = text.match(VALUE);
    if (plain) return { value: num(plain[1]), unit: unitOf(rowText) };
    const leading = text.match(LEADING_VALUE);
    if (leading) return { value: num(leading[1]), unit: leading[2] };
  }
  return null;
}

export type Found = { key: TestKey; value: number; source: string; note: string | null };

/** Converts other units to the ones Sehat uses; returns null when a unit can't be converted. */
function normalise(key: TestKey, value: number, unit: string): { value: number; note: string | null } | null {
  const u = unit.toLowerCase();
  const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
  if (u.includes('mmol/l') && ['total', 'ldl', 'hdl'].includes(key)) {
    return { value: round(value * 38.67), note: `converted from ${value} mmol/L` };
  }
  if (u.includes('mmol/l') && key === 'triglycerides')
    return { value: round(value * 88.57), note: `converted from ${value} mmol/L` };
  if (u.includes('mmol/l') && key === 'glucose')
    return { value: round(value * 18), note: `converted from ${value} mmol/L` };
  if (key === 'lpa' && u.includes('nmol/l'))
    return { value: round(value / 2.4), note: `≈ converted from ${value} nmol/L` };
  if (key === 'vitd' && u.includes('nmol/l'))
    return { value: round(value / 2.496), note: `converted from ${value} nmol/L` };
  if (key === 'b12' && u.includes('pmol/l'))
    return { value: round(value * 1.355), note: `converted from ${value} pmol/L` };
  if (key === 'creatinine' && /[uµ]mol\/l/.test(u))
    return { value: round(value / 88.4, 2), note: `converted from ${value} µmol/L` };
  // HbA1c sometimes comes in IFCC mmol/mol (e.g. 40); the % row is preferred, this is a fallback.
  if (key === 'hba1c' && (u.includes('mmol/mol') || value > 20)) {
    return value > 20
      ? { value: round(value / 10.929 + 2.15, 1), note: `converted from ${value} mmol/mol` }
      : null;
  }
  return { value, note: null };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Day-first dates as Indian labs print them: 14/10/2026, 14-10-2026, 14-Oct-2026, 14 Oct 2026. */
function parseDates(text: string): Date[] {
  const dates: Date[] = [];
  const make = (d: number, m: number, y: number) => {
    const year = y < 100 ? 2000 + y : y;
    const date = new Date(year, m, d);
    if (date.getMonth() === m && date.getDate() === d && year >= 1990 && year <= 2100) dates.push(date);
  };
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) make(+m[1], +m[2] - 1, +m[3]);
  for (const m of text.matchAll(/\b(\d{1,2})[\s/-]*([a-z]{3})[a-z]*[\s/,-]*(\d{4})\b/gi)) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month >= 0) make(+m[1], month, +m[3]);
  }
  return dates;
}

/** The sample collection date if labelled, else the earliest date on the report that isn't in the future. */
export function findReportDate(rows: readonly Row[], now: Date): Date | null {
  const valid = (d: Date) => d <= now;
  for (const row of rows) {
    const text = row.join(' ');
    if (/collect|sample|drawn|registered/i.test(text)) {
      const d = parseDates(text).filter(valid)[0];
      if (d) return d;
    }
  }
  const all = rows.flatMap((r) => parseDates(r.join(' '))).filter(valid);
  // Birth dates are much older than a report; take the latest of the dates within two years.
  const recent = all.filter((d) => now.getTime() - d.getTime() < 2 * 365 * 86_400_000);
  return recent.length ? recent.reduce((a, b) => (a > b ? a : b)) : null;
}

const LABS: [RegExp, string][] = [
  [/thyrocare/i, 'Thyrocare'],
  [/lal\s*path\s*labs|dr\.?\s*lal/i, 'Dr Lal PathLabs'],
  [/agilus/i, 'Agilus (SRL)'],
  [/\bsrl\b/i, 'SRL'],
  [/metropolis/i, 'Metropolis'],
  [/healthians/i, 'Healthians'],
  [/apollo/i, 'Apollo'],
  [/redcliffe/i, 'Redcliffe'],
  [/orange\s*health/i, 'Orange Health'],
  [/neuberg/i, 'Neuberg'],
  [/vijaya/i, 'Vijaya Diagnostic'],
  [/tata\s*1\s*mg|1mg\s*labs/i, 'Tata 1mg'],
  [/pharmeasy/i, 'PharmEasy'],
];

export type ImportResult = {
  values: LabValues;
  found: Found[];
  date: Date | null;
  lab: string | null;
};

/** Reads test values, the date and the lab from the rows of every page. The first value found for a test wins. */
export function readReport(pages: readonly (readonly TextLine[])[], now: Date): ImportResult {
  const rows = pages.flatMap((lines) => toRows(lines));
  const found: Found[] = [];
  const values: LabValues = {};

  for (const cells of rows) {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const matcher = MATCHERS.find((m) => m.match.test(cell) && !(m.not && m.not.test(cell)));
      if (!matcher || values[matcher.key] !== undefined) continue;
      const rest = cell.replace(matcher.match, ' ').replace(/^[^\d*]*/, '');
      const raw = findValue(cells, i, rest);
      if (!raw) continue;
      const normal = normalise(matcher.key, raw.value, raw.unit);
      if (!normal) continue;
      values[matcher.key] = normal.value;
      found.push({ key: matcher.key, value: normal.value, source: cells.join('  '), note: normal.note });
      break;
    }
    // Blood pressure, if the report has it: "120/80 mmHg".
    const bp = cells.join(' ').match(/blood\s*pressure.*?\b(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
    if (bp && values.systolic === undefined) {
      values.systolic = +bp[1];
      values.diastolic = +bp[2];
      found.push({ key: 'systolic', value: +bp[1], source: cells.join('  '), note: null });
    }
  }

  const allText = rows.map((r) => r.join(' ')).join('\n');
  return {
    values,
    found,
    date: findReportDate(rows, now),
    lab: LABS.find(([re]) => re.test(allText))?.[1] ?? null,
  };
}

/** What the import screen hands to the lab report form, as a route parameter (JSON). */
export type Prefill = { date: string | null; lab: string | null; values: LabValues; notes: string[] };
