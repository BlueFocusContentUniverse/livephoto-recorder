import { createFileRoute, useSearch } from "@tanstack/react-router";
import * as LivePhotosKit from "livephotoskit";
import React, { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/livephoto")({
  component: LivePhotoPage,
  validateSearch: (search) => {
    return {
      imageUrl: search.imageUrl as string,
      videoUrl: search.videoUrl as string,
      imageWidth: search.imageWidth
        ? parseInt(search.imageWidth as string)
        : undefined,
      imageHeight: search.imageHeight
        ? parseInt(search.imageHeight as string)
        : undefined,
      videoDuration: search.videoDuration
        ? parseFloat(search.videoDuration as string)
        : undefined,
    };
  },
});

function LivePhotoPage() {
  const { imageUrl, videoUrl, imageWidth, imageHeight, videoDuration } =
    useSearch({
      from: "/livephoto",
    });
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<LivePhotosKit.Player>(null);
  const [error, setError] = useState<string | null>(null);

  // Screen recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startScreenCapture = async () => {
    try {
      setError(null);

      // Request display media (screen sharing)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
      });

      streamRef.current = stream;

      // Handle stream end (when user stops sharing)
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenCapture();
      });
    } catch (err) {
      console.error("Error starting screen capture:", err);
      setError(err instanceof Error ? err.message : "启动屏幕录制失败");
    }
  };

  const stopScreenCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (isRecording) {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setError("没有活动的流可以录制");
      return;
    }

    try {
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=h264",
        videoBitsPerSecond: 8000000, // 8Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        // Create download link
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = `livephoto-recording-${Date.now()}.webm`;
        // a.click();
        // URL.revokeObjectURL(url);

        // Upload to S3-compatible OSS via main process
        try {
          if (window.electronAPI?.uploadRecording) {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await window.electronAPI.uploadRecording({
              arrayBuffer,
              filename: `livephoto-recording-${Date.now()}.webm`,
              mimeType: "video/webm",
              metadata: {
                source: "livephoto-export",
              },
            });
            if (!result.success) {
              console.error("Upload failed:", result.error);
            } else {
              console.log("Uploaded fileId:", result.fileId);
            }
          }
        } catch (e) {
          console.error("Upload error:", e);
        }

        // Close the export window after recording stops
        if (window.electronAPI) {
          window.electronAPI.closeExportWindow();
        }
      };

      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);
      setError(null);

      // Trigger LivePhotosKit player to play when recording starts
      if (playerRef.current) {
        try {
          playerRef.current.play();
        } catch (err) {
          console.error("Error triggering LivePhotosKit play:", err);
        }
      }
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err.message : "启动录制失败");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Auto-start screen capture and recording
  useEffect(() => {
    const autoStartCapture = async () => {
      await startScreenCapture();

      // Calculate recording duration: video duration + 2 seconds, minimum 5 seconds
      const recordingDuration = videoDuration
        ? Math.max(videoDuration + 2, 5)
        : 5;

      // Start recording after a short delay
      setTimeout(() => {
        startRecording();

        // Auto-stop after calculated duration
        autoStopTimerRef.current = setTimeout(() => {
          stopScreenCapture();
        }, recordingDuration * 1000);
      }, 1000);
    };

    // Auto-start when component mounts
    autoStartCapture();

    // Cleanup on unmount
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      stopScreenCapture();
    };
  }, [videoDuration]);

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
            showsNativeControls: true,
          },
        );

        playerRef.current = player;
        setError(null);

        // Remove LivePhotosKit badge before starting screen capture
        const badges = document.querySelectorAll(".lpk-badge");
        badges.forEach((badge) => badge.remove());
      } catch (err) {
        setError(
          `LivePhoto播放器初始化失败: ${
            err instanceof Error ? err.message : "未知错误"
          }`,
        );
        console.error("LivePhoto initialization efrror:", err);
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

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">LivePhoto 显示错误</h1>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl || !videoUrl) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">LivePhoto 加载中...</h1>
          <p className="text-lg">请稍候...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <div
        ref={containerRef}
        id="live-photo-player-container"
        className="w-full h-full"
        style={{
          width: imageWidth ? `${imageWidth}px` : `100%`,
          height: imageHeight ? `${imageHeight}px` : `100%`,
        }}
      />
    </div>
  );
}
