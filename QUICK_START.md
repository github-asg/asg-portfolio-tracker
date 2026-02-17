# Quick Start Guide

## For End Users (Windows)

### Method 1: Using the Launcher (Easiest)

1. **Download the project files**
2. **Double-click `launch.bat`**
3. Wait for dependencies to install (first time only)
4. The app will open automatically
5. Login with:
   - Username: `demo`
   - Password: `demo123`

That's it! The launcher handles everything automatically.

### Method 2: Using the Installer

1. **Build the installer:**
   - Double-click `build-release.bat`
   - Wait for build to complete
   - Find installer in `dist\` folder

2. **Install:**
   - Run `StockPortfolioManager-Setup-1.0.0.exe`
   - Follow installation wizard
   - Launch from desktop shortcut

### Method 3: Portable Version

1. Build using `build-release.bat`
2. Copy `StockPortfolioManager-Portable-1.0.0.exe` to any folder
3. Double-click to run (no installation needed)

---

## First Steps After Login

### 1. Change Password
- Go to Settings → Application Settings
- Change from default `demo123` password

### 2. Add Stocks (Optional)
If you have a stock list with ISIN numbers:

```bash
# Create template
node import-stocks.js template my-stocks.csv

# Edit the CSV file with your stocks

# Import
node import-stocks.js import my-stocks.csv
```

See [STOCK_IMPORT_GUIDE.md](STOCK_IMPORT_GUIDE.md) for details.

### 3. Add Your First Transaction

1. Click **Transactions** in the sidebar
2. Click **Add Transaction**
3. Fill in:
   - Stock symbol (e.g., RELIANCE)
   - Transaction type (BUY/SELL)
   - Quantity
   - Price
   - Date
4. Click **Save**

### 4. View Portfolio

1. Click **Dashboard** in the sidebar
2. See your portfolio summary
3. View gains/losses
4. Check sector allocation

### 5. Generate Reports

1. Click **Reports** in the sidebar
2. Select financial year
3. View STCG/LTCG breakdown
4. Export to PDF/Excel/CSV

---

## Common Tasks

### Import Stock Master Data

```bash
node import-stocks.js import stocks.xlsx
```

### Export Current Stocks

```bash
node import-stocks.js export current-stocks.csv
```

### Clear Database (Start Fresh)

1. Close the application
2. Delete: `%APPDATA%\stock-portfolio-manager\portfolio.db`
3. Restart the app

### Update Stock ISIN Numbers

1. Export current stocks
2. Add ISIN column in Excel
3. Import updated file

---

## Troubleshooting

### "Node.js not found"
- Install from https://nodejs.org/ (LTS version)

### "npm install fails"
- Delete `node_modules` folder
- Run `launch.bat` again

### "Blank window"
- Wait 30 seconds for React dev server to start
- Check if port 3000 is available

### "Database locked"
- Close all instances of the app
- Wait 5 seconds
- Try again

---

## Development Mode vs Production

**Development Mode** (launch.bat):
- Hot reload enabled
- React dev server on port 3000
- Detailed error messages
- Slower startup

**Production Mode** (installer):
- Optimized build
- Faster startup
- Smaller size
- No dev tools

---

## Next Steps

- Read [INSTALL.md](INSTALL.md) for detailed installation
- Check [STOCK_IMPORT_GUIDE.md](STOCK_IMPORT_GUIDE.md) for stock import
- Review [README.md](README.md) for full documentation

---

## Support

Having issues? Check:
1. This guide
2. [INSTALL.md](INSTALL.md) troubleshooting section
3. Existing GitHub issues
4. Create a new issue with details

---

## Demo Credentials

**Username:** demo  
**Password:** demo123

**Important:** Change the password after first login!
