import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Env } from '../../../config/env.js';

export interface OcrConfig {
  langPath: string;
  minTextLength: number;
  maxPages: number;
  scale: number;
  maxImageDimension: number;
}

function defaultLangPath(): string {
  // Resolves to apps/api/assets/tessdata from both src/ and dist/
  // (the ocr directory is 4 levels below the api package root).
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../assets/tessdata');
}

export function createOcrConfig(env: Env): OcrConfig {
  return {
    langPath: env.OCR_LANG_PATH
      ? path.resolve(process.cwd(), env.OCR_LANG_PATH)
      : defaultLangPath(),
    minTextLength: env.OCR_MIN_TEXT_LENGTH,
    maxPages: env.OCR_MAX_PAGES,
    scale: env.OCR_SCALE,
    maxImageDimension: env.OCR_MAX_IMAGE_DIMENSION,
  };
}
