import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";

import { LivePhotoPlayer } from "../components/LivePhotoPlayer";
import { VideoAnalyzer } from "../components/VideoAnalyzer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedVideo(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const handlePlay = () => {
    console.log("LivePhoto started playing");
  };

  const handleStop = () => {
    console.log("LivePhoto stopped playing");
  };

  const handleThumbnailGenerated = (result: {
    thumbnailBase64: string;
    thumbnailPath: string;
    mimeType: string;
  }) => {
    console.log("Thumbnail generated!", result);

    // Set the generated thumbnail as the image for LivePhoto
    setImageUrl(`data:${result.mimeType};base64,${result.thumbnailBase64}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          实况照片播放器
        </h1>
        <p className="text-gray-600">
          选择图片和视频文件来创建实况照片体验，录制屏幕，或分析视频以找到最清晰的帧
        </p>
      </div>

      {/* Video Analyzer */}
      <VideoAnalyzer onThumbnailGenerated={handleThumbnailGenerated} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              文件选择
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择图片文件
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedImage && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ 已选择: {selectedImage.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择视频文件
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {selectedVideo && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ 已选择: {selectedVideo.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Previews */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              文件预览
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {imageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    图片预览
                  </p>
                  <img
                    src={imageUrl}
                    alt="Selected image"
                    className="w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
              {videoUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    视频预览
                  </p>
                  <video
                    src={videoUrl}
                    className="w-full h-32 object-cover rounded border"
                    controls
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LivePhoto Player */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            实况照片播放器
          </h2>
          <LivePhotoPlayer
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            onPlay={handlePlay}
            onStop={handleStop}
          />
        </div>
      </div>
    </div>
  );
}
