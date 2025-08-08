import React, { useEffect, useState, useRef } from "react";

import { LivePhotoPlayer } from "./LivePhotoPlayer";

interface ThumbnailResult {
  thumbnailBase64: string;
  thumbnailPath: string;
  mimeType: string;
}

interface VideoAnalyzerProps {
  onThumbnailGenerated?: (result: ThumbnailResult) => void;
}

export const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({
  onThumbnailGenerated,
}) => {
  const [selectedVideoPath, setSelectedVideoPath] = useState<string | null>(
    null,
  );
  const [selectedVideoName, setSelectedVideoName] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<ThumbnailResult | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [showLivePhotoPlayer, setShowLivePhotoPlayer] = useState(false);

  // Keep an object URL for the thumbnail blob
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const currentThumbUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const handleThumbnailComplete = (result: ThumbnailResult) => {
      setThumbnail(result);
      setIsGeneratingThumbnail(false);
      onThumbnailGenerated?.(result);
    };

    // Add listeners
    window.electronAPI.onThumbnailComplete(handleThumbnailComplete);

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners("thumbnail-complete");
    };
  }, [onThumbnailGenerated]);

  // Convert thumbnail base64 to Blob and manage object URL lifecycle
  useEffect(() => {
    // Revoke previous URL before creating a new one
    if (currentThumbUrlRef.current) {
      URL.revokeObjectURL(currentThumbUrlRef.current);
      currentThumbUrlRef.current = null;
    }

    if (!thumbnail) {
      setThumbnailUrl(null);
      return;
    }

    try {
      const { thumbnailBase64, mimeType } = thumbnail;
      const byteString = atob(thumbnailBase64);
      const len = byteString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      currentThumbUrlRef.current = url;
      setThumbnailUrl(url);
    } catch (e) {
      console.error("Failed to create object URL for thumbnail:", e);
      setThumbnailUrl(null);
    }

    // Cleanup on unmount
    return () => {
      if (currentThumbUrlRef.current) {
        URL.revokeObjectURL(currentThumbUrlRef.current);
        currentThumbUrlRef.current = null;
      }
    };
  }, [thumbnail]);

  const handleVideoSelect = async () => {
    try {
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
        setSelectedVideoPath(filePath);
        setSelectedVideoName(
          filePath.split("/").pop() || filePath.split("\\").pop() || "未知",
        );
        setVideoPreview(
          `local-video://file?path=${encodeURIComponent(filePath)}`,
        );
        setError(null);
        setThumbnail(null);
        setShowLivePhotoPlayer(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateThumbnail = async () => {
    if (!selectedVideoPath) return;

    setIsGeneratingThumbnail(true);
    setError(null);
    setThumbnail(null);
    setShowLivePhotoPlayer(false);

    try {
      await window.electronAPI.generateThumbnail(selectedVideoPath);
      // The result is handled by the thumbnail complete listener
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsGeneratingThumbnail(false);
    }
  };

  const handleCreateLivePhoto = () => {
    setShowLivePhotoPlayer(true);
  };

  const clearSelection = () => {
    setSelectedVideoPath(null);
    setSelectedVideoName(null);
    setVideoPreview(null);
    setError(null);
    setThumbnail(null);
    setShowLivePhotoPlayer(false);
  };

  // Prepare data URLs for LivePhotoPlayer
  const imageUrl = thumbnailUrl; // use object URL for the generated thumbnail
  const videoUrl = videoPreview;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">视频分析器</h2>

        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择要分析的视频文件
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleVideoSelect}
                className="flex-1 py-2 px-4 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-200 text-sm font-medium"
              >
                选择视频文件
              </button>
              {selectedVideoPath && (
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  清除
                </button>
              )}
            </div>
            {selectedVideoName && (
              <p className="mt-2 text-sm text-green-600">
                ✅ 已选择: {selectedVideoName}
              </p>
            )}
          </div>

          {/* Video Preview */}
          {videoPreview && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                视频预览
              </label>
              <video
                src={videoPreview}
                className="h-96 aspect-video rounded border"
                controls
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleGenerateThumbnail}
              disabled={!selectedVideoPath || isGeneratingThumbnail}
              className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                !selectedVideoPath || isGeneratingThumbnail
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isGeneratingThumbnail ? "正在生成封面..." : "生成封面"}
            </button>

            {/* Create Live Photo Button */}
            {thumbnail && videoPreview && (
              <button
                onClick={handleCreateLivePhoto}
                className="w-full py-2 px-4 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors"
              >
                创建LivePhoto
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="text-sm font-medium text-red-800 mb-1">
                操作失败
              </h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Thumbnail Display */}
          {thumbnail && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="text-sm font-medium text-blue-800 mb-3">
                封面已生成
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    生成的封面:
                  </p>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Generated thumbnail"
                      className="w-full h-64 object-contain rounded border bg-white"
                    />
                  )}
                </div>

                <div className="text-sm">
                  <span className="font-medium text-gray-700">MIME类型:</span>
                  <span className="ml-2 text-blue-700">
                    {thumbnail.mimeType}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Photo Player */}
      {showLivePhotoPlayer && imageUrl && videoUrl && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            LivePhoto播放器
          </h2>
          <LivePhotoPlayer
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            onPlay={() => console.log("LivePhoto started playing")}
            onStop={() => console.log("LivePhoto stopped")}
          />
        </div>
      )}
    </div>
  );
};
