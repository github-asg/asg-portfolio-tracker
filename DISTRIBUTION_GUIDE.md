# Distribution Guide - v1.0.0

## What Files to Share with Users

### ✅ Required File (Users MUST have this)

**`Stock Portfolio Manager Setup 1.0.0.exe`**
- This is the ONLY file users need to install the application
- Size: ~150-200 MB
- Contains everything needed to run the app
- Users double-click this file to install

### ❌ Optional Files (NOT required for users)

The following files in the `dist/` folder are **NOT needed** by end users:

1. **`latest.yml`**
   - Purpose: Auto-update metadata
   - Only needed if you implement auto-update server
   - Users don't need this file

2. **`Stock Portfolio Manager Setup 1.0.0.exe.blockmap`**
   - Purpose: Delta updates (incremental updates)
   - Only needed for auto-update system
   - Users don't need this file

3. **`builder-debug.yml`** and **`builder-effective-config.yaml`**
   - Purpose: Build configuration debug info
   - Only for developers
   - Users don't need these files

4. **`win-unpacked/` folder**
   - Purpose: Unpacked application files
   - Used during build process
   - Users don't need this folder

## Distribution Methods

### Method 1: Direct Download (Recommended)
1. Upload only `Stock Portfolio Manager Setup 1.0.0.exe` to your distribution platform
2. Provide download link to users
3. Users download and run the installer

**Platforms:**
- Google Drive
- Dropbox
- OneDrive
- Your own website
- GitHub Releases

### Method 2: GitHub Releases
If using GitHub:
1. Create a new release (v1.0.0)
2. Upload `Stock Portfolio Manager Setup 1.0.0.exe` as release asset
3. Optionally upload `RELEASE_NOTES_v1.0.0.md` for documentation
4. Users download from GitHub Releases page

### Method 3: Website Download
If you have a website:
1. Upload `Stock Portfolio Manager Setup 1.0.0.exe` to your web server
2. Create a download page with:
   - Download button/link
   - System requirements
   - Installation instructions
   - Release notes

## What to Include with Distribution

### Essential
- ✅ `Stock Portfolio Manager Setup 1.0.0.exe` (installer)

### Recommended Documentation
- ✅ `RELEASE_NOTES_v1.0.0.md` (what's new, features, known issues)
- ✅ `README.md` (how to use the app)
- ✅ `MULTI_USER_GUIDE.md` (multi-user setup guide)

### Optional
- `LICENSE.txt` (if open source)
- Installation guide
- User manual
- Screenshots

## Installation Instructions for Users

Share these instructions with your users:

### Step 1: Download
Download `Stock Portfolio Manager Setup 1.0.0.exe` from [your distribution link]

### Step 2: Run Installer
1. Double-click the downloaded file
2. Windows may show a security warning - click "More info" then "Run anyway"
3. Follow the installation wizard

### Step 3: Choose Installation Location
- Default: `C:\Program Files\Stock Portfolio Manager\`
- Or choose custom location

### Step 4: Select Shortcuts
- Desktop shortcut (recommended)
- Start Menu shortcut (recommended)

### Step 5: Install
- Click "Install" button
- Wait for installation to complete
- Click "Finish"

### Step 6: Launch
- Double-click desktop shortcut, or
- Search "Stock Portfolio Manager" in Start Menu

### Step 7: First Time Setup
1. Click "Sign Up" to create your account
2. Enter username and password
3. Start adding transactions!

## File Size Information

- **Installer**: ~150-200 MB
- **Installed Size**: ~300-400 MB
- **Database**: Grows with usage (typically 10-50 MB)

## System Requirements

Share these with users:

- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Disk Space**: 500 MB free space
- **Display**: 1280x720 minimum resolution
- **Internet**: Required only for price updates via API

## Security Notes for Users

### Windows SmartScreen Warning
Users may see "Windows protected your PC" warning because the app is not code-signed.

**How to bypass:**
1. Click "More info"
2. Click "Run anyway"

**Why this happens:**
- Code signing certificates cost $300-500/year
- This is a free/personal distribution
- The app is safe - no malware

**Future solution:**
- Purchase code signing certificate
- Sign the installer
- No more warnings

## Auto-Update Setup (Optional)

If you want to implement auto-updates in the future:

### What You Need
1. A server to host update files
2. Upload these files to server:
   - `Stock Portfolio Manager Setup 1.0.0.exe`
   - `latest.yml`
   - `Stock Portfolio Manager Setup 1.0.0.exe.blockmap`

### How It Works
- App checks server for `latest.yml`
- Compares version numbers
- Downloads update if available
- Uses blockmap for delta updates (faster)

### For v1.0.0
- Auto-update not implemented yet
- Users manually download new versions
- Can be added in future release

## Checksums for Security

To verify file integrity, provide checksums:

### Generate Checksums
```bash
# SHA256
certutil -hashfile "Stock Portfolio Manager Setup 1.0.0.exe" SHA256

# MD5
certutil -hashfile "Stock Portfolio Manager Setup 1.0.0.exe" MD5
```

### Share with Users
Include checksums in release notes so users can verify download integrity.

## Distribution Checklist

Before distributing to users:

- [ ] Test installer on clean Windows machine
- [ ] Verify app launches correctly
- [ ] Test all core features
- [ ] Create user documentation
- [ ] Generate checksums
- [ ] Upload installer to distribution platform
- [ ] Create download page/link
- [ ] Share installation instructions
- [ ] Provide support contact info

## Support Information

Include support info with distribution:

- **Issues**: [GitHub Issues link or email]
- **Documentation**: [Link to docs]
- **Updates**: [Where to check for updates]
- **Contact**: [Your email or support channel]

## Summary

### For End Users - Share Only:
1. `Stock Portfolio Manager Setup 1.0.0.exe` ← **This is all they need!**
2. `RELEASE_NOTES_v1.0.0.md` (optional, for reference)
3. Installation instructions

### For Developers - Keep These:
- All other files in `dist/` folder
- Source code
- Build configuration
- Development documentation

### The .yml Files
- **NOT needed** by end users
- Only needed if you set up auto-update server
- Keep them for future use
- Don't distribute to users

---

**Bottom Line:** Users only need the `.exe` installer file. Everything else is optional or for developers only.

