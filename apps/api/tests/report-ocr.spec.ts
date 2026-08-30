import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import PDFDocument from 'pdfkit';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { ReportOcrService } from '../src/modules/reports/ocr/report-ocr.js';
import type { OcrConfig } from '../src/modules/reports/ocr/ocr-config.js';
import { extractPdfText, loadPdfDocument } from '../src/modules/reports/ocr/pdf-text-extractor.js';

const tessdataDir = fileURLToPath(new URL('../assets/tessdata', import.meta.url));
const fontFile = fileURLToPath(new URL('../assets/fonts/DejaVuSans.ttf', import.meta.url));

const describeOcr = existsSync(`${tessdataDir}/eng.traineddata.gz`) ? describe : describe.skip;

function renderSamplePng(): Buffer {
  GlobalFonts.registerFromPath(fontFile, 'DejaVuSans');
  const canvas = createCanvas(900, 240);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 900, 240);
  ctx.fillStyle = '#000000';
  ctx.font = '30px DejaVuSans';
  ctx.fillText('PATIENT: John Doe  DOB: 1985-04-12', 20, 60);
  ctx.fillText('GLUCOSE 95 mg/dL (ref 70-99)', 20, 120);
  ctx.fillText('HEMOGLOBIN A1c 5.4 % (ref 4.0-5.6)', 20, 180);
  return canvas.toBuffer('image/png');
}

function renderDigitalPdf(lines: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(14).text('Complete Bloodwork Panel', { align: 'center' });
    doc.moveDown();
    for (const line of lines) doc.fontSize(12).text(line);
    doc.end();
  });
}

describeOcr('ReportOcrService (real tesseract)', () => {
  it('recognizes text from a rendered PNG image', async () => {
    const config: OcrConfig = {
      langPath: tessdataDir,
      minTextLength: 60,
      maxPages: 3,
      scale: 2,
      maxImageDimension: 3000,
    };
    const ocr = new ReportOcrService(config);
    try {
      const result = await ocr.extractText({ mimeType: 'image/png', data: renderSamplePng() });
      expect(result.source).toBe('ocr');
      expect(result.text).toContain('GLUCOSE');
      expect(result.text).toMatch(/95/);
      expect(result.text).toMatch(/mg\/?dL/);
    } finally {
      await ocr.dispose();
    }
  }, 30_000);
});

describe('extractPdfText (digital PDF)', () => {
  it('preserves line breaks so each row is parseable', async () => {
    const lines = [
      'GLUCOSE 95 mg/dL (ref 70-99)',
      'HEMOGLOBIN A1c 5.4 % (ref 4.0-5.6)',
      'CREATININE 1.1 mg/dL (ref 0.7-1.3)',
    ];
    const pdf = await renderDigitalPdf(lines);
    const doc = await loadPdfDocument(pdf);
    try {
      const pages = await extractPdfText(doc, 5);
      const text = pages.map((page) => page.text).join('\n');
      const textLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      expect(textLines).toContain('GLUCOSE 95 mg/dL (ref 70-99)');
      expect(textLines).toContain('HEMOGLOBIN A1c 5.4 % (ref 4.0-5.6)');
      expect(textLines).toContain('CREATININE 1.1 mg/dL (ref 0.7-1.3)');
    } finally {
      await doc.loadingTask.destroy();
    }
  }, 30_000);
});
