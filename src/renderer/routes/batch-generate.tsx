import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { UploadsTable } from "../components/UploadsTable";
import { UploadedRecord } from "../types/uploads";

type ItemState = {
  path: string;
  status: "pending" | "processing" | "done" | "error";
  message?: string;
  thumbnailBase64?: string;
  mimeType?: string;
};

export const Route = createFileRoute("/batch-generate")({
  component: BatchGeneratePage,
});

function BatchGeneratePage() {
  const [files, setFiles] = useState<string[]>([]);
  const [items, setItems] = useState<ItemState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [uploads, setUploads] = useState<UploadedRecord[]>([]);

  // Subscribe to uploaded recording events (same as index.tsx)
  useEffect(() => {
    const handler = (data: UploadedRecord) => {
      setUploads((prev) => [data, ...prev]);
    };
    window.electronAPI?.onRecordingUploaded?.(handler);
    return () => {
      window.electronAPI?.removeAllListeners?.("recording-uploaded");
    };
  }, []);

  const pendingCount = useMemo(
    () =>
      items.filter((i) => i.status === "pending" || i.status === "processing")
        .length,
    [items],
  );

  const handlePickDirectory = useCallback(async () => {
    const list = await window.electronAPI.selectVideoDirectory();
    setFiles(list);
    setItems(list.map((p) => ({ path: p, status: "pending" as const })));
  }, []);

  const runBatch = useCallback(async () => {
    if (!items.length || isRunning) return;
    setIsRunning(true);
    try {
      for (let i = 0; i < items.length; i++) {
        const current = items[i];
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "processing" } : it,
          ),
        );

        try {
          const thumb = await window.electronAPI.generateThumbnail(
            current.path,
          );

          // Create an image object URL from base64 to serve the image asset
          const imageUrl = base64ToObjectUrl(
            thumb.thumbnailBase64,
            thumb.mimeType,
          );
          const videoUrl = `local-video://file?path=${encodeURIComponent(current.path)}`;

          // Try to estimate duration lightly (we can omit; export window will default to minimum)
          let videoDuration: number | undefined;
          try {
            videoDuration = await getVideoDuration(videoUrl);
          } catch {
            // ignore
          }

          await window.electronAPI.exportLivePhoto({
            imageUrl,
            videoUrl,
            ...(videoDuration ? { videoDuration } : {}),
          });
          // Wait until export window notifies completion
          await waitForExportComplete();
          // Revoke the temporary image URL after exporting
          URL.revokeObjectURL(imageUrl);

          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: "done",
                    thumbnailBase64: thumb.thumbnailBase64,
                    mimeType: thumb.mimeType,
                  }
                : it,
            ),
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: "error",
                    message: err instanceof Error ? err.message : String(err),
                  }
                : it,
            ),
          );
        }
      }
    } finally {
      setIsRunning(false);
    }
  }, [items, isRunning]);

  const clear = useCallback(() => {
    setFiles([]);
    setItems([]);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">批量生成</h1>
      <UploadsTable uploads={uploads} />
      <div className="flex gap-2">
        <button
          onClick={handlePickDirectory}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          选择视频目录
        </button>
        <button
          onClick={runBatch}
          disabled={!items.length || isRunning}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isRunning ? "处理中..." : "开始批量生成"}
        </button>
        <button
          onClick={clear}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          清空
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {files.length ? `已选择 ${files.length} 个视频文件` : "未选择目录"}
      </div>

      <div className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">文件路径</th>
              <th className="py-2 px-3">状态</th>
              <th className="py-2 px-3">消息</th>
            </tr>
          </thead>
          <tbody>
            {!items.length ? (
              <tr>
                <td className="py-3 px-3 text-gray-500" colSpan={3}>
                  请选择目录以开始
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.path} className="border-b last:border-b-0">
                  <td className="py-2 px-3 break-all">{it.path}</td>
                  <td className="py-2 px-3">
                    {it.status === "pending" && (
                      <span className="text-gray-500">待处理</span>
                    )}
                    {it.status === "processing" && (
                      <span className="text-blue-600">处理中...</span>
                    )}
                    {it.status === "done" && (
                      <span className="text-green-600">完成</span>
                    )}
                    {it.status === "error" && (
                      <span className="text-red-600">失败</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-red-600">{it.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600">剩余: {pendingCount}</div>
    </div>
  );
}

// Helper to get video duration in seconds
function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      resolve(video.duration);
      video.remove();
    };
    video.onerror = () => {
      reject(new Error("Failed to load video for duration"));
      video.remove();
    };
  });
}

// Convert base64 image data to a Blob URL (object URL)
function base64ToObjectUrl(base64: string, mimeType: string): string {
  const byteString = atob(base64);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Wait for a single export-complete event from the main process
function waitForExportComplete(): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      resolve();
      // Remove any export-complete listeners to avoid leaks
      window.electronAPI.removeAllListeners?.("export-complete");
    };
    window.electronAPI.onExportComplete(handler);
  });
}
