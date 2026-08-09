import type { ReportCategory } from '@longeviq/shared';
import type { ReportOcr } from '../ocr/ocr.types.js';
import { ReportParser, type ParsedFinding } from '../parsing/report-parser.js';

export interface ProcessingResult {
  parsedText: string;
  findings: ParsedFinding[];
}

export interface ReportProcessor {
  process(input: {
    mimeType: string;
    data: Buffer;
    category: ReportCategory;
  }): Promise<ProcessingResult>;
}

export class ReportProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportProcessingError';
  }
}

export class ReportProcessorImpl implements ReportProcessor {
  constructor(
    private readonly ocr: ReportOcr,
    private readonly parser: ReportParser = new ReportParser(),
  ) {}

  async process(input: {
    mimeType: string;
    data: Buffer;
    category: ReportCategory;
  }): Promise<ProcessingResult> {
    const { text } = await this.ocr.extractText({
      mimeType: input.mimeType,
      data: input.data,
    });
    const trimmed = text.trim();
    if (!trimmed) {
      throw new ReportProcessingError('No text could be extracted from the report.');
    }
    const findings = this.parser.parse(trimmed, input.category);
    return { parsedText: trimmed, findings };
  }
}
