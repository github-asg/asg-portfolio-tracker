# Requirements Document

## Introduction

The Stock Portfolio Management Software is a fully offline desktop application designed for Indian retail investors to manage their stock portfolios with complete privacy and accurate tax calculations. The application provides real-time portfolio tracking, automated FIFO-based capital gains calculations, and comprehensive reporting capabilities while maintaining all data locally on the user's machine.

## Glossary

- **System**: The Stock Portfolio Management Software
- **User**: Indian retail stock investor using the application
- **Portfolio**: Collection of stocks and transactions owned by a user
- **Transaction**: Buy or sell order for a specific stock with date, price, and quantity
- **FIFO**: First In First Out method for capital gains calculation as per Indian tax law
- **STCG**: Short Term Capital Gains (holding period ≤ 365 days, taxed at 20%)
- **LTCG**: Long Term Capital Gains (holding period > 365 days, taxed at 12.5% above ₹1 lakh)
- **Financial_Year**: April 1 to March 31 period for Indian tax calculations
- **API_Client**: ICICI Breeze API integration component
- **Database**: Local SQLite database storing all application data
- **Authenticator**: User authentication and session management component
- **Calculator**: FIFO-based capital gains calculation engine
- **Reporter**: Financial year report generation component

## Requirements

### Requirement 1: User Authentication and Security

**User Story:** As an investor, I want secure access to my portfolio data, so that my financial information remains private and protected.

#### Acceptance Criteria

1. WHEN a user creates an account, THE Authenticator SHALL hash the password using bcrypt with cost factor 10
2. WHEN a user attempts login with correct credentials, THE Authenticator SHALL create a secure session
3. WHEN a user attempts login with incorrect credentials, THE Authenticator SHALL reject access and log the attempt
4. WHEN a user session is inactive for 30 minutes, THE System SHALL automatically log out the user
5. WHEN API credentials are stored, THE System SHALL encrypt them using AES-256 encryption
6. THE Database SHALL be stored in the user's private application data folder

### Requirement 2: Portfolio Dashboard and Real-time Data

**User Story:** As an investor, I want to see my portfolio summary with real-time prices, so that I can track my investments' current performance.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE System SHALL display portfolio summary within 2 seconds
2. WHEN market hours are active (9:15 AM - 3:30 PM IST), THE API_Client SHALL refresh prices every 30 seconds
3. WHEN API price data is received, THE System SHALL update portfolio values immediately
4. WHEN API calls fail, THE System SHALL use cached prices and display last update timestamp
5. THE System SHALL display all monetary values in Indian Rupee format (₹1,23,456.78)
6. THE System SHALL color-code gains (green) and losses (red) throughout the interface
7. WHEN displaying large numbers, THE System SHALL use Indian numbering system (lakhs/crores)

### Requirement 3: Transaction Management

**User Story:** As an investor, I want to add and manage my buy/sell transactions, so that I can maintain accurate records of my trading activity.

#### Acceptance Criteria

1. WHEN a user adds a transaction, THE System SHALL validate all required fields (stock, date, type, quantity, price)
2. WHEN a transaction date is in the future, THE System SHALL reject the transaction
3. WHEN a sell quantity exceeds available holdings, THE System SHALL prevent the transaction
4. WHEN a transaction is added, THE System SHALL store it in the Database within 500ms
5. WHEN a transaction is modified, THE System SHALL recalculate all dependent capital gains
6. THE System SHALL support both buy and sell transaction types
7. WHEN displaying transaction dates, THE System SHALL use DD-MMM-YYYY format

### Requirement 4: FIFO Capital Gains Calculation

**User Story:** As an investor, I want automated capital gains calculations using FIFO method, so that I can accurately determine my tax obligations.

#### Acceptance Criteria

1. WHEN a sell transaction is processed, THE Calculator SHALL apply FIFO method to determine cost basis
2. WHEN calculating holding period, THE Calculator SHALL use transaction dates to determine STCG vs LTCG
3. WHEN holding period is ≤ 365 days, THE Calculator SHALL classify gains as STCG (20% tax rate)
4. WHEN holding period is > 365 days, THE Calculator SHALL classify gains as LTCG (12.5% tax rate above ₹1 lakh)
5. WHEN multiple buy lots exist, THE Calculator SHALL consume oldest lots first for sell transactions
6. THE Calculator SHALL maintain realized gains records for each sell transaction
7. THE Calculator SHALL update unrealized gains when current prices change

### Requirement 5: Stock Master Data Management

**User Story:** As an investor, I want to manage stock information with sectors and categories, so that I can organize and analyze my portfolio effectively.

#### Acceptance Criteria

1. WHEN a new stock is added, THE System SHALL store symbol, name, sector, and exchange information
2. WHEN stock data is retrieved, THE System SHALL provide sector classification for portfolio analysis
3. THE System SHALL support NSE and BSE exchange symbols
4. WHEN duplicate stock symbols are added, THE System SHALL prevent creation and show existing record
5. THE System SHALL maintain stock master data independently of transactions
6. WHEN stock information is updated, THE System SHALL reflect changes across all related transactions

### Requirement 6: Financial Year Reporting

**User Story:** As an investor, I want to generate capital gains reports for any financial year, so that I can file accurate tax returns.

#### Acceptance Criteria

1. WHEN generating a report, THE Reporter SHALL calculate gains for the specified Financial_Year (April 1 to March 31)
2. WHEN exporting reports, THE System SHALL support PDF, Excel, and CSV formats
3. WHEN calculating LTCG, THE Reporter SHALL apply ₹1 lakh exemption limit per financial year
4. THE Reporter SHALL separate STCG and LTCG in all reports
5. WHEN report generation is requested, THE System SHALL complete processing within 5 seconds for 1 year of data
6. THE Reporter SHALL include transaction details, dates, quantities, prices, and calculated gains
7. WHEN no transactions exist for a financial year, THE Reporter SHALL generate an empty report with appropriate message

### Requirement 7: ICICI Breeze API Integration

**User Story:** As an investor, I want real-time price updates from ICICI Breeze API, so that my portfolio reflects current market values.

#### Acceptance Criteria

1. WHEN API credentials are configured, THE API_Client SHALL validate connection before saving
2. WHEN fetching prices, THE API_Client SHALL complete requests within 3 seconds for up to 50 stocks
3. WHEN API rate limits are exceeded, THE API_Client SHALL implement exponential backoff retry logic
4. WHEN API is unavailable, THE System SHALL continue operating with cached price data
5. THE API_Client SHALL cache price data locally to reduce API calls
6. WHEN market is closed, THE API_Client SHALL reduce refresh frequency to once per hour
7. THE System SHALL encrypt and store API credentials securely in the Database

### Requirement 8: Data Storage and Privacy

**User Story:** As an investor, I want all my data stored locally on my machine, so that my financial information remains completely private.

#### Acceptance Criteria

1. THE Database SHALL use SQLite format stored in user's application data directory
2. WHEN the application starts, THE System SHALL create database schema if it doesn't exist
3. THE System SHALL never transmit portfolio data to external servers (except API price requests)
4. WHEN database operations are performed, THE System SHALL maintain ACID compliance
5. THE System SHALL support database backup and restore functionality
6. WHEN sensitive data is stored, THE System SHALL apply appropriate encryption
7. THE Database SHALL support concurrent read operations while maintaining data integrity

### Requirement 9: Performance and Scalability

**User Story:** As an investor, I want the application to perform efficiently with my portfolio size, so that I can manage my investments without delays.

#### Acceptance Criteria

1. WHEN user logs in, THE System SHALL complete authentication within 1 second
2. WHEN adding transactions, THE System SHALL process and store data within 500ms
3. THE System SHALL support portfolios with up to 100 different stocks
4. THE System SHALL handle up to 10,000 transactions without performance degradation
5. WHEN calculating portfolio values, THE System SHALL complete updates within 2 seconds
6. THE System SHALL maintain memory usage below 200MB during normal operation
7. WHEN generating reports, THE System SHALL process 1 year of data within 5 seconds

### Requirement 10: Cross-platform Desktop Support

**User Story:** As an investor, I want to use the application on both Windows and Mac, so that I can access my portfolio regardless of my operating system.

#### Acceptance Criteria

1. THE System SHALL run on Windows 10 and later versions
2. THE System SHALL run on macOS 10.14 and later versions
3. WHEN packaging for distribution, THE System SHALL create MSI installer for Windows
4. WHEN packaging for distribution, THE System SHALL create DMG installer for macOS
5. THE System SHALL maintain consistent functionality across both platforms
6. THE System SHALL use native OS file dialogs for import/export operations
7. WHEN installed, THE System SHALL integrate with OS application menus and shortcuts