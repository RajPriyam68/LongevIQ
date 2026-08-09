import { createCanvas } from '@napi-rs/canvas';
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Renders a single PDF page to a PNG buffer using @napi-rs/canvas. This is the
 * fallback path for scanned PDFs whose embedded text layer is empty.
 */
export async function renderPdfPageToPng(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<Buffer> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const context = canvas.getContext('2d');
  await page.render({
    canvasContext: context,
    canvas,
    viewport,
  }).promise;
  return canvas.toBuffer('image/png');
}
