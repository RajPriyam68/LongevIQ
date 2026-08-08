import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ReportStorage, StoredFile, StoredObject } from './report-storage.types.js';

export interface S3ReportStorageOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class S3ReportStorage implements ReportStorage {
  private readonly client: S3Client;

  constructor(private readonly options: S3ReportStorageOptions) {
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      ...(options.accessKeyId && options.secretAccessKey
        ? {
            credentials: {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey,
            },
          }
        : {}),
    });
  }

  async put(input: { data: Buffer; mimeType: string; extension: string }): Promise<StoredFile> {
    const storageKey = `${randomUUID()}.${input.extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: storageKey,
        Body: input.data,
        ContentType: input.mimeType,
      }),
    );
    return { storageKey, sizeBytes: input.data.length };
  }

  async open(storageKey: string): Promise<StoredObject> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: storageKey }),
    );
    const body = result.Body;
    const data = body ? Buffer.from(await body.transformToByteArray()) : Buffer.alloc(0);
    return { data, sizeBytes: data.length };
  }

  async remove(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: storageKey }),
    );
  }
}
