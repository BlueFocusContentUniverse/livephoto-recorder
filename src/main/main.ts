import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os, { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import AdmZip from "adm-zip";
import dotenv from "dotenv";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  protocol,
  screen,
  session,
} from "electron";
import started from "electron-squirrel-startup";
import * as Minio from "minio";

import { VideoAnalyzer } from "./videoAnalyzer.js";

// Load .env into process.env
// In packaged app, load from resourcesPath; in dev, load from project root
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(process.cwd(), ".env");
dotenv.config({ path: envPath });

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-video",
    privileges: { bypassCSP: true, standard: true, stream: true },
  },
  {
    scheme: "local-image",
    privileges: { bypassCSP: true, standard: true, stream: true },
  },
]);

let mainWindow: BrowserWindow | null = null;
let videoAnalyzer: VideoAnalyzer | null = null;
let exportWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "LivePhoto Recorder",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Keep web security enabled for better security
    },
  });

  // Initialize video analyzer
  videoAnalyzer = new VideoAnalyzer(mainWindow);

  // Set up screen capture handler
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer
        .getSources({
          types: ["window"],
          thumbnailSize: { width: 0, height: 0 },
          fetchWindowIcons: false,
        })
        .then((sources) => {
          // Find the LivePhoto Exporter window
          const livePhotoExporterWindow = sources.find((source) => {
            return source.name === "LivePhoto Exporter";
          });

          if (livePhotoExporterWindow) {
            console.log(
              "Found LivePhoto Exporter window:",
              livePhotoExporterWindow.id,
            );
            callback({
              video: livePhotoExporterWindow,
              audio: "loopback", // Enable system audio capture
            });
          } else {
            console.log(
              "LivePhoto Exporter window not found, available sources:",
              sources.map((s) => s.name),
            );
            callback({});
          }
        })
        .catch((error) => {
          console.error("Error getting screen sources:", error);
          callback({});
        });
    },
    {
      useSystemPicker: true, // Use system picker when available (experimental)
    },
  );

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Create export window for displaying live photo
const createExportWindow = (data: {
  imageUrl: string;
  videoUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  videoDuration?: number;
}) => {
  // Get the primary display's work area (screen minus taskbar/dock)
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  // Calculate maximum window size (leave some margin)
  const maxWidth = workArea.width - 40; // 20px margin on each side
  const maxHeight = workArea.height - 40; // 20px margin on each side

  // Calculate window size based on image dimensions
  let windowWidth = maxWidth;
  let windowHeight = maxHeight;

  if (data.imageWidth && data.imageHeight) {
    const aspectRatio = data.imageWidth / data.imageHeight;

    if (aspectRatio > 1) {
      // Landscape image - fit to width
      windowWidth = Math.min(data.imageWidth, maxWidth);
      windowHeight = windowWidth / aspectRatio;

      // If height exceeds max, fit to height instead
      if (windowHeight > maxHeight) {
        windowHeight = maxHeight;
        windowWidth = windowHeight * aspectRatio;
      }
    } else {
      // Portrait image - fit to height
      windowHeight = Math.min(data.imageHeight, maxHeight);
      windowWidth = windowHeight * aspectRatio;

      // If width exceeds max, fit to width instead
      if (windowWidth > maxWidth) {
        windowWidth = maxWidth;
        windowHeight = windowWidth / aspectRatio;
      }
    }

    // Ensure minimum size
    windowWidth = Math.max(windowWidth, 400);
    windowHeight = Math.max(windowHeight, 300);
  }

  const exportWindow = new BrowserWindow({
    width: Math.round(windowWidth),
    height: Math.round(windowHeight),
    x: workArea.x + 20, // Position with margin from left
    y: workArea.y + 20, // Position with margin from top
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      webSecurity: true,
    },
    title: "LivePhoto Exporter",
    resizable: true,
    minimizable: true,
    maximizable: true,
  });

  // Build the URL with search parameters
  const searchParams = new URLSearchParams({
    imageUrl: data.imageUrl,
    videoUrl: data.videoUrl,
    ...(data.imageWidth && { imageWidth: data.imageWidth.toString() }),
    ...(data.imageHeight && { imageHeight: data.imageHeight.toString() }),
    ...(data.videoDuration && { videoDuration: data.videoDuration.toString() }),
  });

  const livePhotoUrl = `#/livephoto?${searchParams.toString()}`;

  // Load the livephoto route
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    exportWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${livePhotoUrl}`);
  } else {
    exportWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: livePhotoUrl },
    );
  }

  // Close export window when main window is closed
  if (mainWindow) {
    mainWindow.on("closed", () => {
      if (!exportWindow.isDestroyed()) {
        exportWindow.close();
      }
    });
  }

  return exportWindow;
};

// Setup IPC handlers
const setupIpcHandlers = () => {
  // IPC handler for thumbnail generation
  ipcMain.handle("generate-thumbnail", async (event, videoPath: string) => {
    if (!videoAnalyzer) {
      throw new Error("Video analyzer not initialized");
    }

    try {
      const result = await videoAnalyzer.generateThumbnail(videoPath);
      // Return the thumbnail blob as a base64 string for easy transmission
      return {
        thumbnailBase64: result.thumbnailBase64,
        thumbnailPath: result.thumbnailPath,
        mimeType: result.mimeType,
      };
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      throw error;
    }
  });

  // Handle file selection dialog
  ipcMain.handle("select-video-file", async () => {
    if (!mainWindow) {
      throw new Error("Main window not available");
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"],
        },
      ],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // Handle selecting a directory and returning all video files inside (non-recursive for now)
  ipcMain.handle("select-video-directory", async () => {
    if (!mainWindow) {
      throw new Error("Main window not available");
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [] as string[];
    }

    const dirPath = result.filePaths[0];
    const entries = await readdir(dirPath);
    const videoExtensions = new Set([
      ".mp4",
      ".avi",
      ".mov",
      ".mkv",
      ".webm",
      ".flv",
      ".wmv",
    ]);

    const files: string[] = [];
    for (const name of entries) {
      const full = path.join(dirPath, name);
      try {
        const s = await stat(full);
        if (s.isFile()) {
          const ext = path.extname(name).toLowerCase();
          if (videoExtensions.has(ext)) {
            files.push(full);
          }
        }
      } catch {
        // ignore
      }
    }

    return files;
  });

  // Handle live photo export
  ipcMain.handle(
    "export-live-photo",
    async (
      event,
      data: {
        imageUrl: string;
        videoUrl: string;
        imageWidth?: number;
        imageHeight?: number;
        videoDuration?: number;
      },
    ) => {
      try {
        exportWindow = createExportWindow(data);
        return { success: true };
      } catch (error) {
        console.error("Export window creation failed:", error);
        throw error;
      }
    },
  );

  // Called from export window when export/recording successfully finished
  ipcMain.handle("export-complete", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("export-complete");
    }
    return { success: true };
  });

  // Handle upload-recording: save blob to S3 compatible storage and notify main window
  ipcMain.handle(
    "upload-recording",
    async (
      _event,
      data: {
        arrayBuffer: ArrayBuffer;
        filename: string;
        mimeType: string;
        metadata?: Record<string, string>;
      },
    ) => {
      try {
        // Read credentials from env (or you can wire a settings UI later)
        const endpoint = process.env.S3_ENDPOINT || "";
        const accessKey = process.env.S3_ACCESS_KEY_ID || "";
        const secretKey = process.env.S3_SECRET_ACCESS_KEY || "";
        const bucket = process.env.S3_BUCKET || "";

        if (!endpoint || !accessKey || !secretKey || !bucket) {
          throw new Error(
            "Missing S3 configuration. Please set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET",
          );
        }

        // Parse endpoint (host/port/SSL)
        const url = new URL(endpoint);
        const endPoint = url.hostname;
        const port = url.port
          ? parseInt(url.port, 10)
          : url.protocol === "https:"
            ? 443
            : 80;
        const useSSL = url.protocol === "https:";

        const minioClient = new Minio.Client({
          endPoint,
          port,
          useSSL,
          accessKey,
          secretKey,
        });

        const fileBuffer = Buffer.from(new Uint8Array(data.arrayBuffer));
        // Optional directory/prefix inside the bucket
        const rawPrefix = (process.env.S3_PREFIX || "").trim();
        const normalizedPrefix = rawPrefix.replace(/^\/+|\/+$/g, ""); // remove leading/trailing '/'
        const baseName = `${Date.now()}-${data.filename}`;
        const objectKey = normalizedPrefix
          ? `${normalizedPrefix}/${baseName}`
          : baseName;

        // Upload with content-type and optional metadata
        const customMeta: Record<string, string> = Object.fromEntries(
          Object.entries(data.metadata || {}).map(([k, v]) => [
            `X-Amz-Meta-${k}`,
            String(v),
          ]),
        );

        await minioClient.putObject(
          bucket,
          objectKey,
          fileBuffer,
          fileBuffer.length,
          {
            "Content-Type": data.mimeType,
            ...customMeta,
          },
        );

        const fileId = objectKey; // now includes prefix if provided

        // Build a public URL like `${endpoint}${bucket}/${prefix}${filename}`
        const trimmedEndpoint = endpoint.replace(/\/+$/, "");
        const publicUrl = `${trimmedEndpoint}/${bucket}/${objectKey}`;

        // Notify main window (if available) so renderer can update its table
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("recording-uploaded", {
            timestamp: new Date().toISOString(),
            fileId,
            filename: data.filename,
            mimeType: data.mimeType,
            endpoint,
            bucket,
            prefix: normalizedPrefix,
            url: publicUrl,
            machine: os.hostname(),
          });
        }

        console.log("upload-recording success:", fileId);

        return { success: true, fileId };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("upload-recording failed:", message);
        return { success: false, error: message };
      }
    },
  );

  // Handle close-export-window
  ipcMain.handle("close-export-window", () => {
    if (exportWindow) {
      exportWindow.close();
      exportWindow = null;
    }
    return { success: true };
  });

  // Allow user to pick a .livp file
  ipcMain.handle("select-livp-file", async () => {
    if (!mainWindow) throw new Error("Main window not available");
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "LIVP", extensions: ["livp"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Allow user to pick save path for .livp
  ipcMain.handle(
    "save-livp-dialog",
    async (_event, suggestedName?: string): Promise<string | null> => {
      if (!mainWindow) throw new Error("Main window not available");
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: suggestedName || `livephoto-${Date.now()}.livp`,
        filters: [{ name: "LIVP", extensions: ["livp"] }],
      });
      if (result.canceled || !result.filePath) return null;
      return result.filePath;
    },
  );

  // Encode image+video into a .livp (zip) container
  ipcMain.handle(
    "encode-livp",
    async (
      _event,
      payload: {
        image: { data: ArrayBuffer; extension: string };
        video: { data: ArrayBuffer; extension: string };
        outputPath?: string;
      },
    ) => {
      try {
        const outPath =
          payload.outputPath ||
          path.join(
            os.tmpdir(),
            `livephoto-${Date.now()}-${randomUUID()}.livp`,
          );

        const zip = new AdmZip();
        const imgName = `image${normalizeExt(payload.image.extension)}`;
        const vidName = `video${normalizeExt(payload.video.extension)}`;
        zip.addFile(imgName, Buffer.from(payload.image.data));
        zip.addFile(vidName, Buffer.from(payload.video.data));
        zip.writeZip(outPath);
        return {
          success: true,
          outputPath: outPath,
          entries: { image: imgName, video: vidName },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("encode-livp failed:", message);
        return { success: false, error: message };
      }
    },
  );

  // Decode a .livp into temp folder and return extracted file paths
  ipcMain.handle("decode-livp", async (_event, livpPath: string) => {
    try {
      const buffer = await readFile(livpPath);
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      const tempRoot = await mkdtemp(path.join(tmpdir(), "livp-"));

      let imagePath: string | undefined;
      let videoPath: string | undefined;

      for (const e of entries) {
        if (e.isDirectory) continue;
        const lower = e.entryName.toLowerCase();
        // Detect types
        if (/(\.jpe?g|\.png|\.heic|\.heif)$/.test(lower)) {
          const out = path.join(tempRoot, path.basename(e.entryName));
          await writeFile(out, e.getData());
          imagePath = out;
        } else if (/(\.mp4|\.mov|\.hevc|\.webm|\.m4v)$/.test(lower)) {
          const out = path.join(tempRoot, path.basename(e.entryName));
          await writeFile(out, e.getData());
          videoPath = out;
        } else {
          // Extract unknown files as well
          const out = path.join(tempRoot, path.basename(e.entryName));
          await writeFile(out, e.getData());
        }
      }

      return {
        success: true,
        tempDir: tempRoot,
        imagePath,
        videoPath,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("decode-livp failed:", message);
      return { success: false, error: message };
    }
  });

  // Select any directory
  ipcMain.handle("select-directory", async () => {
    if (!mainWindow) throw new Error("Main window not available");
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Batch extract videos from all .livp files in a directory
  ipcMain.handle(
    "batch-extract-livp",
    async (
      _event,
      dir: string,
    ): Promise<{
      success: boolean;
      processed: number;
      extracted: number;
      errors: { file: string; error: string }[];
    }> => {
      const errors: { file: string; error: string }[] = [];
      let processed = 0;
      let extracted = 0;
      try {
        const names = await readdir(dir);
        for (const name of names) {
          if (!name.toLowerCase().endsWith(".livp")) continue;
          processed += 1;
          const full = path.join(dir, name);
          try {
            const buf = await readFile(full);
            const zip = new AdmZip(buf);
            const entries = zip.getEntries();
            const videoEntry = entries.find((e) =>
              /\.(mp4|mov|hevc|webm|m4v)$/i.test(e.entryName),
            );
            if (!videoEntry) {
              errors.push({ file: name, error: "No video track found" });
              continue;
            }
            const data = videoEntry.getData();
            const vidExtMatch = /\.[^.]+$/.exec(videoEntry.entryName);
            const vidExt = vidExtMatch ? vidExtMatch[0].toLowerCase() : ".mp4";
            const base = path.parse(name).name;
            const outPath = path.join(dir, `${base}${vidExt}`);
            await writeFile(outPath, data);
            extracted += 1;
          } catch (err) {
            errors.push({
              file: name,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        return { success: true, processed, extracted, errors };
      } catch (err) {
        errors.push({
          file: dir,
          error: err instanceof Error ? err.message : String(err),
        });
        return { success: false, processed, extracted, errors };
      }
    },
  );
  // Get livp- temp usage summary
  ipcMain.handle(
    "get-livp-temp-usage",
    async (): Promise<{
      success: boolean;
      totalBytes: number;
      count: number;
      items: { path: string; bytes: number }[];
    }> => {
      const base = tmpdir();
      let totalBytes = 0;
      let count = 0;
      const items: { path: string; bytes: number }[] = [];
      let dirents: Array<{ name: string; isDirectory?: () => boolean }> = [];
      try {
        dirents = (await readdir(base, {
          withFileTypes: true,
        } as any)) as unknown as Array<{
          name: string;
          isDirectory?: () => boolean;
        }>;
      } catch {
        return { success: true, totalBytes: 0, count: 0, items: [] };
      }
      for (const d of dirents) {
        if (!d.isDirectory?.()) continue;
        const name: string = d.name;
        if (!name.startsWith("livp-")) continue;
        const full = path.join(base, name);
        const bytes = await safeDirSize(full);
        items.push({ path: full, bytes });
        totalBytes += bytes;
        count += 1;
      }
      return { success: true, totalBytes, count, items };
    },
  );

  // Clean livp- temp directories
  ipcMain.handle(
    "clean-livp-temp",
    async (): Promise<{
      success: boolean;
      freedBytes: number;
      removedCount: number;
    }> => {
      const base = tmpdir();
      let removedCount = 0;
      let freedBytes = 0;
      let dirents: Array<{ name: string; isDirectory?: () => boolean }> = [];
      try {
        dirents = (await readdir(base, {
          withFileTypes: true,
        } as any)) as unknown as Array<{
          name: string;
          isDirectory?: () => boolean;
        }>;
      } catch {
        return { success: true, freedBytes: 0, removedCount: 0 };
      }
      for (const d of dirents) {
        if (!d.isDirectory?.()) continue;
        const name: string = d.name;
        if (!name.startsWith("livp-")) continue;
        const full = path.join(base, name);
        const bytes = await safeDirSize(full);
        try {
          // Try rm if available
          await rm(full, { recursive: true, force: true });
          removedCount += 1;
          freedBytes += bytes;
        } catch {
          // ignore deletion errors
        }
      }
      return { success: true, freedBytes, removedCount };
    },
  );
};

// Register custom protocol for serving local video files
const registerLocalVideoProtocol = () => {
  protocol.handle("local-video", (request) => {
    const url = request.url.substring(25); // Remove 'local-video://file?path=' prefix
    const decodedPath = decodeURIComponent(url);

    // Security check: ensure the file exists and is a video file
    if (existsSync(decodedPath)) {
      const ext = path.extname(decodedPath).toLowerCase();
      const videoExtensions = [
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".webm",
        ".flv",
        ".wmv",
      ];

      if (videoExtensions.includes(ext)) {
        // Create a readable stream from the file
        const fileStream = createReadStream(decodedPath);

        // Determine the MIME type based on file extension
        const mimeTypes: { [key: string]: string } = {
          ".mp4": "video/mp4",
          ".avi": "video/x-msvideo",
          ".mov": "video/quicktime",
          ".mkv": "video/x-matroska",
          ".webm": "video/webm",
          ".flv": "video/x-flv",
          ".wmv": "video/x-ms-wmv",
        };

        const mimeType = mimeTypes[ext] || "application/octet-stream";

        // Return the file stream with appropriate headers
        return new Response(fileStream as unknown as ReadableStream, {
          headers: {
            "Content-Type": mimeType,
            "Accept-Ranges": "bytes",
          },
        });
      } else {
        return new Response(null, { status: 400 }); // INVALID_URL
      }
    } else {
      return new Response(null, { status: 400 }); // INVALID_URL
    }
  });
};

// Register custom protocol for serving local image files
const registerLocalImageProtocol = () => {
  protocol.handle("local-image", (request) => {
    // Expecting: local-image://file?path=<absolute%20path>
    const searchIndex = request.url.indexOf("path=");
    const encoded =
      searchIndex >= 0 ? request.url.substring(searchIndex + 5) : "";
    const decodedPath = decodeURIComponent(encoded);

    if (existsSync(decodedPath)) {
      const ext = path.extname(decodedPath).toLowerCase();
      const imageExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".bmp",
        ".svg",
        ".heic",
        ".heif",
      ];

      if (imageExtensions.includes(ext)) {
        const fileStream = createReadStream(decodedPath);

        const mimeTypes: { [key: string]: string } = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".bmp": "image/bmp",
          ".svg": "image/svg+xml",
          ".heic": "image/heic",
          ".heif": "image/heif",
        };

        const mimeType = mimeTypes[ext] || "application/octet-stream";

        return new Response(fileStream as unknown as ReadableStream, {
          headers: {
            "Content-Type": mimeType,
            "Accept-Ranges": "bytes",
          },
        });
      }
      return new Response(null, { status: 400 });
    }
    return new Response(null, { status: 400 });
  });
};

// Helper to normalize an extension string like ".jpg" or "jpg"
function normalizeExt(ext: string): string {
  if (!ext) return "";
  return ext.startsWith(".") ? ext : `.${ext}`;
}

async function safeDirSize(p: string): Promise<number> {
  try {
    const s = await stat(p);
    if (s.isFile()) return s.size;
  } catch {
    return 0;
  }
  let total = 0;
  let dirents: Array<{ name: string; isDirectory?: () => boolean }> = [];
  try {
    dirents = (await readdir(p, {
      withFileTypes: true,
    } as any)) as unknown as Array<{
      name: string;
      isDirectory?: () => boolean;
    }>;
  } catch {
    return 0;
  }
  for (const d of dirents) {
    const full = path.join(p, d.name);
    if (d.isDirectory?.()) {
      total += await safeDirSize(full);
    } else {
      try {
        const s = await stat(full);
        total += s.size;
      } catch {
        // ignore
      }
    }
  }
  return total;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  registerLocalVideoProtocol();
  registerLocalImageProtocol();
  createWindow();
  setupIpcHandlers();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
