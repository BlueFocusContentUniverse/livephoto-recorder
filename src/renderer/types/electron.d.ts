// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectVideoFile: () => Promise<string | null>;
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
      removeAllListeners: (channel: string) => void;
      exportLivePhoto: (data: {
        imageUrl: string;
        videoUrl: string;
        imageWidth?: number;
        imageHeight?: number;
        videoDuration?: number;
      }) => Promise<void>;
      closeExportWindow: () => Promise<{ success: boolean }>;
    };
  }
}

export {};
