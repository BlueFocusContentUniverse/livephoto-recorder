import React, { useCallback, useRef, useState } from "react";

interface ScreenRecorderProps {
  onRecordingComplete?: (videoBlob: Blob) => void;
}

export const ScreenRecorder: React.FC<ScreenRecorderProps> = ({
  onRecordingComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startScreenCapture = useCallback(async () => {
    try {
      setError(null);

      // Request display media (screen sharing)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // Include system audio
      });

      streamRef.current = stream;
      setIsStreaming(true);

      // Display the stream in the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Handle stream end (when user stops sharing)
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenCapture();
      });
    } catch (err) {
      console.error("Error starting screen capture:", err);
      setError(err instanceof Error ? err.message : "启动屏幕录制失败");
    }
  }, []);

  const stopScreenCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);

    if (isRecording) {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError("没有活动的流可以录制");
      return;
    }

    try {
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screen-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);
      startTimer();
      setError(null);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err.message : "启动录制失败");
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  }, [isRecording]);

  return (
    <div className="screen-recorder p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">屏幕录制器</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <video ref={videoRef} autoPlay muted className="w-full border" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {!isStreaming ? (
          <button
            onClick={startScreenCapture}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            开始屏幕共享
          </button>
        ) : (
          <button
            onClick={stopScreenCapture}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            停止屏幕共享
          </button>
        )}

        {isStreaming && !isRecording && (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            开始录制
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors animate-pulse"
          >
            停止录制
          </button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 font-mono">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          录制中: {formatTime(recordingTime)}
        </div>
      )}

      <div className="text-sm text-gray-600 mt-4">
        <p>• 点击"开始屏幕共享"选择要录制的内容</p>
        <p>• 点击"开始录制"开始录制共享的屏幕</p>
        <p>• 录制完成后会自动下载</p>
      </div>
    </div>
  );
};
