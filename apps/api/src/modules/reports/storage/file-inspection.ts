export interface DetectedFile {
  mimeType: string;
  extension: string;
}

interface FileSignature {
  mimeType: string;
  extension: string;
  magic: number[];
}

const FILE_SIGNATURES: FileSignature[] = [
  { mimeType: 'application/pdf', extension: 'pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  {
    mimeType: 'image/png',
    extension: 'png',
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mimeType: 'image/jpeg', extension: 'jpg', magic: [0xff, 0xd8, 0xff] },
];

/**
 * Detect supported medical report files from their magic bytes rather than
 * trusting the client-supplied content type or file extension.
 */
export function detectReportFile(data: Buffer): DetectedFile | null {
  for (const signature of FILE_SIGNATURES) {
    if (data.length < signature.magic.length) continue;
    let matches = true;
    for (let index = 0; index < signature.magic.length; index += 1) {
      if (data[index] !== signature.magic[index]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { mimeType: signature.mimeType, extension: signature.extension };
    }
  }
  return null;
}

export function isSupportedReportMimeType(mimeType: string): boolean {
  return FILE_SIGNATURES.some((signature) => signature.mimeType === mimeType);
}
