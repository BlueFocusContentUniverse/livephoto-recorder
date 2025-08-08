# LivePhoto Recorder

An Electron application for playing and recording LivePhoto content with desktop capture functionality.

## Features

- **LivePhoto Playback**: Play LivePhoto content using LivePhotosKit
- **Desktop Capture Recording**: Record the LivePhoto player content for 5 seconds
- **Cross-platform**: Works on Windows, macOS, and Linux

## Desktop Capture Recording

The application includes a desktop capture feature that allows you to record the LivePhoto player content for 5 seconds. This feature uses Electron's `desktopCapturer` API to capture the window content and save it as a video file.

### How to Use

1. Load a LivePhoto by selecting both image and video files
2. Click the "Record 5s Video" button to start recording
3. The recording will automatically stop after 5 seconds
4. The video file will be saved to your system's Videos folder
5. You can also manually stop the recording using the "Stop Recording" button

### Technical Details

- **Recording Format**: WebM with VP9 codec
- **Duration**: 5 seconds (configurable)
- **Output Location**: System Videos folder
- **File Naming**: `livephoto-recording-{timestamp}.webm`

### Requirements

- Electron 20+ (for desktopCapturer API)
- Node.js 16+
- LivePhotosKit for LivePhoto playback

## Development

### Installation

```bash
npm install
```

### Running the Application

```bash
npm run dev
```

### Building

```bash
npm run build
```

## Architecture

The desktop capture functionality is implemented using:

1. **Preload Script** (`src/main/preload.ts`): Exposes IPC methods to the renderer process
2. **Main Process** (`src/main/main.ts`): Handles desktop capture using `desktopCapturer` and `MediaRecorder`
3. **Renderer Process** (`src/renderer/components/LivePhotoPlayer.tsx`): UI for triggering recordings and displaying status

### IPC Communication

- `start-recording`: Initiates desktop capture recording
- `stop-recording`: Manually stops recording
- `recording-complete`: Sent when recording is finished and file is saved
- `recording-error`: Sent when recording encounters an error

## Security Considerations

- Context isolation is enabled
- Node integration is disabled
- Only necessary APIs are exposed through the preload script
- File saving is restricted to the system Videos folder

## Environment Configuration

This app uploads recordings to an S3-compatible OSS. Configure credentials via a `.env` file at the project root. A sample template is provided in `.env.template`.

Required keys:

```
S3_ENDPOINT=https://minio.example.com:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
```

Steps:
- Copy `.env.template` to `.env`
- Fill in your values
- Restart the app so the main process reloads environment variables.