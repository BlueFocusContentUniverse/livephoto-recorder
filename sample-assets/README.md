# Sample Live Photo Assets

This folder is where you can place sample Live Photo assets for testing the demo.

## 📁 Expected File Structure

For each Live Photo, you need two files:
- `photo-name.jpg` - The still photo component
- `photo-name.mov` - The video component

## 🎯 Example Files

```
sample-assets/
├── sunset.jpg
├── sunset.mov
├── beach.jpg
├── beach.mov
└── README.md (this file)
```

## 📱 How to Get Live Photo Files

### From iOS Device to Windows:
1. Connect your iPhone/iPad to your PC
2. Open File Explorer
3. Navigate to: **Your Device → Internal Storage → DCIM**
4. Look for paired files (same name, different extensions)
5. Copy both JPG and MOV files to this folder

### From iOS Device to Mac:
1. Connect your device to Mac
2. Open Photos app
3. Select your Live Photo
4. **File → Export → Export Unmodified Original**
5. Copy both files to this folder

## 🔧 Using in Demo

1. Place your Live Photo files in this folder
2. Open the demo page (`index.html`)
3. Use the upload section to select your JPG and MOV files
4. Watch your Live Photo come to life on the web!

## 📐 Optimization Tips

- **File Size**: Large files take longer to load. Consider resizing for web use.
- **Resolution**: 320x320 to 640x640 pixels work well for most demos
- **Format**: JPG for photos, MOV for videos (as exported from iOS)

## 🎨 Testing Files

If you don't have Live Photos, you can create test files:
- Any JPG image for the photo component
- Any short MOV video (2-3 seconds) for the video component
- They don't need to be a real Live Photo pair for basic testing

The demo will work with any compatible JPG/MOV combination!
