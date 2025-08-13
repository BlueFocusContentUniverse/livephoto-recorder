// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectVideoFile: () => Promise<string | null>;
      selectVideoDirectory: () => Promise<string[]>;
      generateThumbnail: (videoPath: string) => Promise<{
        thumbnailBase64: string;
        thumbnailPath: string;
        mimeType: string;
      }>;
      onThumbnailComplete: (
        callback: (result: {
          thumbnailBase64: string;
          thumbnailPath: string;
          mimeType: string;
        }) => void,
      ) => void;
      onRecordingUploaded: (
        callback: (data: {
          timestamp: string;
          fileId: string;
          filename: string;
          mimeType: string;
          endpoint: string;
          bucket: string;
          prefix?: string;
          url?: string;
          machine: string;
        }) => void,
      ) => void;
      removeAllListeners: (channel: string) => void;
      exportLivePhoto: (data: {
        imageUrl: string;
        videoUrl: string;
        imageWidth?: number;
        imageHeight?: number;
        videoDuration?: number;
      }) => Promise<void>;
      onExportComplete: (callback: () => void) => void;
      notifyExportComplete: () => Promise<{ success: boolean }>;
      closeExportWindow: () => Promise<{ success: boolean }>;
      uploadRecording: (data: {
        arrayBuffer: ArrayBuffer;
        filename: string;
        mimeType: string;
        metadata?: Record<string, string>;
      }) => Promise<{ success: boolean; fileId?: string; error?: string }>;
      // LIVP helpers
      selectLivpFile: () => Promise<string | null>;
      saveLivpDialog: (suggestedName?: string) => Promise<string | null>;
      encodeLivp: (payload: {
        image: { data: ArrayBuffer; extension: string };
        video: { data: ArrayBuffer; extension: string };
        outputPath?: string;
      }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
      decodeLivp: (livpPath: string) => Promise<{
        success: boolean;
        tempDir?: string;
        imagePath?: string;
        videoPath?: string;
        manifest?: unknown;
        error?: string;
      }>;
      getLivpTempUsage: () => Promise<{
        success: boolean;
        totalBytes: number;
        count: number;
        items: { path: string; bytes: number }[];
      }>;
      cleanLivpTemp: () => Promise<{
        success: boolean;
        freedBytes: number;
        removedCount: number;
      }>;
      selectDirectory: () => Promise<string | null>;
      batchExtractLivp: (dir: string) => Promise<{
        success: boolean;
        processed: number;
        extracted: number;
        errors: { file: string; error: string }[];
      }>;
    };
  }
}

declare module "@fix-webm-duration/fix" {
  export function fixWebmDuration(
    blob: Blob,
    durationMs: number,
    options?: { logger?: ((...args: unknown[]) => void) | false },
  ): Promise<Blob>;
}

export {};
