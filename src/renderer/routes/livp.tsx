import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";

import { LivePhotoPlayer } from "../components/LivePhotoPlayer";

export const Route = createFileRoute("/livp")({
  component: LivpTool,
});

function LivpTool() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [encodedPath, setEncodedPath] = useState<string | null>(null);
  const [decodedImagePath, setDecodedImagePath] = useState<string | null>(null);
  const [decodedVideoPath, setDecodedVideoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{
    processed: number;
    extracted: number;
    errors: { file: string; error: string }[];
  } | null>(null);

  const imagePreviewUrl = useMemo(() => {
    if (decodedImagePath) {
      // Use file:// for images
      return "local-image://file?path=" + encodeURIComponent(decodedImagePath);
    }
    if (imageFile) return URL.createObjectURL(imageFile);
    return null;
  }, [decodedImagePath, imageFile]);

  const videoPreviewUrl = useMemo(() => {
    if (decodedVideoPath) {
      // Use custom protocol for secure streaming
      return `local-video://file?path=${encodeURIComponent(decodedVideoPath)}`;
    }
    if (videoFile) return URL.createObjectURL(videoFile);
    return null;
  }, [decodedVideoPath, videoFile]);

  async function handleEncode() {
    try {
      setBusy(true);
      setMessage(null);
      if (!imageFile || !videoFile) {
        setMessage("请选择图片与视频文件");
        return;
      }
      const outputPath = await window.electronAPI.saveLivpDialog?.(
        `livephoto-${Date.now()}.livp`,
      );
      if (!outputPath) return;

      const [imgBuf, vidBuf] = await Promise.all([
        imageFile.arrayBuffer(),
        videoFile.arrayBuffer(),
      ]);

      const res = (await window.electronAPI.encodeLivp?.({
        image: { data: imgBuf, extension: extFromName(imageFile.name) },
        video: { data: vidBuf, extension: extFromName(videoFile.name) },
        outputPath,
      })) as
        | { success: boolean; outputPath?: string; error?: string }
        | undefined;

      if (res?.success) {
        setEncodedPath(res.outputPath ?? null);
        setMessage("✅ LIVP 编码完成");
      } else {
        setMessage(`❌ 编码失败: ${res?.error ?? "未知错误"}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDecode() {
    try {
      setBusy(true);
      setMessage(null);
      const filePath = await window.electronAPI.selectLivpFile?.();
      if (!filePath) return;
      const res = await window.electronAPI.decodeLivp?.(filePath);
      if (res?.success) {
        setDecodedImagePath(res.imagePath ?? null);
        setDecodedVideoPath(res.videoPath ?? null);
        setMessage("✅ LIVP 解析完成");
      } else {
        setMessage(`❌ 解析失败: ${res?.error ?? "未知错误"}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchExtract() {
    try {
      setBusy(true);
      setMessage(null);
      setBatchResult(null);
      const dir = await window.electronAPI.selectDirectory?.();
      if (!dir) return;
      const res = await window.electronAPI.batchExtractLivp?.(dir);
      if (res?.success) {
        setBatchResult({
          processed: res.processed,
          extracted: res.extracted,
          errors: res.errors,
        });
        setMessage(
          `✅ 批量解压完成: 处理 ${res.processed} 个，导出 ${res.extracted} 个视频`,
        );
      } else {
        setMessage(`❌ 批量解压失败`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
        onClick={handleBatchExtract}
        disabled={busy}
      >
        {busy ? "处理中..." : "批量解压目录内 LIVP 的视频"}
      </button>
      <p className="text-sm text-gray-500">
        解压完成请去批量生成页进行批量处理
      </p>
      <h1 className="text-2xl font-bold">LIVP 编码/解析</h1>

      {message && (
        <div className="p-3 rounded border bg-gray-50 text-gray-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">选择图片</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">选择视频</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={handleEncode}
            disabled={busy}
          >
            {busy ? "处理中..." : "编码为 LIVP"}
          </button>
          {encodedPath && (
            <div className="text-sm text-green-700 break-all">
              已输出: {encodedPath}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            onClick={handleDecode}
            disabled={busy}
          >
            {busy ? "处理中..." : "打开并解析 LIVP"}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm mb-2">图片预览</div>
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  className="w-full h-32 object-cover rounded border"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center border rounded text-gray-400">
                  无
                </div>
              )}
            </div>
            <div>
              <div className="text-sm mb-2">视频预览</div>
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  className="w-full h-32 object-cover rounded border"
                  controls
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center border rounded text-gray-400">
                  无
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {batchResult && (
        <div className="mt-4 p-3 border rounded bg-gray-50 text-sm">
          <div>
            统计：处理 {batchResult.processed}，导出 {batchResult.extracted}
          </div>
          {batchResult.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer">
                错误列表（{batchResult.errors.length}）
              </summary>
              <ul className="list-disc list-inside text-red-600">
                {batchResult.errors.map((e, idx) => (
                  <li key={idx}>
                    {e.file}: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* LivePhotoPlayer preview when decoded */}
      {decodedImagePath && decodedVideoPath && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">LivePhoto 播放预览</h2>
          <LivePhotoPlayer
            imageUrl={`local-image://file?path=${encodeURIComponent(decodedImagePath)}`}
            videoUrl={`local-video://file?path=${encodeURIComponent(decodedVideoPath)}`}
          />
        </div>
      )}
    </div>
  );
}

function extFromName(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[0] : "";
}
