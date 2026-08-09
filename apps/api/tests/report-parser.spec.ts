import { describe, expect, it } from 'vitest';
import { ReportParser } from '../src/modules/reports/parsing/report-parser.js';

const parser = new ReportParser();

describe('ReportParser', () => {
  it('extracts a known bloodwork row with reference range', () => {
    const findings = parser.parse('GLUCOSE 95 mg/dL (ref 70-99)', 'BLOODWORK');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      name: 'Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      flag: 'NORMAL',
      confidence: 1,
    });
  });

  it('marks a value above the reference range as HIGH', () => {
    const findings = parser.parse('GLUCOSE 145 mg/dL (ref 70-99)', 'BLOODWORK');
    expect(findings[0].flag).toBe('HIGH');
  });

  it('marks a value below the reference range as LOW', () => {
    const findings = parser.parse('GLUCOSE 55 mg/dL (ref 70-99)', 'BLOODWORK');
    expect(findings[0].flag).toBe('LOW');
  });

  it('honors an explicit H flag even inside the range', () => {
    const findings = parser.parse('GLUCOSE 90 mg/dL (ref 70-99) H', 'BLOODWORK');
    expect(findings[0].flag).toBe('HIGH');
  });

  it('honors an explicit LOW marker', () => {
    const findings = parser.parse('POTASSIUM 3.2 mmol/L (ref 3.5-5.0) LOW', 'BLOODWORK');
    expect(findings[0].flag).toBe('LOW');
  });

  it('normalizes OCR noise for Hemoglobin A1c', () => {
    const findings = parser.parse('HEMOGLOBIN Alc 5.4 % (ref 4.0-5.6)', 'BLOODWORK');
    expect(findings[0].name).toBe('Hemoglobin A1c');
    expect(findings[0].value).toBe('5.4');
    expect(findings[0].unit).toBe('%');
    expect(findings[0].flag).toBe('NORMAL');
  });

  it('applies the default unit when the row omits it', () => {
    const findings = parser.parse('CREATININE 1.2', 'BLOODWORK');
    expect(findings[0]).toMatchObject({ name: 'Creatinine', value: '1.2', unit: 'mg/dL' });
  });

  it('parses a comma decimal and a bare parenthesized range', () => {
    const findings = parser.parse('GLUCOSE 5,5 mmol/L (3.9-5.6)', 'BLOODWORK');
    expect(findings[0]).toMatchObject({ value: '5.5', unit: 'mmol/L', flag: 'NORMAL' });
  });

  it('captures qualitative results', () => {
    const findings = parser.parse('C-Reactive Protein Negative', 'BLOODWORK');
    expect(findings[0]).toMatchObject({ name: 'C-Reactive Protein', value: 'negative' });
  });

  it('matches a multi-word alias that is shorter than the canonical name', () => {
    const findings = parser.parse('CHOLESTEROL 190 mg/dL (ref <200)', 'BLOODWORK');
    expect(findings[0].name).toBe('Total Cholesterol');
    expect(findings[0].value).toBe('190');
  });

  it('falls back to a generic row when the test is not in the lexicon', () => {
    const findings = parser.parse('VITAMIN B12 450 pg/mL (ref 200-900)', 'BLOODWORK');
    expect(findings[0]).toMatchObject({ name: 'Vitamin B12', value: '450', unit: 'pg/mL' });
    expect(findings[0].confidence).toBe(0.6);
  });

  it('does not treat the L in mg/dL as a flag marker', () => {
    const findings = parser.parse('GLUCOSE 95 mg/dL (ref 70-99)', 'BLOODWORK');
    expect(findings[0].flag).toBe('NORMAL');
  });

  it('ignores non-lab categories', () => {
    const findings = parser.parse('GLUCOSE 95 mg/dL (ref 70-99)', 'IMAGING');
    expect(findings).toHaveLength(0);
  });

  it('deduplicates identical rows', () => {
    const findings = parser.parse(
      'GLUCOSE 95 mg/dL (ref 70-99)\nGLUCOSE 95 mg/dL (ref 70-99)',
      'BLOODWORK',
    );
    expect(findings).toHaveLength(1);
  });

  it('parses a realistic multi-line OCR excerpt', () => {
    const text = [
      'PATIENT: John Doe  DOB: 1985-04-12',
      'GLUCOSE 95 mg/dL (ref 70-99)',
      'HEMOGLOBIN Alc 5.4 % (ref 4.0-5.6)',
      'TOTAL CHOLESTEROL 190 mg/dL (ref <200)',
      'HDL CHOLESTEROL 42 mg/dL (ref >40)',
      'TRIGLYCERIDES 110 mg/dL (ref <150)',
      'CREATININE 1.2 mg/dL (ref 0.7-1.3)',
    ].join('\n');
    const findings = parser.parse(text, 'BLOODWORK');
    expect(findings.map((f) => f.name)).toEqual([
      'Glucose',
      'Hemoglobin A1c',
      'Total Cholesterol',
      'HDL Cholesterol',
      'Triglycerides',
      'Creatinine',
    ]);
    expect(findings[3]).toMatchObject({ name: 'HDL Cholesterol', value: '42', flag: 'NORMAL' });
  });
});
