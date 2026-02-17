# Stock Portfolio Management Software - Requirements Document

## Project Overview
Build a fully offline desktop application for managing stock portfolios for Indian retail investors. The application must run locally on Windows and Mac, with data stored locally for complete privacy and offline access.

## Technology Stack Requirements

### Desktop Framework
- **Electron** - For cross-platform desktop application (Windows & Mac)
- **Node.js** - Backend runtime
- **SQLite** - Local database for storing all portfolio data
- **React** - Frontend UI framework

### Key Libraries
- **bcrypt** - For password hashing
- **electron-store** - For app configuration storage
- **axios** - For ICICI Breeze API integration
- **date-fns** - For financial year calculations
- **recharts** or **chart.js** - For portfolio visualization
- **electron-builder** - For packaging Windows and Mac installers

## Functional Requirements

### 1. User Authentication & Setup

#### First-Time Setup
- On first launch, display setup wizard
- Collect:
  - Username (login ID)
  - Password (minimum 8 characters, at least one number and special character)
  - Confirm password
- Hash password using bcrypt before storing
- Store credentials in local SQLite database
- No password recovery option (offline app) - warn users to remember credentials

#### Login Screen
- Username and password input fields
- "Login" button
- "Exit" button
- Show error message for incorrect credentials
- Maximum 5 failed attempts, then 15-minute lockout
- Auto-logout after 30 minutes of inactivity

### 2. Dashboard - Portfolio Summary

#### Main Table Display
Display all stocks in portfolio with following columns:

| Column Name | Description | Calculation |
|------------|-------------|-------------|
| Stock Name | Stock symbol (e.g., RELIANCE, TCS) | User input |
| Last Trading Price | Current market price | From ICICI Breeze API |
| Avg Cost Price | Average purchase price | Weighted average of all buy transactions |
| Quantity | Total shares owned | Sum of buy qty - Sum of sell qty |
| Qty Held >1 Year | Shares held for more than 365 days | FIFO calculation from transaction dates |
| Today's Gain % | Day's price change percentage | ((Last Price - Previous Close) / Previous Close) × 100 |
| Today's Gain (₹) | Day's absolute gain | (Last Price - Previous Close) × Quantity |
| Overall Gain % | Total return percentage | ((Last Price - Avg Cost) / Avg Cost) × 100 |
| Overall Gain (₹) | Total absolute return | (Last Price - Avg Cost) × Quantity |

#### Dashboard Features
- Refresh button to update prices from ICICI Breeze API
- Auto-refresh every 5 minutes during market hours (9:15 AM - 3:30 PM IST)
- Sort capability on all columns
- Search/filter box to find specific stocks
- Summary cards at top showing:
  - Total Portfolio Value (Current)
  - Total Investment
  - Total Gain/Loss (₹)
  - Total Gain/Loss (%)
  - Today's Total Gain/Loss

#### Visual Indicators
- Green text for positive gains
- Red text for losses
- Gray text for zero change
- Status indicator showing last price update timestamp

### 3. Transaction Management

#### Add Transaction Form
Fields required:
- **Stock Symbol** - Text input with autocomplete from existing stocks
- **Transaction Type** - Radio buttons (Buy / Sell)
- **Transaction Date** - Date picker (default: today)
- **Quantity** - Number input (positive integers only)
- **Price per Share** - Decimal input (₹)
- **Brokerage/Charges** - Optional decimal input (₹)
- **Stock Sector** - Dropdown (Technology, Banking, Pharma, FMCG, Auto, Energy, Metals, Realty, etc.)
- **Stock Category** - Dropdown (Large Cap, Mid Cap, Small Cap)
- **Notes** - Optional text area

#### Transaction Validation
- Cannot sell more shares than currently held
- Transaction date cannot be in the future
- Price and quantity must be positive numbers
- Show confirmation dialog before saving

#### Transaction History View
- Separate screen showing all transactions
- Filterable by:
  - Stock symbol
  - Date range
  - Transaction type (Buy/Sell)
- Columns: Date, Stock, Type, Quantity, Price, Total Amount, Brokerage
- Edit and Delete options for each transaction
- Export to CSV functionality

### 4. Capital Gains Calculation Engine

#### FIFO (First In First Out) Method
When selling shares:
1. Identify all buy transactions for the stock sorted by date (oldest first)
2. Match sell quantity against buy transactions in chronological order
3. Calculate gain/loss for each matched lot:
   - Short Term Capital Gain (STCG): Holding period ≤ 365 days
   - Long Term Capital Gain (LTCG): Holding period > 365 days

#### Calculation Example
```
Buy Transactions:
- Jan 1, 2024: 50 shares @ ₹25 = ₹1,250
- Jun 1, 2024: 50 shares @ ₹30 = ₹1,500

Sell Transaction:
- Dec 1, 2024: 60 shares @ ₹35

Calculation:
Lot 1: 50 shares @ ₹25 (bought Jan 1) - LTCG
  Gain = 50 × (₹35 - ₹25) = ₹500
  
Lot 2: 10 shares @ ₹30 (bought Jun 1) - STCG  
  Gain = 10 × (₹35 - ₹30) = ₹50

Total LTCG: ₹500
Total STCG: ₹50
```

#### Automated Tracking
- Maintain FIFO queue for each stock
- Update queue on every buy/sell transaction
- Store detailed breakdown in database for audit trail
- Flag any realized gains/losses

### 5. Capital Gains Report - Financial Year Based

#### Indian Financial Year
- FY format: April 1 to March 31
- Example: FY 2024-25 = April 1, 2024 to March 31, 2025

#### Report Generation
User can select:
- Financial Year (dropdown with last 10 years)
- Specific stock or "All Stocks"
- Report format (PDF / Excel / CSV)

#### Report Contents

**Section 1: Summary**
- Total STCG (₹)
- Total LTCG (₹)
- Total Realized Gains (₹)
- Total Unrealized Gains (₹)

**Section 2: Detailed Transaction Report**
For each stock with realized gains in the FY:

| Stock | Sell Date | Buy Date | Qty | Buy Price | Sell Price | Gain/Loss | Type (STCG/LTCG) |
|-------|-----------|----------|-----|-----------|------------|-----------|------------------|

**Section 3: Sector-wise Breakdown**
- Gains/losses grouped by sector
- Pie chart showing distribution

**Section 4: Tax Calculation Helper**
- STCG at 15% tax rate
- LTCG above ₹1 lakh at 10% tax rate
- Estimated tax liability

#### Export Formats
- **PDF**: Formatted report with charts and tables
- **Excel**: Multi-sheet workbook with raw data and summary
- **CSV**: Flat file for tax software import

### 6. Stock Information Management

#### Stock Master Data
Each stock should have:
- **Symbol** (Primary key, e.g., "RELIANCE")
- **Company Name** (e.g., "Reliance Industries Ltd")
- **Sector** (Technology, Banking, Pharma, etc.)
- **Category** (Large Cap, Mid Cap, Small Cap)
- **ISIN Code** (Optional)
- **NSE/BSE Indicator**

#### Sector Categories
Pre-populate dropdown with:
- Banking & Financial Services
- Technology & IT Services
- Pharmaceuticals & Healthcare
- Fast Moving Consumer Goods (FMCG)
- Automobiles & Auto Components
- Energy & Power
- Metals & Mining
- Real Estate & Infrastructure
- Telecommunications
- Media & Entertainment
- Consumer Durables
- Chemicals
- Others

#### Stock Management Screen
- Add new stock with sector/category
- Edit existing stock details
- Bulk import from CSV template
- Cannot delete stock if transactions exist

### 7. ICICI Breeze API Integration

#### API Setup
- Users must provide their own API credentials during setup:
  - API Key
  - API Secret
  - Session Token (generated after login)
- Store encrypted in local database
- Settings page to update credentials

#### Price Fetching
- Fetch real-time prices for all portfolio stocks
- API endpoint: Use Breeze's quote API
- Handle rate limits (max requests per second)
- Cache prices for 1 minute to avoid excessive API calls
- Fallback mechanism if API fails (show last fetched price with warning)

#### Market Data to Fetch
- Last Traded Price (LTP)
- Previous Close Price
- Day High / Day Low
- Open Price
- Volume
- Last update timestamp

#### Error Handling
- Invalid API credentials - show error message, redirect to settings
- API rate limit exceeded - queue requests with retry logic
- Network error - show "Offline Mode" indicator, use cached prices
- Market closed - display previous close price with indicator

#### API Integration Code Structure
```javascript
// Breeze API wrapper module
class BreezeAPIClient {
  constructor(apiKey, apiSecret, sessionToken)
  
  async getQuotes(symbols[])
  // Returns: { symbol: { ltp, close, open, high, low, volume, timestamp } }
  
  async getHistoricalData(symbol, fromDate, toDate)
  // For future analytics features
  
  isMarketOpen()
  // Returns true between 9:15 AM - 3:30 PM IST on trading days
}
```

#### Refresh Strategy
- Manual refresh button always available
- Auto-refresh only during market hours:
  - Every 5 minutes for portfolio stocks
  - On-demand when viewing specific stock details
- Show loading indicator during refresh
- Display last successful update time

### 8. Data Persistence & Database Schema

#### SQLite Database Structure

**Table: users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

**Table: stocks**
```sql
CREATE TABLE stocks (
  symbol TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  category TEXT NOT NULL,
  isin_code TEXT,
  exchange TEXT DEFAULT 'NSE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Table: transactions**
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('BUY','SELL')),
  transaction_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_share REAL NOT NULL,
  brokerage REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol)
);
```

**Table: realized_gains**
```sql
CREATE TABLE realized_gains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  sell_transaction_id INTEGER NOT NULL,
  buy_transaction_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  buy_price REAL NOT NULL,
  sell_price REAL NOT NULL,
  buy_date DATE NOT NULL,
  sell_date DATE NOT NULL,
  gain_loss REAL NOT NULL,
  gain_type TEXT CHECK(gain_type IN ('STCG','LTCG')),
  financial_year TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol),
  FOREIGN KEY (sell_transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (buy_transaction_id) REFERENCES transactions(id)
);
```

**Table: price_cache**
```sql
CREATE TABLE price_cache (
  stock_symbol TEXT PRIMARY KEY,
  last_price REAL NOT NULL,
  previous_close REAL NOT NULL,
  open_price REAL,
  day_high REAL,
  day_low REAL,
  volume INTEGER,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol)
);
```

**Table: api_settings**
```sql
CREATE TABLE api_settings (
  user_id INTEGER PRIMARY KEY,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  session_token_encrypted TEXT,
  last_validated DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Table: app_settings**
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 9. User Interface Design Guidelines

#### Design Principles
- Clean, professional financial software aesthetic
- Indian Rupee (₹) symbol for all currency values
- Number formatting: ₹1,23,456.78 (Indian numbering system)
- Date format: DD-MMM-YYYY (e.g., 15-Jan-2024)
- Responsive layout that works on different screen sizes

#### Color Scheme
- Primary: Deep blue (#1a365d) for headers and buttons
- Success/Profit: Green (#22c55e)
- Loss: Red (#ef4444)
- Warning: Amber (#f59e0b)
- Background: Light gray (#f8fafc)
- Text: Dark gray (#1e293b)

#### Main Navigation
Left sidebar with:
- Dashboard (Home icon)
- Add Transaction (Plus icon)
- Transaction History (List icon)
- Capital Gains Report (Document icon)
- Stock Management (Database icon)
- Settings (Gear icon)
- Logout (Exit icon)

#### Dashboard Layout
```
+--------------------------------------------------+
| [Portfolio Manager Logo]    [User]    [Logout]  |
+--------------------------------------------------+
| Total Value: ₹X,XX,XXX  |  Total Gain: ₹X,XXX   |
| Investment: ₹X,XX,XXX   |  Today's Gain: ₹XXX   |
+--------------------------------------------------+
|                                                   |
|  [Search] [Filter] [Add Transaction] [Refresh]   |
|                                                   |
|  +--------------------------------------------+  |
|  | Stock | LTP | Avg | Qty | Today% | Overall%| |
|  |-------|-----|-----|-----|--------|----------|  |
|  | ABC   | 100 | 90  | 50  | +2.5%  | +11.1%  |  |
|  | XYZ   | 250 | 260 | 100 | -1.2%  | -3.8%   |  |
|  +--------------------------------------------+  |
|                                                   |
+--------------------------------------------------+
| Last Updated: 15-Jan-2024 02:30 PM               |
+--------------------------------------------------+
```

#### Form Design
- Clear labels above each field
- Placeholder text for guidance
- Validation errors shown in red below fields
- Required fields marked with asterisk (*)
- Submit button disabled until form is valid
- Cancel button to close without saving

### 10. Settings & Configuration

#### Application Settings Page
Sections:
1. **API Configuration**
   - ICICI Breeze API Key
   - API Secret
   - Session Token
   - "Test Connection" button
   - Last validated timestamp

2. **Data Management**
   - Backup database (export .sqlite file)
   - Restore from backup
   - Clear all data (requires password confirmation)

3. **Display Preferences**
   - Auto-refresh interval (dropdown: 1/5/10/15 minutes)
   - Default view (Table/Card layout)
   - Decimal places for prices (0-4)

4. **Security**
   - Change password
   - Auto-logout timer (15/30/60 minutes)
   - Session timeout setting

5. **About**
   - App version
   - Database location
   - License information

### 11. Security Requirements

#### Data Security
- All passwords hashed with bcrypt (cost factor: 10)
- API credentials encrypted using AES-256
- Database file stored in user's AppData/Application Support folder
- No cloud sync or external data transmission (except API calls)

#### Access Control
- Single user mode (one user per installation)
- Session-based authentication
- Auto-logout on inactivity
- Lockout mechanism after failed login attempts

#### Backup & Recovery
- Users can manually backup database file
- No automatic cloud backup (offline requirement)
- Warn users to keep backups safe
- Provide database location in settings

### 12. Error Handling & Logging

#### User-Facing Errors
- Network errors: "Unable to fetch prices. Check internet connection."
- API errors: "Invalid API credentials. Please update in Settings."
- Validation errors: Clear field-specific messages
- Database errors: "Unable to save. Please try again."

#### Logging
- Log file stored locally: logs/app.log
- Rotation policy: 10 MB max size, keep 5 files
- Log levels: ERROR, WARN, INFO, DEBUG
- No sensitive data (passwords, API keys) in logs
- Include in logs:
  - API calls (without credentials)
  - Database operations
  - User actions (login/logout, transactions)
  - Errors with stack traces

### 13. Installation & Distribution

#### Windows Installer
- MSI or NSIS installer
- Install location: C:\Program Files\StockPortfolioManager
- Desktop shortcut option
- Start menu entry
- Uninstaller included
- Minimum Windows version: Windows 10

#### macOS Installer
- DMG file with app bundle
- Install location: /Applications/StockPortfolioManager.app
- Code signed (if possible)
- Minimum macOS version: macOS 10.14 (Mojave)

#### First Launch
- Setup wizard to create user account
- API configuration prompt (can skip and configure later)
- Sample stock data option for testing

### 14. Performance Requirements

#### Response Times
- Login: < 1 second
- Dashboard load: < 2 seconds
- Add transaction: < 500ms
- Generate report: < 5 seconds for 1 year data
- API price refresh: < 3 seconds for up to 50 stocks

#### Resource Usage
- RAM: < 200 MB during normal operation
- Disk space: < 100 MB installation + database growth
- Database size: ~1 MB per 1000 transactions

#### Scalability
- Support up to 100 unique stocks in portfolio
- Support up to 10,000 transactions total
- 10-year transaction history without performance degradation

### 15. Testing Requirements

#### Unit Tests
- Transaction calculations (FIFO logic)
- Capital gains calculations (STCG/LTCG)
- Financial year determination
- Average cost calculation
- Quantity calculations

#### Integration Tests
- Database CRUD operations
- API integration (mocked responses)
- Report generation
- CSV import/export

#### Manual Testing Scenarios
1. Create new user → Add stocks → Add transactions → View dashboard
2. Test FIFO calculation with multiple buy/sell scenarios
3. Generate capital gains report for different FYs
4. Test API integration with real credentials
5. Test backup and restore functionality
6. Test on both Windows and macOS

### 16. Future Enhancement Ideas (Not for MVP)

- Import transactions from broker statements (PDF/Excel)
- Dividend tracking and management
- Portfolio analytics dashboard with charts
- Goal-based investment tracking
- Multiple portfolio support (e.g., Family members)
- Watchlist for stocks not yet purchased
- Price alerts and notifications
- Mobile app companion (with sync)
- Tax optimization suggestions
- Historical performance charts
- Benchmark comparison (Nifty, Sensex)

### 17. Indian-Specific Considerations

#### Tax Rules (As of FY 2024-25)
- STCG (equity): 15% tax rate
- LTCG (equity): 10% above ₹1 lakh exemption limit
- Holding period for LTCG: > 365 days

#### Market Hours (IST)
- NSE Trading: 9:15 AM - 3:30 PM (Mon-Fri)
- Pre-market: 9:00 AM - 9:15 AM
- Post-market: 3:40 PM - 4:00 PM
- Holidays: NSE holiday calendar (not hard-coded, check API)

#### Number Formatting
- Indian numbering: 1,00,000 not 100,000
- Currency: ₹ (Indian Rupee symbol)
- Display in lakhs/crores where appropriate:
  - < 1 lakh: ₹XX,XXX
  - 1 lakh - 1 crore: ₹XX.XX L
  - > 1 crore: ₹XX.XX Cr

#### Financial Year
- Always April 1 to March 31
- Display as "FY 2024-25" format
- Default to current FY in reports

## Deliverables

1. **Desktop Application**
   - Cross-platform Electron app (Windows + macOS)
   - Installers for both platforms
   - User documentation (PDF)

2. **Documentation**
   - Installation guide
   - User manual with screenshots
   - API setup guide for ICICI Breeze
   - Troubleshooting guide

3. **Source Code**
   - Well-commented code
   - README.md with setup instructions
   - Environment variable template
   - Database schema documentation

## Development Approach for Kiro

**Estimated Timeline: 1-2 Days (Weekend Project)**

Since you're using Kiro, an AI coding agent, the development can be completed much faster. Here's the recommended approach:

### Session 1: Core Setup & Database (2-3 hours)
- Initialize Electron + React project
- Setup SQLite database with all tables
- Implement user authentication
- Create basic app structure and routing

### Session 2: Transaction & Portfolio Logic (3-4 hours)
- Add transaction form with validation
- Implement FIFO calculation engine
- Build dashboard with portfolio summary table
- Create transaction history view

### Session 3: API Integration & Price Updates (2-3 hours)
- Integrate ICICI Breeze API
- Implement price fetching and caching
- Add auto-refresh logic for market hours
- Handle API errors and offline mode

### Session 4: Reports & Export (2-3 hours)
- Capital gains calculation by financial year
- PDF/Excel/CSV export functionality
- Sector-wise analysis
- Tax calculation helper

### Session 5: UI Polish & Testing (2-3 hours)
- Refine UI/UX with proper styling
- Add all validation and error messages
- Test all features end-to-end
- Build installers for Windows and macOS

**Total: ~12-15 hours of focused work (achievable in a weekend)**

### Tips for Working with Kiro:
1. Feed this entire requirements document to Kiro in one go
2. Start with the database schema and core structure first
3. Build features incrementally and test each before moving on
4. Ask Kiro to generate the installers at the end
5. Request comprehensive error handling throughout

## Code Review & Testing Guide (For C++ Developers)

Since you're coming from a C++ background, here's what to look for when reviewing Kiro's code:

### Key Differences from C++ to JavaScript/Node.js

**Memory Management**
- JavaScript has automatic garbage collection (no manual memory management)
- No pointers or manual `delete` - objects are cleaned up automatically
- Watch for: Memory leaks in event listeners (should cleanup on component unmount)

**Type System**
- JavaScript is dynamically typed (unlike C++)
- Variables can change types: `let x = 5; x = "hello";` is valid
- Watch for: Type mismatches that could cause runtime errors
- Consider: Ask Kiro to use TypeScript instead for better type safety (similar to C++ typing)

**Asynchronous Programming**
- JavaScript uses async/await and Promises (not threads like C++)
- Example: `await fetch(url)` waits for network response without blocking
- Watch for: Missing `await` keywords, unhandled Promise rejections
- C++ equivalent: Similar to futures/promises in modern C++

**Error Handling**
- Uses try/catch blocks (similar to C++)
- Watch for: Unhandled exceptions, missing error boundaries
- Check: All database operations wrapped in try/catch

### Code Review Checklist

#### 1. Database Operations
```javascript
// GOOD - Error handling present
try {
  const result = await db.run('INSERT INTO stocks...');
} catch (error) {
  console.error('Database error:', error);
  // Show user-friendly error message
}

// BAD - No error handling
const result = await db.run('INSERT INTO stocks...');
```

**What to check:**
- [ ] All database queries wrapped in try/catch
- [ ] SQL injection prevention (using parameterized queries)
- [ ] Database connection properly closed after operations
- [ ] Transactions used for multi-step operations (like FIFO calculations)

**Example to verify:**
```javascript
// GOOD - Parameterized query (prevents SQL injection)
db.run('INSERT INTO stocks (symbol, price) VALUES (?, ?)', [symbol, price]);

// BAD - String concatenation (vulnerable to SQL injection)
db.run(`INSERT INTO stocks (symbol, price) VALUES ('${symbol}', ${price})`);
```

#### 2. FIFO Calculation Logic

This is critical - verify the math is correct:

```javascript
// Ask Kiro to add detailed comments explaining the logic
function calculateCapitalGains(sellTransaction) {
  // 1. Get all buy transactions for this stock, ordered by date
  const buyTransactions = getBuyTransactions(stock, orderBy: 'date ASC');
  
  let remainingQty = sellTransaction.quantity;
  let totalGain = 0;
  
  // 2. Match sell quantity against oldest buys first
  for (let buy of buyTransactions) {
    if (remainingQty <= 0) break;
    
    // 3. Calculate how many shares to match from this buy
    const qtyToMatch = Math.min(remainingQty, buy.remainingQty);
    
    // 4. Calculate gain for this lot
    const gain = qtyToMatch * (sellTransaction.price - buy.price);
    
    // 5. Determine STCG vs LTCG based on holding period
    const holdingDays = daysBetween(buy.date, sellTransaction.date);
    const gainType = holdingDays > 365 ? 'LTCG' : 'STCG';
    
    // ... store the gain details
  }
}
```

**What to verify:**
- [ ] Buys are sorted by date (oldest first)
- [ ] Quantities are matched correctly
- [ ] Holding period calculation is accurate (365 days for LTCG)
- [ ] All matched transactions are stored in realized_gains table
- [ ] Remaining quantity tracking is correct

**Test with this scenario:**
```
Buy 50 @ ₹25 on Jan 1, 2024
Buy 50 @ ₹30 on Jun 1, 2024
Sell 60 @ ₹35 on Dec 1, 2024

Expected:
- 50 shares matched with ₹25 buy (LTCG) = ₹500 gain
- 10 shares matched with ₹30 buy (STCG) = ₹50 gain
- Remaining in portfolio: 40 shares @ ₹30 avg cost
```

#### 3. Security Review

**Password Hashing**
```javascript
// GOOD - Using bcrypt with proper cost factor
const bcrypt = require('bcrypt');
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// BAD - Storing plain text passwords (NEVER do this)
db.run('INSERT INTO users (password) VALUES (?)', [password]);
```

**What to check:**
- [ ] Passwords are hashed, never stored as plain text
- [ ] API credentials are encrypted (using crypto.createCipher or similar)
- [ ] No sensitive data in console.log statements
- [ ] No hardcoded credentials in code

**API Credential Encryption**
```javascript
// Verify something like this exists:
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

function encryptAPIKey(apiKey) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  // ... encryption logic
}
```

#### 4. API Integration Review

**Rate Limiting & Error Handling**
```javascript
// GOOD - Has retry logic and rate limiting
async function fetchStockPrices(symbols) {
  try {
    // Batch requests to avoid rate limits
    const batches = chunkArray(symbols, 10); // 10 at a time
    
    for (let batch of batches) {
      const prices = await breezeAPI.getQuotes(batch);
      // Cache the results
      await cachePrices(prices);
      
      // Wait 1 second between batches to respect rate limits
      await sleep(1000);
    }
  } catch (error) {
    if (error.status === 429) { // Rate limit exceeded
      // Exponential backoff retry logic
    } else if (error.status === 401) { // Invalid credentials
      // Show error to user, redirect to settings
    }
  }
}
```

**What to check:**
- [ ] Rate limiting implemented (don't spam the API)
- [ ] Errors handled gracefully (network errors, invalid credentials)
- [ ] Prices cached to avoid redundant API calls
- [ ] Market hours check before auto-refresh
- [ ] Timeout handling for slow API responses

#### 5. React Component Best Practices

**Component Structure**
```javascript
// GOOD - Proper cleanup in useEffect
function Dashboard() {
  const [prices, setPrices] = useState({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMarketOpen()) {
        fetchPrices();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // IMPORTANT: Cleanup to prevent memory leaks
    return () => clearInterval(interval);
  }, []);
  
  return (/* JSX */);
}

// BAD - No cleanup (memory leak)
useEffect(() => {
  setInterval(() => fetchPrices(), 5 * 60 * 1000);
}, []);
```

**What to check:**
- [ ] Event listeners and intervals are cleaned up
- [ ] No infinite re-render loops
- [ ] Proper dependency arrays in useEffect
- [ ] Loading states shown during async operations

#### 6. Number Formatting & Calculations

**Indian Rupee Formatting**
```javascript
// Verify Kiro implements something like this:
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Should display: ₹1,23,456.78 (not ₹123,456.78)
```

**Percentage Calculations**
```javascript
// GOOD - Handles division by zero
function calculateGainPercent(current, cost) {
  if (cost === 0) return 0;
  return ((current - cost) / cost) * 100;
}

// BAD - Can cause NaN or Infinity
function calculateGainPercent(current, cost) {
  return ((current - cost) / cost) * 100; // What if cost is 0?
}
```

**What to check:**
- [ ] Division by zero handled
- [ ] Floating point precision considered (use toFixed(2) for display)
- [ ] Indian numbering system used (lakhs/crores)
- [ ] Negative gains shown in red, positive in green

### Testing Strategy

#### 1. Manual Testing Checklist

**Authentication Flow**
- [ ] Create new user with password
- [ ] Login with correct credentials
- [ ] Login fails with wrong password
- [ ] Auto-logout after inactivity
- [ ] Lockout after 5 failed attempts

**Transaction Management**
- [ ] Add buy transaction for new stock
- [ ] Add another buy transaction for same stock
- [ ] Add sell transaction (less than total quantity)
- [ ] Verify cannot sell more than owned
- [ ] Edit existing transaction
- [ ] Delete transaction (verify portfolio updates)

**FIFO Calculation (Critical Test)**
Test this exact scenario:
```
1. Buy 100 ABC @ ₹50 on 01-Jan-2024
2. Buy 100 ABC @ ₹60 on 01-Jun-2024  
3. Sell 150 ABC @ ₹70 on 01-Dec-2024

Expected Results:
- First 100 shares: LTCG = 100 × (70-50) = ₹2,000
- Next 50 shares: STCG = 50 × (70-60) = ₹500
- Remaining: 50 shares @ ₹60 avg cost
- Capital Gains Report for FY 2024-25 should show:
  * LTCG: ₹2,000
  * STCG: ₹500
```

**Dashboard Display**
- [ ] Portfolio summary shows correct totals
- [ ] Avg cost calculated correctly (weighted average)
- [ ] Quantity >1 year calculated correctly
- [ ] Today's gain shows correctly (requires API/mock data)
- [ ] Overall gain matches manual calculation

**API Integration**
- [ ] Enter valid ICICI Breeze credentials
- [ ] Fetch prices successfully
- [ ] Prices update on dashboard
- [ ] Handle API failure gracefully (show cached prices)
- [ ] Auto-refresh works during market hours
- [ ] No refresh outside market hours

**Reports**
- [ ] Generate capital gains for FY 2024-25
- [ ] Export to PDF (verify formatting)
- [ ] Export to Excel (verify all sheets)
- [ ] Export to CSV (verify can open in Excel)
- [ ] Sector-wise breakdown shows correctly

#### 2. Edge Cases to Test

**Transaction Edge Cases**
- [ ] Sell entire position (quantity becomes 0)
- [ ] Buy after selling everything (new cost basis)
- [ ] Same-day buy and sell
- [ ] Transaction on last day of financial year
- [ ] Very large quantities (10,000+ shares)
- [ ] Very small prices (₹0.01 per share)
- [ ] Fractional shares (bonus/split) - should show error

**Date Edge Cases**
- [ ] Financial year boundary (Mar 31 to Apr 1)
- [ ] Leap year handling (Feb 29)
- [ ] Holding period exactly 365 days (should be STCG)
- [ ] Holding period exactly 366 days (should be LTCG)

**Data Validation**
- [ ] Negative price/quantity (should reject)
- [ ] Zero price/quantity (should reject)
- [ ] Future date transaction (should reject)
- [ ] Special characters in stock symbol
- [ ] Very long stock names

#### 3. Performance Testing

**Database Performance**
- [ ] Add 1,000 transactions - dashboard still loads quickly?
- [ ] Generate report with 1,000 transactions - completes in <5 seconds?
- [ ] 50 stocks in portfolio - price refresh completes in <3 seconds?

**Memory Leaks**
- [ ] Leave app running for 1 hour - memory usage stable?
- [ ] Switch between screens 50 times - no memory increase?
- [ ] Auto-refresh running for 1 hour - memory stable?

#### 4. Cross-Platform Testing

**Windows Testing**
- [ ] Installer runs correctly
- [ ] App launches and creates database
- [ ] All features work
- [ ] Can backup/restore database
- [ ] Uninstaller removes all files

**macOS Testing**
- [ ] DMG mounts correctly
- [ ] App runs without security warnings (if signed)
- [ ] All features work
- [ ] Database location accessible

### Automated Testing (Ask Kiro to Generate)

Request Kiro to create these test files:

#### Unit Tests (Using Jest)
```javascript
// tests/calculations.test.js
describe('FIFO Calculation', () => {
  test('calculates LTCG correctly for >365 day holding', () => {
    const result = calculateCapitalGains(/* test data */);
    expect(result.ltcg).toBe(2000);
  });
  
  test('calculates STCG correctly for <=365 day holding', () => {
    // ... test case
  });
  
  test('handles multiple buy lots correctly', () => {
    // ... test case
  });
});

describe('Average Cost Calculation', () => {
  test('calculates weighted average correctly', () => {
    // Buy 50 @ ₹25 = ₹1,250
    // Buy 50 @ ₹30 = ₹1,500
    // Avg should be ₹27.50
    const avgCost = calculateAvgCost(transactions);
    expect(avgCost).toBe(27.50);
  });
});
```

**To run tests:**
```bash
npm test
```

### Code Quality Tools

Ask Kiro to set up:

1. **ESLint** - Code quality checker
   - Catches common JavaScript errors
   - Enforces coding standards
   
2. **Prettier** - Code formatter
   - Ensures consistent code style
   - Auto-formats on save

3. **Package.json scripts**
```json
{
  "scripts": {
    "start": "electron .",
    "test": "jest",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.js"
  }
}
```

### Documentation to Request from Kiro

Ask Kiro to generate:

1. **README.md** - Setup and run instructions
2. **ARCHITECTURE.md** - How the code is organized
3. **API.md** - ICICI Breeze API integration guide
4. **TESTING.md** - How to run tests
5. **Inline code comments** - Especially for complex calculations

### Final Pre-Deployment Checklist

- [ ] All manual tests pass
- [ ] All automated tests pass
- [ ] No console errors in DevTools
- [ ] Database backup/restore works
- [ ] Installers built for Windows and Mac
- [ ] User documentation complete
- [ ] Test on fresh Windows machine (no dev tools)
- [ ] Test on fresh Mac (no dev tools)
- [ ] Sample data works correctly
- [ ] API credentials can be updated in settings
- [ ] Log files are being created
- [ ] App version number is correct

### Common Issues to Watch For

**Issue 1: Async/Await Gotchas**
```javascript
// WRONG - forEach doesn't work with async/await
transactions.forEach(async (txn) => {
  await processTxn(txn); // Won't wait!
});

// CORRECT - Use for...of loop
for (const txn of transactions) {
  await processTxn(txn); // Will wait
}
```

**Issue 2: State Updates in React**
```javascript
// WRONG - Direct mutation
const portfolio = this.state.portfolio;
portfolio.stocks.push(newStock); // Don't mutate directly!

// CORRECT - Create new object/array
this.setState({
  portfolio: {
    ...portfolio,
    stocks: [...portfolio.stocks, newStock]
  }
});
```

**Issue 3: Date Handling**
```javascript
// Always use a date library like date-fns
const { differenceInDays } = require('date-fns');

// WRONG - Can give incorrect results
const days = (sellDate - buyDate) / (1000 * 60 * 60 * 24);

// CORRECT - Handles DST, leap years, etc.
const days = differenceInDays(sellDate, buyDate);
```

### Getting Help from Kiro

If you spot something that looks wrong, ask Kiro:

1. **"Explain this code block to me"** - Kiro will explain what it does
2. **"Is this FIFO calculation correct?"** - Ask for verification
3. **"Add unit tests for this function"** - Generate tests
4. **"Add error handling here"** - Improve robustness
5. **"Why are you using this approach?"** - Understand design decisions

### Quick Reference: JavaScript for C++ Developers

| C++ Concept | JavaScript Equivalent |
|-------------|----------------------|
| `std::vector<int>` | `const arr = []` or `Array<number>` (TypeScript) |
| `std::map<string,int>` | `const map = {}` or `Map<string,number>` |
| `nullptr` | `null` or `undefined` |
| `auto x = 5;` | `const x = 5;` or `let x = 5;` |
| `try { } catch(Exception& e)` | `try { } catch(error)` |
| `cout << "text"` | `console.log('text')` |
| `thread::sleep()` | `await new Promise(r => setTimeout(r, ms))` |
| `#include <header>` | `const lib = require('lib')` or `import lib from 'lib'` |
| `class MyClass { }` | `class MyClass { }` (same!) |
| `virtual void func()` | `func() { }` (all methods virtual in JS) |

Remember: JavaScript is more forgiving than C++ (for better or worse), so test thoroughly!

## Success Criteria

- User can manage complete stock portfolio offline
- Accurate FIFO-based capital gains calculation
- Real-time price updates during market hours
- Generate tax reports for any financial year
- Runs smoothly on Windows 10+ and macOS 10.14+
- Data remains private and secure on local machine
- Installs and works without internet (except API calls)

## Technical Constraints

- **No cloud dependency** - All data stored locally
- **Single user per installation** - No multi-user support needed
- **Indian market only** - NSE/BSE stocks only
- **ICICI Breeze API** - No other broker integrations in MVP
- **Desktop only** - No web or mobile version in MVP

---

**End of Requirements Document**

*Version: 1.0*  
*Last Updated: January 2026*  
*Target Users: Indian retail stock investors*
