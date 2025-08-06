import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow } from "electron";
import ffmpeg from "fluent-ffmpeg";

import { ThumbnailResult } from "./preload";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global variable to store ffmpeg path once found
let ffmpegPath = "";

// Function to find and set FFmpeg path
async function initializeFfmpegPath(): Promise<void> {
  if (ffmpegPath) return; // Already initialized

  // Check if we're in development or production
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const isPackaged = app.isPackaged;

  // Define paths based on environment
  const possiblePaths = [];

  if (isPackaged) {
    // Production/packaged app paths - prioritize resourcesPath
    possiblePaths.push(
      path.join(process.resourcesPath, "ffmpeg", "win", "ffmpeg.exe"),
      path.join(process.resourcesPath, "ffmpeg", "ffmpeg.exe"),
      path.join(app.getAppPath(), "ffmpeg", "win", "ffmpeg.exe"),
      path.join(app.getAppPath(), "ffmpeg", "ffmpeg.exe"),
    );
  } else {
    // Development paths
    possiblePaths.push(
      path.join(__dirname, "..", "..", "ffmpeg", "win", "ffmpeg.exe"),
      path.join(process.cwd(), "ffmpeg", "win", "ffmpeg.exe"),
      path.join(process.cwd(), "ffmpeg", "ffmpeg.exe"),
    );
  }

  // Add system ffmpeg as fallback for both environments
  possiblePaths.push("ffmpeg");

  console.log(
    `FFmpeg search paths (${isDev ? "development" : "production"}):`,
    possiblePaths,
  );

  for (const testPath of possiblePaths) {
    try {
      // For system command "ffmpeg", skip file access check
      if (testPath === "ffmpeg") {
        ffmpegPath = testPath;
        console.log("Using system FFmpeg command");
        ffmpeg.setFfmpegPath(ffmpegPath);
        return;
      }

      // Check if file exists for absolute paths
      await fs.access(testPath);
      ffmpegPath = testPath;
      console.log("Found FFmpeg at:", ffmpegPath);
      ffmpeg.setFfmpegPath(ffmpegPath);
      return;
    } catch {
      console.log("FFmpeg not found at:", testPath);
    }
  }

  console.error("FFmpeg executable not found in any expected location");
  console.log("Environment:", isDev ? "development" : "production");
  console.log("App path:", app.getAppPath());
  console.log("Resources path:", process.resourcesPath);
  console.log("Searched paths:", possiblePaths);
  throw new Error("FFmpeg executable not found");
}

export interface VideoAnalysisResult {
  sharpestFramePath: string;
  sharpnessScore: number;
  frameTimestamp: number;
  totalFrames: number;
}

export interface FrameInfo {
  timestamp: number;
  framePath: string;
  sharpnessScore: number;
}

export class VideoAnalyzer {
  private tempDir: string;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.tempDir = path.join(app.getPath("temp"), "video-analysis");
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
      throw error;
    }
  }

  private async cleanupTempFile(thumbnailPath: string): Promise<void> {
    try {
      await fs.unlink(thumbnailPath);
    } catch (error) {
      console.warn("Failed to cleanup temp file:", thumbnailPath, error);
    }
  }

  private sendError(error: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("analysis-error", error);
    }
  }

  private sendThumbnailComplete(result: ThumbnailResult): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("thumbnail-complete", result);
    }
  }

  public async generateThumbnail(videoPath: string): Promise<ThumbnailResult> {
    try {
      // Initialize FFmpeg path first
      await initializeFfmpegPath();
      await this.ensureTempDir();

      const thumbnailPath = path.join(
        this.tempDir,
        `thumbnail_${Date.now()}.png`,
      );

      // Use FFmpeg with thumbnail filter to generate the best frame
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilters("thumbnail")
          .frames(1)
          .output(thumbnailPath)
          .on("end", () => {
            console.log("Thumbnail generation completed");
            resolve();
          })
          .on("error", (err) => {
            console.error("Thumbnail generation failed:", err);
            reject(err);
          })
          .run();
      });

      // Read the generated thumbnail as a buffer
      const thumbnailBlob = await fs.readFile(thumbnailPath);

      const result: ThumbnailResult = {
        thumbnailBase64: thumbnailBlob.toString("base64"),
        thumbnailPath,
        mimeType: "image/png",
      };

      this.sendThumbnailComplete(result);
      await this.cleanupTempFile(thumbnailPath);
      return result;
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.sendError(errorMessage);
      throw error;
    }
  }
}
