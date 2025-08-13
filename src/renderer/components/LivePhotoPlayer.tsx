import * as LivePhotosKit from "livephotoskit";
import React, { useEffect, useRef, useState } from "react";

interface LivePhotoPlayerProps {
  imageUrl: string | null;
  videoUrl: string | null;
  onPlay?: () => void;
  onStop?: () => void;
}

export const LivePhotoPlayer: React.FC<LivePhotoPlayerProps> = ({
  imageUrl,
  videoUrl,
  onPlay,
  onStop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<LivePhotosKit.Player>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize LivePhotosKit player
  useEffect(() => {
    const initPlayer = async () => {
      try {
        if (!imageUrl || !videoUrl) {
          setError("需要图片和视频URL");
          return;
        }

        if (!containerRef.current) return;

        // Create new LivePhoto player
        const player = LivePhotosKit.augmentElementAsPlayer(
          containerRef.current,
          {
            photoSrc: imageUrl,
            videoSrc: videoUrl,
            playbackStyle: "full",
          },
        );

        playerRef.current = player;
      } catch (err) {
        setError(
          `LivePhoto播放器初始化失败: ${
            err instanceof Error ? err.message : "未知错误"
          }`,
        );
        console.error("LivePhoto initialization error:", err);
      }
    };

    // If player doesn't exist, initialize it
    if (!playerRef.current) {
      initPlayer();
    } else {
      // If player exists, update properties
      try {
        if (imageUrl && videoUrl) {
          playerRef.current.setProperties({
            photoSrc: imageUrl,
            videoSrc: videoUrl,
          });
          setError(null);
        }
      } catch (err) {
        setError(
          `LivePhoto播放器更新失败: ${
            err instanceof Error ? err.message : "未知错误"
          }`,
        );
        console.error("LivePhoto update error:", err);
      }
    }

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [imageUrl, videoUrl]);

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  };

  const handleStop = () => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
  };

  const handleExport = async () => {
    if (!imageUrl || !videoUrl) {
      setError("需要图片和视频URL才能导出");
      return;
    }

    setIsExporting(true);
    try {
      // Get video duration first
      const videoDuration = await getVideoDuration(videoUrl);

      // Get image dimensions if available
      const img = new Image();
      img.onload = async () => {
        try {
          await window.electronAPI.exportLivePhoto({
            imageUrl,
            videoUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            videoDuration,
          });
        } catch (err) {
          setError(
            `导出失败: ${err instanceof Error ? err.message : String(err)}`,
          );
        } finally {
          setIsExporting(false);
        }
      };
      img.onerror = () => {
        // If we can't get dimensions, export without them
        window.electronAPI
          .exportLivePhoto({
            imageUrl,
            videoUrl,
            videoDuration,
          })
          .catch((err) => {
            setError(
              `导出失败: ${err instanceof Error ? err.message : String(err)}`,
            );
          })
          .finally(() => {
            setIsExporting(false);
          });
      };
      img.src = imageUrl;
    } catch (err) {
      setError(`导出失败: ${err instanceof Error ? err.message : String(err)}`);
      setIsExporting(false);
    }
  };

  // Helper function to get video duration
  const getVideoDuration = (videoUrl: string): Promise<number> => {
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
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={containerRef}
          id="live-photo-player-container"
          className="w-full h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
        />
        {error && (
          <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
            <div className="text-red-600 text-center p-4">
              <p className="font-semibold">LivePhoto加载错误</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handlePlay}
          disabled={!imageUrl || !videoUrl}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          播放LivePhoto
        </button>
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          停止
        </button>
        <button
          onClick={handleExport}
          disabled={!imageUrl || !videoUrl || isExporting}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? "导出中..." : "导出LivePhoto"}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {imageUrl && videoUrl ? (
          <p>✅ 准备播放LivePhoto</p>
        ) : (
          <p>⚠️ 请选择图片和视频文件</p>
        )}
      </div>
    </div>
  );
};
