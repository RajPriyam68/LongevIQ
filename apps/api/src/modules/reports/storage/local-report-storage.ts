import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReportStorage, StoredFile, StoredObject } from './report-storage.types.js';

const STORAGE_KEY_PATTERN = /^[a-f0-9-]{36}\.(pdf|png|jpg)$/;

export class LocalReportStorage implements ReportStorage {
  constructor(private readonly directory: string) {}

  private pathFor(storageKey: string): string {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new Error(`Refusing to resolve unsafe storage key: ${storageKey}`);
    }
    return path.join(this.directory, storageKey);
  }

  async put(input: { data: Buffer; mimeType: string; extension: string }): Promise<StoredFile> {
    const storageKey = `${randomUUID()}.${input.extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.pathFor(storageKey), input.data, { mode: 0o600, flag: 'wx' });
    return { storageKey, sizeBytes: input.data.length };
  }

  async open(storageKey: string): Promise<StoredObject> {
    const data = await readFile(this.pathFor(storageKey));
    return { data, sizeBytes: data.length };
  }

  async remove(storageKey: string): Promise<void> {
    await unlink(this.pathFor(storageKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
