# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-02-17

### Added
- Initial release of Stock Portfolio Manager
- Portfolio management with real-time tracking
- BSE Scrip Master integration (12,000+ stocks)
- ICICI Breeze API integration for live prices
- Transaction management (Buy/Sell)
- FIFO-based capital gains calculation
- STCG/LTCG tax calculations
- Financial year-based reporting
- Sector-wise portfolio breakdown
- Top gainers and losers analysis
- Indian number formatting (lakhs/crores)
- Offline-first architecture
- Local SQLite database
- Encrypted API credential storage
- Auto-refresh prices after market close (4 PM)
- Responsive UI with loading indicators
- Portfolio summary with unrealized gains
- Holdings table with BSE data integration
- Price caching for offline access

### Features
- **Authentication**: Secure local login with bcrypt password hashing
- **Portfolio Dashboard**: 
  - Total investment and current value
  - Unrealized gains/losses
  - Holdings breakdown
  - Sector analysis
- **Transactions**: 
  - Add/edit/delete transactions
  - BSE stock search with autocomplete
  - Transaction history
- **Reports**: 
  - Capital gains by financial year
  - STCG/LTCG breakdown
  - Tax estimation
- **Settings**: 
  - ICICI Breeze API configuration
  - Application preferences
- **Price Management**: 
  - Manual price refresh
  - Automatic fallback to previous trading day
  - Price data date display

### Technical
- Built with Electron + React
- SQLite3 for local data storage
- Recharts for data visualization
- AES-256 encryption for API credentials
- Windows and macOS support

### Known Issues
- None reported

## [Unreleased]

### Planned
- Export portfolio to Excel/CSV
- Import transactions from CSV
- Multiple portfolio support
- Dividend tracking
- Stock split handling
- Bonus share tracking
- Advanced filtering and sorting
- Dark mode
- Backup and restore functionality

---

For older versions, see [releases](../../releases).
