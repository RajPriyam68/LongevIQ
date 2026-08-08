export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
}

export interface StoredObject {
  data: Buffer;
  sizeBytes: number;
}

export interface ReportStorage {
  put(input: { data: Buffer; mimeType: string; extension: string }): Promise<StoredFile>;
  open(storageKey: string): Promise<StoredObject>;
  remove(storageKey: string): Promise<void>;
}
