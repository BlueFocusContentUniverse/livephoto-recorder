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

  // Initialize LivePhotosKit player
  useEffect(() => {
    const initPlayer = async () => {
      try {
        if (!imageUrl || !videoUrl) {
          setError("Both image and video URLs are required");
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
            showsNativeControls: true,
          },
        );

        playerRef.current = player;
      } catch (err) {
        setError(
          `Failed to initialize LivePhoto player: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        console.error("LivePhoto initialization error:", err);
      }
    };

    initPlayer();

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [imageUrl, videoUrl, onPlay, onStop]);

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
              <p className="font-semibold">Error Loading LivePhoto</p>
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
          Play LivePhoto
        </button>
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {imageUrl && videoUrl ? (
          <p>✅ Ready to play LivePhoto</p>
        ) : (
          <p>⚠️ Please select both image and video files</p>
        )}
      </div>
    </div>
  );
};
