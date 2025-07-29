# Live Photo Demo - LivePhotosKit JS

A comprehensive demonstration of Apple's LivePhotosKit JS library for playing Live Photos on the web.

## 🎬 Features

- **Upload Your Own Live Photos**: Select JPG and MOV file pairs from your device
- **Multiple Implementation Examples**: Declarative HTML and JavaScript API approaches
- **Interactive Controls**: Play, pause, stop, toggle, and seek functionality
- **Event Handling Demo**: Real-time event logging and error handling
- **Playback Styles**: Demonstration of HINT and FULL playback modes
- **Cross-Platform Support**: Works on iOS, macOS, Android, and Windows browsers

## 🚀 Quick Start

1. Open `index.html` in a web browser
2. Upload your Live Photo files (JPG photo + MOV video)
3. Explore the different demo examples
4. Test the interactive controls

## 📱 How to Get Live Photos

### From iOS Device
1. Take Live Photos using your iPhone or iPad camera
2. Export using one of the methods below

### macOS Export
1. Connect your iOS device to your Mac
2. Import photos into the Photos application
3. Select the Live Photo you want to export
4. Use **File → Export → Export Unmodified Original**

### Windows 10 Export
1. Install iTunes for Windows
2. Connect your iOS device to your PC
3. Open File Explorer (Windows Key + E)
4. Navigate to: **Your Device → Internal Storage → DCIM**
5. Copy both the JPG and MOV files to your computer

### File Structure
Live Photos consist of two files:
- **JPG file**: The still photo
- **MOV file**: The video component (moments before and after the photo)

## 🛠️ Technical Implementation

### Declarative HTML Approach
```html
<div 
    data-live-photo
    data-photo-src="photo.jpg"
    data-video-src="video.mov"
    style="width: 320px; height: 320px">
</div>
```

### JavaScript API Approach
```javascript
const player = LivePhotosKit.Player();
player.photoSrc = 'photo.jpg';
player.videoSrc = 'video.mov';
player.play();
```

### Event Handling
```javascript
player.addEventListener('canplay', evt => console.log('ready'));
player.addEventListener('error', evt => console.log('error', evt));
player.addEventListener('ended', evt => console.log('finished'));
```

## 🌐 Browser Compatibility

| Platform | Supported Browsers |
|----------|-------------------|
| iOS | Safari, Chrome |
| macOS | Safari, Chrome, Firefox |
| Android | Chrome (beta) |
| Windows | Chrome, Firefox, Edge, IE 11 |

## 📚 LivePhotosKit JS Documentation

- **CDN**: `https://cdn.apple-livephotoskit.com/lpk/1/livephotoskit.js`
- **NPM**: `npm install --save livephotoskit`
- **Official Docs**: https://developer.apple.com/documentation/livephotoskitjs

## 🎯 Demo Sections

1. **Upload Section**: Upload and preview your own Live Photos
2. **Declarative HTML**: Simple HTML-based implementation
3. **JavaScript API**: Programmatic control and manipulation
4. **Event Handling**: Comprehensive event logging and error handling
5. **Playback Styles**: Different playback modes (HINT vs FULL)

## ⚡ Performance Tips

- Downsize large assets to improve performance and reduce bandwidth
- Use `data-proactively-loads-video="false"` to control video preloading
- Specify explicit width and height for better loading experience
- Consider using placeholder images while assets load

## 🔧 Customization

The demo includes:
- Responsive design for mobile and desktop
- Modern CSS with gradients and animations
- Comprehensive error handling
- Real-time status updates
- Interactive control panels

## 📖 API Reference

### Player Methods
- `play()`: Start playback
- `pause()`: Pause playback
- `stop()`: Stop and reset playback
- `toggle()`: Toggle play/pause state

### Player Properties
- `photoSrc`: URL to the JPG photo
- `videoSrc`: URL to the MOV video
- `currentTime`: Current playback position
- `duration`: Total duration of the Live Photo
- `playbackStyle`: HINT or FULL playback mode

### Events
- `canplay`: Player is ready for playback
- `error`: Loading or playback error occurred
- `ended`: Playback completed
- `videoload`: Video component loaded
- `photoload`: Photo component loaded

## 📄 License

This project is open source and available under the [MIT License](LICENSE).