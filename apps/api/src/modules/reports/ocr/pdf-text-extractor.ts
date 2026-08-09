import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
const pdfjsPackageDir = dirname(require.resolve('pdfjs-dist/package.json'));

export const PDFJS_STANDARD_FONT_URL = `${
  pathToFileURL(join(pdfjsPackageDir, 'standard_fonts')).href
}/`;

export async function loadPdfDocument(data: Buffer): Promise<PDFDocumentProxy> {
  return getDocument({
    data: new Uint8Array(data),
    standardFontDataUrl: PDFJS_STANDARD_FONT_URL,
    useSystemFonts: true,
  }).promise;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfText(
  doc: PDFDocumentProxy,
  maxPages: number,
): Promise<ExtractedPdfPage[]> {
  const limit = Math.min(doc.numPages, maxPages);
  const pages: ExtractedPdfPage[] = [];
  for (let n = 1; n <= limit; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push({ pageNumber: n, text: linesFromTextItems(content.items) });
  }
  return pages;
}

function linesFromTextItems(items: readonly unknown[]): string {
  const lines: string[] = [];
  let current = '';
  let lastY: number | null = null;
  for (const raw of items) {
    if (!raw || typeof raw !== 'object' || !('str' in raw)) continue;
    const item = raw as { str: string; transform?: readonly number[] };
    const y = item.transform?.[5];
    if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 1) {
      if (current) lines.push(current);
      current = '';
    }
    if (current && !current.endsWith(' ')) current += ' ';
    current += item.str;
    if (y !== undefined) lastY = y;
  }
  if (current) lines.push(current);
  return lines.map((line) => line.replace(/\s+/g, ' ').trim()).join('\n');
}
