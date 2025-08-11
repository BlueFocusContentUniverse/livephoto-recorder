import { contextBridge, ipcRenderer } from "electron";

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

export interface ThumbnailResult {
  thumbnailBase64: string;
  thumbnailPath: string;
  mimeType: string;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  selectVideoFile: () => ipcRenderer.invoke("select-video-file"),
  selectVideoDirectory: () =>
    ipcRenderer.invoke("select-video-directory") as Promise<string[]>,
  generateThumbnail: (videoPath: string) =>
    ipcRenderer.invoke("generate-thumbnail", videoPath),
  onThumbnailComplete: (callback: (result: ThumbnailResult) => void) => {
    ipcRenderer.on("thumbnail-complete", (_event, result) => callback(result));
  },
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
  ) => {
    ipcRenderer.on("recording-uploaded", (_event, payload) =>
      callback(payload),
    );
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  exportLivePhoto: (data: {
    imageUrl: string;
    videoUrl: string;
    imageWidth?: number;
    imageHeight?: number;
  }) => ipcRenderer.invoke("export-live-photo", data),
  closeExportWindow: () => ipcRenderer.invoke("close-export-window"),
  onExportComplete: (callback: () => void) => {
    ipcRenderer.on("export-complete", () => callback());
  },
  notifyExportComplete: () => ipcRenderer.invoke("export-complete"),
  uploadRecording: (data: {
    arrayBuffer: ArrayBuffer;
    filename: string;
    mimeType: string;
    metadata?: Record<string, string>;
  }) => ipcRenderer.invoke("upload-recording", data),
});
