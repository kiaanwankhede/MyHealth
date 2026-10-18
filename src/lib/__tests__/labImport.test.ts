import { findReportDate, readReport, toRows, type TextLine } from '../labImport';

const now = new Date(2026, 9, 18, 10);

/** Builds OCR lines for a table: each row is [x, text] cells at the same height. Columns are separate lines, as ML Kit returns them. */
function page(rows: [number, string][][], jitter = 0): TextLine[] {
  return rows.flatMap((cells, r) =>
    cells.map(([x, text], c) => {
      const top = 100 + r * 40 + (c % 2) * jitter;
      return { text, left: x, top, right: x + text.length * 9, bottom: top + 24 };
    }),
  );
}

describe('toRows', () => {
  it('puts column lines back into rows even when slightly misaligned', () => {
    const rows = toRows(
      page(
        [
          [
            [40, 'LDL CHOLESTEROL'],
            [420, '128'],
            [520, 'mg/dL'],
          ],
          [
            [40, 'HDL'],
            [420, '44'],
          ],
        ],
        6,
      ),
    );
    expect(rows).toEqual([
      ['LDL CHOLESTEROL', '128', 'mg/dL'],
      ['HDL', '44'],
    ]);
  });
});

describe('readReport', () => {
  it('reads a Thyrocare-style lipid profile', () => {
    const result = readReport(
      [
        page([
          [[40, 'THYROCARE TECHNOLOGIES LTD.']],
          [[40, 'Sample Collected on (SCT) : 14 Oct 2026 07:42']],
          [
            [40, 'TEST NAME'],
            [300, 'TECHNOLOGY'],
            [460, 'VALUE'],
            [560, 'UNITS'],
            [660, 'Bio. Ref. Interval'],
          ],
          [
            [40, 'TOTAL CHOLESTEROL'],
            [300, 'PHOTOMETRY'],
            [460, '196'],
            [560, 'mg/dL'],
            [660, '< 200'],
          ],
          [
            [40, 'HDL CHOLESTEROL - DIRECT'],
            [300, 'PHOTOMETRY'],
            [460, '44'],
            [560, 'mg/dL'],
            [660, '40-60'],
          ],
          [
            [40, 'LDL CHOLESTEROL - DIRECT'],
            [300, 'PHOTOMETRY'],
            [460, '128 H'],
            [560, 'mg/dL'],
            [660, '< 100'],
          ],
          [
            [40, 'TRIGLYCERIDES'],
            [300, 'PHOTOMETRY'],
            [460, '142'],
            [560, 'mg/dL'],
            [660, '< 150'],
          ],
          [
            [40, 'TC/ HDL CHOLESTEROL RATIO'],
            [300, 'CALCULATED'],
            [460, '4.5'],
            [660, '3-5'],
          ],
          [
            [40, 'LDL / HDL RATIO'],
            [300, 'CALCULATED'],
            [460, '2.9'],
            [660, '1.5-3.5'],
          ],
          [
            [40, 'NON-HDL CHOLESTEROL'],
            [300, 'CALCULATED'],
            [460, '152'],
            [560, 'mg/dL'],
            [660, '< 160'],
          ],
          [
            [40, 'VLDL CHOLESTEROL'],
            [300, 'CALCULATED'],
            [460, '28.4'],
            [560, 'mg/dL'],
            [660, '5 - 40'],
          ],
        ]),
      ],
      now,
    );
    expect(result.values).toEqual({ total: 196, hdl: 44, ldl: 128, triglycerides: 142 });
    expect(result.date).toEqual(new Date(2026, 9, 14));
    expect(result.lab).toBe('Thyrocare');
  });

  it('reads sugar, thyroid, vitamins and kidney from a Lal PathLabs-style report', () => {
    const result = readReport(
      [
        page([
          [
            [40, 'Dr Lal PathLabs'],
            [500, 'Collected : 02/09/2026 08:15'],
          ],
          [[40, 'Reported : 03/09/2026 14:20']],
          [
            [40, 'HbA1c (Glycated Haemoglobin)'],
            [420, '6.1'],
            [500, '%'],
            [600, '4.0 - 5.6'],
          ],
          [
            [40, 'Estimated average glucose (eAG)'],
            [420, '128'],
            [500, 'mg/dL'],
          ],
          [
            [40, 'Glucose Fasting (F), Plasma'],
            [420, '108'],
            [500, 'mg/dL'],
            [600, '70 - 100'],
          ],
          [
            [40, 'Glucose PP'],
            [420, '162'],
            [500, 'mg/dL'],
          ],
          [
            [40, 'TSH, Ultrasensitive'],
            [420, '3.21'],
            [500, 'µIU/mL'],
            [600, '0.27 - 4.20'],
          ],
          [
            [40, 'Vitamin D, 25 - Hydroxy'],
            [420, '18.4'],
            [500, 'ng/mL'],
            [600, '30 - 100'],
          ],
          [
            [40, 'Vitamin B12; Cyanocobalamin'],
            [420, '245'],
            [500, 'pg/mL'],
            [600, '211 - 911'],
          ],
          [
            [40, 'Creatinine'],
            [420, '0.94'],
            [500, 'mg/dL'],
            [600, '0.70 - 1.30'],
          ],
          [
            [40, 'Urine Creatinine'],
            [420, '120'],
            [500, 'mg/dL'],
          ],
          [
            [40, 'Lipoprotein (a), Lp(a)'],
            [420, '62'],
            [500, 'nmol/L'],
            [600, '< 75'],
          ],
        ]),
      ],
      now,
    );
    expect(result.values).toEqual({
      hba1c: 6.1,
      glucose: 108,
      tsh: 3.21,
      vitd: 18.4,
      b12: 245,
      creatinine: 0.94,
      lpa: 26,
    });
    expect(result.found.find((f) => f.key === 'lpa')!.note).toMatch(/nmol/);
    expect(result.date).toEqual(new Date(2026, 8, 2));
    expect(result.lab).toBe('Dr Lal PathLabs');
  });

  it('reads values printed on the same line as the name, and converts mmol/L', () => {
    const result = readReport(
      [
        page([
          [[40, 'Serum Cholesterol 5.2 mmol/L']],
          [[40, 'Fasting blood sugar 5.6 mmol/L']],
          [[40, 'Creatinine 84 µmol/L']],
        ]),
      ],
      now,
    );
    expect(result.values).toEqual({ total: 201, glucose: 101, creatinine: 0.95 });
  });

  it('skips ranges and limits when looking for the value', () => {
    const result = readReport(
      [
        page([
          [
            [40, 'LDL Cholesterol'],
            [300, '< 100'],
            [420, '96'],
            [500, 'mg/dL'],
          ],
        ]),
      ],
      now,
    );
    expect(result.values).toEqual({ ldl: 96 });
  });

  it('takes the first value for a test and finds nothing in an unrelated page', () => {
    expect(
      readReport(
        [
          page([
            [
              [40, 'Haemoglobin'],
              [420, '14.2'],
              [500, 'g/dL'],
            ],
          ]),
        ],
        now,
      ).values,
    ).toEqual({});
    const twice = readReport(
      [
        page([
          [
            [40, 'HDL'],
            [420, '44'],
          ],
          [
            [40, 'HDL'],
            [420, '52'],
          ],
        ]),
      ],
      now,
    );
    expect(twice.values.hdl).toBe(44);
  });
});

describe('findReportDate', () => {
  it('ignores dates of birth and future dates', () => {
    expect(
      findReportDate([['DOB: 12/03/1984'], ['Report date 11-Oct-2026'], ['Next visit 01/01/2027']], now),
    ).toEqual(new Date(2026, 9, 11));
    expect(findReportDate([['no dates here']], now)).toBeNull();
  });
});
