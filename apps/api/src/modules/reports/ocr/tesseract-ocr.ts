import { createWorker, type Worker } from 'tesseract.js';
import type { OcrConfig } from './ocr-config.js';

/**
 * Thin wrapper around tesseract.js. A single worker is created lazily and reused;
 * recognitions are serialized with a promise chain because the worker is not safe
 * for concurrent use.
 */
export class TesseractOcr {
  private workerPromise: Promise<Worker> | null = null;
  private currentWorker: Worker | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: OcrConfig) {}

  recognize(image: Buffer): Promise<string> {
    const run = this.queue.then(() => this.recognizeUnsafe(image));
    this.queue = run.catch(() => undefined);
    return run;
  }

  async dispose(): Promise<void> {
    const worker = await this.workerPromise;
    this.workerPromise = null;
    this.currentWorker = null;
    if (worker) {
      await worker.terminate();
    }
  }

  private async recognizeUnsafe(image: Buffer): Promise<string> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(image);
    return data.text ?? '';
  }

  private getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = createWorker('eng', 1, {
        langPath: this.config.langPath,
        gzip: true,
        logger: () => undefined,
        errorHandler: () => this.onWorkerError(),
      })
        .then((worker) => {
          this.currentWorker = worker;
          return worker;
        })
        .catch((error) => {
          this.workerPromise = null;
          this.currentWorker = null;
          throw error;
        });
    }
    return this.workerPromise;
  }

  private onWorkerError(): void {
    const worker = this.currentWorker;
    this.workerPromise = null;
    this.currentWorker = null;
    if (worker) {
      void worker.terminate().catch(() => undefined);
    }
  }
}
