import type { OcrConfig } from './ocr-config.js';
import type { OcrTextResult, ReportOcr } from './ocr.types.js';
import { downscaleImage } from './image-preprocessor.js';
import { extractPdfText, loadPdfDocument } from './pdf-text-extractor.js';
import { renderPdfPageToPng } from './pdf-page-renderer.js';
import { TesseractOcr } from './tesseract-ocr.js';

export class ReportOcrService implements ReportOcr {
  private readonly tesseract: TesseractOcr;

  constructor(private readonly config: OcrConfig) {
    this.tesseract = new TesseractOcr(config);
  }

  async extractText(input: { mimeType: string; data: Buffer }): Promise<OcrTextResult> {
    if (input.mimeType === 'application/pdf') {
      return this.extractPdf(input.data);
    }
    return this.extractImage(input.data);
  }

  async dispose(): Promise<void> {
    await this.tesseract.dispose();
  }

  private async extractPdf(data: Buffer): Promise<OcrTextResult> {
    const doc = await loadPdfDocument(data);
    try {
      const pages = await extractPdfText(doc, this.config.maxPages);
      const embedded = pages
        .map((page) => page.text)
        .filter((text) => text.length > 0)
        .join('\n')
        .trim();

      if (embedded.length >= this.config.minTextLength) {
        return { text: embedded, source: 'embedded', pages: pages.length };
      }

      // Scanned PDF: render pages and OCR them.
      const renderLimit = Math.min(doc.numPages, this.config.maxPages);
      const ocrPages: string[] = [];
      for (let n = 1; n <= renderLimit; n += 1) {
        const png = await renderPdfPageToPng(doc, n, this.config.scale);
        const text = await this.tesseract.recognize(png);
        ocrPages.push(text.trim());
      }
      const combined = ocrPages
        .filter((text) => text.length > 0)
        .join('\n')
        .trim();
      if (combined.length > 0) {
        return { text: combined, source: 'ocr', pages: renderLimit };
      }
      return { text: embedded, source: 'embedded', pages: pages.length };
    } finally {
      await doc.loadingTask.destroy();
    }
  }

  private async extractImage(data: Buffer): Promise<OcrTextResult> {
    const prepared = await downscaleImage(data, this.config.maxImageDimension);
    const text = await this.tesseract.recognize(prepared);
    return { text: text.trim(), source: 'ocr', pages: 1 };
  }
}
