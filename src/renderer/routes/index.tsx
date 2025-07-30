import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { LivePhotoPlayer } from "../components/LivePhotoPlayer";

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          LivePhoto Player
        </h1>
        <p className="text-gray-600">
          Select an image and video file to create a LivePhoto experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              File Selection
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedImage && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Selected: {selectedImage.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {selectedVideo && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Selected: {selectedVideo.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Previews */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              File Previews
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {imageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Image Preview
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
                    Video Preview
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
            LivePhoto Player
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
