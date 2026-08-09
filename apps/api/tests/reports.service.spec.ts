import { describe, expect, it } from 'vitest';
import type { CreateReportMetadata } from '@longeviq/shared';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import { FakeReportProcessor, FakeReportStorage, FakeReportsRepository } from './fakes.js';

const pdfBuffer = Buffer.concat([
  Buffer.from('%PDF-1.7\n'),
  Buffer.from('%\xe2\xe3\xcf\xd3\n'),
  Buffer.from('%%EOF\n'),
]);
const pngBuffer = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('PNG data'),
]);
const invalidBuffer = Buffer.from('definitely not a medical report');

function metadata(overrides: Partial<CreateReportMetadata> = {}): CreateReportMetadata {
  return {
    title: 'Annual bloodwork',
    reportDate: '2026-08-01T08:00:00.000Z',
    source: 'Central Lab',
    category: 'BLOODWORK',
    notes: 'Fasting sample',
    ...overrides,
  };
}

function makeService(options: { maxUploadBytes?: number; processor?: FakeReportProcessor } = {}) {
  const repository = new FakeReportsRepository();
  const storage = new FakeReportStorage();
  const processor = options.processor ?? new FakeReportProcessor();
  const service = new ReportsService(
    repository,
    storage,
    processor,
    repository,
    options.maxUploadBytes,
  );
  return { repository, storage, processor, service };
}

describe('ReportsService', () => {
  it('creates a report, processes it, and audits', async () => {
    const { repository, storage, processor, service } = makeService();
    const report = await service.createReport('usr_a', {
      file: { originalName: 'bloodwork.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    expect(report.status).toBe('PARSED');
    expect(report.mimeType).toBe('application/pdf');
    expect(report.fileName).toBe('bloodwork.pdf');
    expect(report.category).toBe('BLOODWORK');
    expect(report.reportDate).toBe('2026-08-01T08:00:00.000Z');

    expect(storage.objects.size).toBe(1);
    expect(repository.reports.size).toBe(1);
    expect(repository.reports.get(report.id)?.storageKey).toBe([...storage.objects.keys()][0]);
    expect(processor.calls).toHaveLength(1);
    expect(processor.calls[0]).toMatchObject({
      mimeType: 'application/pdf',
      category: 'BLOODWORK',
    });
    expect(repository.auditCalls.map((call) => call.action)).toContain('DATA.REPORT_CREATE');
    expect(repository.auditCalls.map((call) => call.action)).toContain('DATA.REPORT_PROCESSED');
  });

  it('rejects a missing file', async () => {
    const { repository, storage, service } = makeService();
    const promise = service.createReport('usr_a', {
      file: { originalName: '', sizeBytes: 0, data: Buffer.alloc(0) },
      metadata: metadata(),
    });

    await expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(storage.objects.size).toBe(0);
    expect(repository.reports.size).toBe(0);
  });

  it('rejects unsupported file types by magic bytes', async () => {
    const { repository, storage, service } = makeService();
    const promise = service.createReport('usr_a', {
      file: { originalName: 'report.txt', sizeBytes: invalidBuffer.length, data: invalidBuffer },
      metadata: metadata(),
    });

    await expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(storage.objects.size).toBe(0);
    expect(repository.reports.size).toBe(0);
  });

  it('rejects files larger than the configured limit', async () => {
    const { repository, storage, service } = makeService({ maxUploadBytes: 10 });
    const big = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(100)]);
    const promise = service.createReport('usr_a', {
      file: { originalName: 'big.pdf', sizeBytes: big.length, data: big },
      metadata: metadata(),
    });

    await expect(promise).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    expect(storage.objects.size).toBe(0);
    expect(repository.reports.size).toBe(0);
  });

  it('accepts PNG and JPEG signatures', async () => {
    const { service } = makeService();
    const png = await service.createReport('usr_a', {
      file: { originalName: 'xray.png', sizeBytes: pngBuffer.length, data: pngBuffer },
      metadata: metadata({ category: 'IMAGING' }),
    });
    expect(png.mimeType).toBe('image/png');

    const jpeg = await service.createReport('usr_a', {
      file: { originalName: 'scan.jpg', sizeBytes: 4, data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
      metadata: metadata(),
    });
    expect(jpeg.mimeType).toBe('image/jpeg');
  });

  it('lists reports with filters and pagination', async () => {
    const { service } = makeService();
    for (let index = 0; index < 3; index += 1) {
      await service.createReport('usr_a', {
        file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
        metadata: metadata({ title: `Report ${index}`, category: 'BLOODWORK' }),
      });
    }
    await service.createReport('usr_a', {
      file: { originalName: 'b.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata({ title: 'Imaging', category: 'IMAGING' }),
    });

    const bloodwork = await service.listReports('usr_a', {
      page: 1,
      limit: 2,
      sort: 'desc',
      category: 'BLOODWORK',
    });
    expect(bloodwork.pagination.total).toBe(3);
    expect(bloodwork.items).toHaveLength(2);

    const otherUser = await service.listReports('usr_b', { page: 1, limit: 20, sort: 'desc' });
    expect(otherUser.pagination.total).toBe(0);
  });

  it('isolates reports between users', async () => {
    const { service } = makeService();
    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    await expect(service.getReport('usr_b', report.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      service.updateReport('usr_b', report.id, { title: 'Hijack' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(service.downloadReport('usr_b', report.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates owned report metadata', async () => {
    const { repository, service } = makeService();
    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    const updated = await service.updateReport('usr_a', report.id, {
      title: 'Updated title',
      notes: null,
    });
    expect(updated.title).toBe('Updated title');
    expect(updated.notes).toBeNull();
    expect(updated.source).toBe('Central Lab');

    const withNotes = await service.updateReport('usr_a', report.id, { notes: 'New note' });
    expect(withNotes.notes).toBe('New note');
    expect(repository.auditCalls.map((call) => call.action)).toContain('DATA.REPORT_UPDATE');
  });

  it('deletes an owned report and its stored file', async () => {
    const { repository, storage, service } = makeService();
    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    await service.deleteReport('usr_a', report.id);
    expect(repository.reports.has(report.id)).toBe(false);
    expect(storage.objects.size).toBe(0);
    expect(repository.auditCalls.map((call) => call.action)).toContain('DATA.REPORT_DELETE');
  });

  it('downloads an owned report file', async () => {
    const { service } = makeService();
    const report = await service.createReport('usr_a', {
      file: { originalName: 'bloodwork.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    const download = await service.downloadReport('usr_a', report.id);
    expect(download.fileName).toBe('bloodwork.pdf');
    expect(download.mimeType).toBe('application/pdf');
    expect(download.data.equals(pdfBuffer)).toBe(true);
  });

  it('persists parsed text and findings and returns them in the detail', async () => {
    const processor = new FakeReportProcessor();
    processor.findings = [
      {
        id: 'f1',
        reportId: '',
        name: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        flag: 'NORMAL',
        confidence: 0.95,
        sortOrder: 0,
        createdAt: new Date(),
      },
    ];
    const { service } = makeService({ processor });
    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    expect(report.status).toBe('PARSED');

    const detail = await service.getReport('usr_a', report.id);
    expect(detail.status).toBe('PARSED');
    expect(detail.parsedText).toBe('GLUCOSE 95 mg/dL (ref 70-99)');
    expect(detail.parsedAt).not.toBeNull();
    expect(detail.findings).toHaveLength(1);
    expect(detail.findings[0]).toMatchObject({
      name: 'Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      flag: 'NORMAL',
    });
  });

  it('marks the report FAILED when processing throws, without losing the upload', async () => {
    const processor = new FakeReportProcessor();
    processor.error = new Error('Tesseract crashed');
    const { repository, service } = makeService({ processor });

    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    expect(report.status).toBe('FAILED');
    expect(repository.reports.size).toBe(1);

    const detail = await service.getReport('usr_a', report.id);
    expect(detail.status).toBe('FAILED');
    expect(detail.processingError).toBe('Tesseract crashed');
    expect(detail.findings).toHaveLength(0);
    expect(repository.auditCalls.map((call) => call.action)).toContain('DATA.REPORT_PROCESSED');
  });

  it('hides processing details and findings for other users', async () => {
    const processor = new FakeReportProcessor();
    processor.findings = [
      {
        id: 'f1',
        reportId: '',
        name: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        flag: 'NORMAL',
        confidence: 0.95,
        sortOrder: 0,
        createdAt: new Date(),
      },
    ];
    const { service } = makeService({ processor });
    const report = await service.createReport('usr_a', {
      file: { originalName: 'a.pdf', sizeBytes: pdfBuffer.length, data: pdfBuffer },
      metadata: metadata(),
    });

    await expect(service.getReport('usr_b', report.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
