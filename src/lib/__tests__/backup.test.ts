import { labReportsCsv, parseBackupJson, toBackupJson, type BackupData } from '../backup';

const data: BackupData = {
  goals: [
    {
      startDate: new Date(2026, 8, 1),
      startKg: 86,
      targetKg: 78,
      targetDate: new Date(2027, 2, 31),
      createdAt: '2026-09-01T10:00:00.000Z',
    },
  ],
  labReports: [
    { date: new Date(2026, 9, 14), lab: 'Thyrocare, "Pune"', values: { ldl: 128, hdl: 46, hba1c: 5.8 } },
    { date: new Date(2026, 3, 2), lab: null, values: { ldl: 139 } },
  ],
  waist: [{ date: new Date(2026, 9, 1), cm: 94.5 }],
  medicines: [
    {
      id: 7,
      name: 'Rosuvastatin',
      dose: '10 mg',
      times: ['21:00'],
      remind: true,
      startDate: new Date(2026, 6, 1),
      stoppedDate: null,
    },
  ],
  doses: [{ medicineId: 7, date: '2026-10-17', time: '21:00' }],
  settings: { profile: '{"heightCm":172}' },
};

describe('backup', () => {
  it('round-trips everything through JSON', () => {
    expect(parseBackupJson(toBackupJson(data, new Date()))).toEqual(data);
  });

  it('reads older backups without medicines', () => {
    const text = '{"app":"sehat","version":1,"goals":[],"labReports":[],"waist":[],"settings":{}}';
    expect(parseBackupJson(text)).toMatchObject({ medicines: [], doses: [] });
  });

  it('rejects files that are not Sehat backups', () => {
    expect(() => parseBackupJson('hello')).toThrow(/not a Sehat backup/);
    expect(() => parseBackupJson('{"app":"other"}')).toThrow(/not a Sehat backup/);
    expect(() => parseBackupJson('{"app":"sehat","version":99}')).toThrow(/newer version/);
    expect(() => parseBackupJson('{"app":"sehat","version":1,"waist":[{"date":"2026-13","cm":90}]}')).toThrow(
      /date/,
    );
  });

  it('drops unknown tests and non-numeric values', () => {
    const text =
      '{"app":"sehat","version":1,"labReports":[{"date":"2026-10-01","values":{"ldl":100,"zinc":3,"hdl":"x"}}]}';
    expect(parseBackupJson(text).labReports[0].values).toEqual({ ldl: 100 });
  });

  it('exports labs as CSV, oldest first, with quoting', () => {
    const lines = labReportsCsv(data.labReports).trim().split('\n');
    expect(lines[0]).toMatch(/^Date,Lab,Total cholesterol \(mg\/dL\),LDL \(mg\/dL\)/);
    expect(lines[1].startsWith('2026-04-02,,,139,')).toBe(true);
    expect(lines[2]).toContain('"Thyrocare, ""Pune"""');
  });
});
