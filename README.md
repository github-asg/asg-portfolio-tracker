# Stock Portfolio Manager

A fully offline desktop application for managing stock portfolios for Indian retail investors. Track your investments, calculate capital gains, and monitor real-time prices through ICICI Breeze API integration.

## Features

- 📊 **Portfolio Management**: Track stocks, transactions, and real-time prices
- 💰 **Capital Gains Calculation**: Automated FIFO-based STCG/LTCG calculations
- 📈 **Real-time Prices**: Integration with ICICI Breeze API for live BSE prices
- 📑 **Tax Reporting**: Generate financial year-based capital gains reports
- 🔒 **Complete Privacy**: All data stored locally, no cloud sync
- 🇮🇳 **Indian Market Support**: BSE integration, Indian number formatting, FY calculations

## Screenshots

[Add screenshots here]

## System Requirements

- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.14 (Mojave) or later
- **RAM**: Minimum 4GB
- **Disk Space**: 200MB free space

## Installation

### Option 1: Download Pre-built Binary (Recommended)

1. Download the latest release from the [Releases](../../releases) page
2. **Windows**: Run the `.exe` installer or extract the portable `.zip`
3. **macOS**: Open the `.dmg` file and drag the app to Applications

### Option 2: Build from Source

#### Prerequisites

- Node.js v18+ (LTS recommended)
- npm v8+
- Git

#### Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd portfolio-manager
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm run electron-pack
```

5. Create distributable:
```bash
npm run dist
```

The distributable files will be in the `dist/` folder.

## Quick Start

### First Time Setup

1. **Launch the application**
2. **Create your account**: Set up a username and password (stored locally)
3. **Configure ICICI Breeze API** (optional but recommended for live prices):
   - Go to Settings → API Configuration
   - Enter your ICICI Breeze credentials:
     - App Key
     - Secret Key
     - API Session Token
   - Test the connection
4. **Add your first transaction**: Go to Transactions and add a buy/sell transaction

### Adding Transactions

1. Navigate to **Transactions** page
2. Click **Add Transaction**
3. Search for stock using BSE Scrip Master (12,000+ stocks)
4. Enter transaction details:
   - Type: Buy or Sell
   - Date
   - Quantity
   - Price per share
5. Save transaction

### Viewing Portfolio

1. Navigate to **Portfolio** page
2. View your holdings with:
   - Current value
   - Unrealized gains/losses
   - Sector breakdown
   - Top gainers/losers
3. Click **Refresh Prices** to update with latest BSE prices

### Generating Tax Reports

1. Navigate to **Reports** page
2. Select financial year (April-March)
3. View STCG/LTCG calculations
4. Export report for tax filing

## Configuration

### ICICI Breeze API Setup

To get live stock prices, you need ICICI Breeze API credentials:

1. Open an account with ICICI Direct
2. Subscribe to Breeze API service
3. Get your credentials from ICICI Direct portal:
   - App Key
   - Secret Key
   - API Session Token
4. Enter credentials in Settings → API Configuration

### Database Location

All data is stored locally in SQLite database:
- **Windows**: `%APPDATA%/stock-portfolio-manager/userData/`
- **macOS**: `~/Library/Application Support/stock-portfolio-manager/userData/`

## Technology Stack

- **Frontend**: React 18
- **Backend**: Electron (Node.js)
- **Database**: SQLite3
- **API**: ICICI Breeze API
- **Charts**: Recharts
- **Styling**: CSS3

## Project Structure

```
portfolio-manager/
├── src/
│   ├── main/              # Electron main process
│   │   ├── api/          # Breeze API integration
│   │   ├── database/     # SQLite database
│   │   └── main.js       # Main entry point
│   ├── components/        # React components
│   ├── pages/            # Application pages
│   └── utils/            # Utility functions
├── public/               # Static assets
├── build/                # Build output
└── dist/                 # Distribution packages
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run electron-dev     # Start Electron in dev mode

# Building
npm run build            # Build React app
npm run electron-pack    # Package Electron app
npm run dist             # Create installers

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Check code style
npm run lint:fix         # Auto-fix style issues
```

### Building Portable App

To create a portable version that doesn't require installation:

```bash
npm run dist
```

The portable version will be in `dist/win-unpacked/` (Windows) or `dist/mac/` (macOS).

## Indian Market Specifics

- **Financial Year**: April 1 to March 31
- **Tax Rules**: 
  - STCG: 15% (Short-term Capital Gains)
  - LTCG: 10% above ₹1 lakh exemption (Long-term Capital Gains)
- **Number Formatting**: Indian numbering system (lakhs/crores)
- **Market Hours**: 9:15 AM - 3:30 PM IST
- **Exchange**: BSE (Bombay Stock Exchange)

## Security & Privacy

- ✅ All data stored locally on your machine
- ✅ No cloud sync or external data transmission
- ✅ Passwords hashed with bcrypt
- ✅ API credentials encrypted with AES-256
- ✅ No analytics or tracking
- ✅ Complete offline functionality (except API price updates)

## Troubleshooting

### App won't start
- Ensure you have the required system version
- Try running as administrator (Windows) or with proper permissions (macOS)
- Check logs in `%APPDATA%/stock-portfolio-manager/logs/` (Windows) or `~/Library/Logs/stock-portfolio-manager/` (macOS)

### Prices not updating
- Verify ICICI Breeze API credentials in Settings
- Check your internet connection
- Ensure market is open (9:15 AM - 3:30 PM IST, Mon-Fri)
- Try clicking "Refresh Prices" manually

### Database issues
- Backup your database file from userData folder
- Delete the database and restart the app (will create fresh database)
- Restore from backup if needed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is provided for informational purposes only. It does not constitute financial advice. Always consult with a qualified financial advisor before making investment decisions. The developers are not responsible for any financial losses incurred through the use of this software.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions

## Acknowledgments

- ICICI Direct for Breeze API
- BSE for stock data
- React and Electron communities

---

**Made with ❤️ for Indian retail investors**
