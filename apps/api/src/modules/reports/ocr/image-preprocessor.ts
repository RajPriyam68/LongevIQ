import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Downscales oversized images before OCR to bound memory and CPU. Returns the
 * original buffer when it already fits within the dimension limit.
 */
export async function downscaleImage(data: Buffer, maxDimension: number): Promise<Buffer> {
  const image = await loadImage(data);
  const width = image.width;
  const height = image.height;
  if (Math.max(width, height) <= maxDimension) {
    return data;
  }

  const scale = maxDimension / Math.max(width, height);
  const outWidth = Math.max(1, Math.floor(width * scale));
  const outHeight = Math.max(1, Math.floor(height * scale));
  const canvas = createCanvas(outWidth, outHeight);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, outWidth, outHeight);
  return canvas.toBuffer('image/png');
}
