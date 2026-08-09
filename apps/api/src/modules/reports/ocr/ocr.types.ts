export interface OcrTextResult {
  text: string;
  source: 'embedded' | 'ocr';
  pages: number;
}

export interface ReportOcr {
  extractText(input: { mimeType: string; data: Buffer }): Promise<OcrTextResult>;
}
