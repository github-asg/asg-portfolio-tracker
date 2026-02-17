# Creating Icons for Stock Portfolio Manager

The build currently works without icons, but if you want to add them later:

## Required Icon Files

- `assets/icon.ico` - Windows icon (256x256, .ico format)
- `assets/icon.icns` - macOS icon (512x512, .icns format)
- `assets/icon.png` - Linux icon (512x512, .png format)

## How to Create Icons

### Option 1: Online Icon Converter
1. Create a 512x512 PNG image with your logo
2. Use online converters:
   - **ICO**: https://convertio.co/png-ico/
   - **ICNS**: https://convertio.co/png-icns/

### Option 2: Use Electron Icon Maker
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=icon.png --output=assets/
```

### Option 3: Manual Creation
1. Design a 512x512 PNG logo
2. Use GIMP, Photoshop, or similar to create:
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)

## Adding Icons Back to Build

Once you have the icon files, update `package.json`:

```json
"mac": {
  "icon": "assets/icon.icns"
},
"win": {
  "icon": "assets/icon.ico"
},
"nsis": {
  "installerIcon": "assets/icon.ico",
  "uninstallerIcon": "assets/icon.ico",
  "installerHeaderIcon": "assets/icon.ico"
}
```

## Temporary Solution

For now, the build works without icons. The app will use default Electron icons until you add custom ones.

## Icon Design Suggestions

For a stock portfolio manager:
- 📊 Chart/graph symbol
- 💰 Currency symbol (₹)
- 📈 Trending up arrow
- 🏦 Building/bank icon
- 📋 Portfolio/document icon

Keep it simple and recognizable at small sizes (16x16, 32x32).