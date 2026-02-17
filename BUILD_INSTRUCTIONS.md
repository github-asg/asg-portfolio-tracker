# Build Instructions for Stock Portfolio Manager

## Quick Build (Windows)

Simply run the build script:
```bash
build-dist.bat
```

This will:
1. Install all dependencies
2. Build the React application
3. Create distributable packages

## Manual Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build React App
```bash
npm run build
```

### 3. Create Distributables
```bash
npm run dist
```

## Output Files

After building, you'll find the following in the `dist/` folder:

### Windows
- **Portable App**: `Stock Portfolio Manager.exe` (single executable, no installation needed)
- **Installer**: `Stock Portfolio Manager Setup.exe` (NSIS installer)
- **Zip Archive**: `Stock Portfolio Manager-win.zip` (portable version in zip)

### macOS (if building on Mac)
- **DMG**: `Stock Portfolio Manager.dmg` (drag-and-drop installer)
- **App Bundle**: `Stock Portfolio Manager.app`

## Portable App Usage

The portable version (`Stock Portfolio Manager.exe`) can be:
- Run directly without installation
- Copied to a USB drive
- Moved to any folder
- Run from network drives

**Note**: User data will be stored in:
- Windows: `%APPDATA%/stock-portfolio-manager/`
- macOS: `~/Library/Application Support/stock-portfolio-manager/`

## Distribution

### For End Users
1. Share the portable `.exe` file for Windows
2. Share the `.dmg` file for macOS
3. Users can run without installation

### For Installation
1. Share the `Setup.exe` installer for Windows
2. Share the `.dmg` installer for macOS
3. Users install like any other application

## File Sizes (Approximate)
- Portable EXE: ~150-200 MB
- Installer: ~150-200 MB
- Zip archive: ~140-180 MB

## Troubleshooting Build Issues

### Issue: "npm install" fails
**Solution**: 
- Ensure Node.js v18+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and try again

### Issue: "npm run build" fails
**Solution**:
- Check for syntax errors in code
- Ensure all dependencies are installed
- Check console for specific error messages

### Issue: "npm run dist" fails
**Solution**:
- Ensure `npm run build` completed successfully
- Check that `build/` folder exists
- Verify electron-builder.json is valid
- On Windows, run as administrator if permission issues

### Issue: Antivirus blocks the build
**Solution**:
- Temporarily disable antivirus during build
- Add project folder to antivirus exclusions
- The built app is not signed, which may trigger warnings

## Code Signing (Optional)

For production releases, consider code signing:

### Windows
1. Obtain a code signing certificate
2. Add to electron-builder.json:
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

### macOS
1. Enroll in Apple Developer Program
2. Add to electron-builder.json:
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

## Git Workflow

### Before Committing
```bash
# Check what will be committed
git status

# Add files
git add .

# Commit with message
git commit -m "Initial release v1.0.0"

# Push to remote
git push origin main
```

### Creating a Release
```bash
# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tags
git push origin v1.0.0
```

## Next Steps

1. Build the distributables using `build-dist.bat`
2. Test the portable app on a clean Windows machine
3. Commit code to Git
4. Create a GitHub release with the binaries
5. Share with users!

## Support

For build issues, check:
- Node.js version: `node --version` (should be v18+)
- npm version: `npm --version` (should be v8+)
- Electron builder logs in `dist/` folder
