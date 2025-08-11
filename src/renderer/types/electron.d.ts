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
    };
  }
}

export {};
