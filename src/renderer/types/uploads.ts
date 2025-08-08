export type UploadedRecord = {
  timestamp: string;
  fileId: string;
  filename: string;
  mimeType: string;
  endpoint: string;
  bucket: string;
  prefix?: string;
  url?: string;
  machine: string;
};
