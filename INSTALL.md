# Stock Portfolio Manager - Installation Guide

## For End Users (Windows)

### Option 1: Installer (Recommended)

1. Download `StockPortfolioManager-Setup-1.0.0.exe` from the releases
2. Double-click the installer
3. Follow the installation wizard
4. Choose installation directory (default: `C:\Program Files\Stock Portfolio Manager`)
5. Create desktop shortcut (recommended)
6. Click Install
7. Launch from desktop shortcut or Start Menu

### Option 2: Portable Version

1. Download `StockPortfolioManager-Portable-1.0.0.exe`
2. Place it in any folder
3. Double-click to run (no installation needed)
4. All data stored in `%APPDATA%\stock-portfolio-manager`

### First Run

1. The app will create a demo user automatically
2. Login credentials:
   - Username: `demo`
   - Password: `demo123`
3. Change password in Settings after first login

---

## For Developers

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 8+
- Git

### Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd portfolio-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   
   **Windows:**
   ```bash
   launch.bat
   ```
   
   **Or manually:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - The Electron window will open automatically
   - React dev server runs on http://localhost:3000

### Building Installers

#### Build for Windows

**NSIS Installer:**
```bash
npm run react-build
npm run electron-pack -- --win nsis
```

Output: `dist/StockPortfolioManager-Setup-1.0.0.exe`

**Portable Version:**
```bash
npm run react-build
npm run electron-pack -- --win portable
```

Output: `dist/StockPortfolioManager-Portable-1.0.0.exe`

**Both:**
```bash
npm run dist
```

#### Build for macOS

```bash
npm run react-build
npm run electron-pack -- --mac
```

Output: `dist/StockPortfolioManager-1.0.0.dmg`

#### Build for Linux

```bash
npm run react-build
npm run electron-pack -- --linux
```

Output: `dist/StockPortfolioManager-1.0.0.AppImage`

### Build All Platforms

```bash
npm run dist
```

This creates installers for all platforms in the `dist/` folder.

---

## Project Structure

```
portfolio-manager/
├── src/
│   ├── main/           # Electron main process
│   ├── components/     # React components
│   ├── pages/          # React pages
│   └── utils/          # Utilities
├── public/             # Static assets
├── build/              # React build output
├── dist/               # Electron installers
├── launch.bat          # Windows launcher
└── package.json        # Dependencies
```

---

## Development Scripts

```bash
# Development
npm run dev              # Start dev server + Electron
npm run react-dev        # Start React dev server only
npm run electron-dev     # Start Electron only

# Building
npm run react-build      # Build React app
npm run electron-pack    # Package Electron app
npm run dist             # Create installers

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
npm run format           # Format code with Prettier

# Utilities
npm run clean            # Clean build artifacts
```

---

## Troubleshooting

### "Node.js not found"
Install Node.js from https://nodejs.org/ (LTS version recommended)

### "npm install fails"
1. Delete `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again

### "Electron window is blank"
1. Check if React dev server is running on port 3000
2. Try `npm run clean` then `npm run dev`

### "Database errors"
1. Close the application
2. Delete database: `%APPDATA%\stock-portfolio-manager\portfolio.db`
3. Restart the app (creates fresh database)

### "Build fails"
1. Ensure all dependencies are installed: `npm install`
2. Build React first: `npm run react-build`
3. Then build Electron: `npm run electron-pack`

---

## System Requirements

### Minimum
- Windows 10 / macOS 10.14 / Ubuntu 18.04
- 4 GB RAM
- 500 MB disk space
- 1280x720 display

### Recommended
- Windows 11 / macOS 12+ / Ubuntu 22.04
- 8 GB RAM
- 1 GB disk space
- 1920x1080 display

---

## Data Location

All data is stored locally:

**Windows:**
```
C:\Users\<YourName>\AppData\Roaming\stock-portfolio-manager\
├── portfolio.db        # SQLite database
└── logs/              # Application logs
```

**macOS:**
```
~/Library/Application Support/stock-portfolio-manager/
├── portfolio.db
└── logs/
```

**Linux:**
```
~/.config/stock-portfolio-manager/
├── portfolio.db
└── logs/
```

---

## Uninstallation

### Windows (Installer)
1. Go to Settings > Apps > Installed Apps
2. Find "Stock Portfolio Manager"
3. Click Uninstall

### Windows (Portable)
1. Delete the executable file
2. Optionally delete data folder: `%APPDATA%\stock-portfolio-manager`

### macOS
1. Drag app from Applications to Trash
2. Optionally delete: `~/Library/Application Support/stock-portfolio-manager`

### Linux
1. Delete the AppImage file
2. Optionally delete: `~/.config/stock-portfolio-manager`

---

## Support

For issues and questions:
- Check the documentation in `docs/` folder
- Review `STOCK_IMPORT_GUIDE.md` for stock import help
- Check existing issues on GitHub
- Create a new issue with details

---

## License

MIT License - See LICENSE.txt for details
