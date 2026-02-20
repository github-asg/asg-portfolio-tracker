# Requirements Document

## Introduction

This document specifies the requirements for integrating mutual fund tracking into the Stock Portfolio Management application. The feature enables users to track mutual fund investments and view consolidated stock exposure across both direct equity holdings and indirect holdings through mutual funds. This provides a complete picture of portfolio concentration risk and total exposure to individual stocks.

## Glossary

- **Mutual_Fund_System**: The subsystem responsible for managing mutual fund data and calculations
- **Stock_Exposure_Calculator**: Component that calculates indirect stock holdings from mutual fund allocations
- **Consolidated_Holdings_View**: UI component displaying combined direct and indirect stock exposure
- **CSV_Importer**: Component that validates and imports mutual fund stock allocation data
- **Direct_Holdings**: Stocks owned directly through buy transactions
- **Indirect_Holdings**: Stocks owned indirectly through mutual fund investments
- **Allocation_Percentage**: The percentage of a mutual fund's portfolio allocated to a specific stock
- **BSE_Scrip_Code**: Unique identifier for stocks listed on Bombay Stock Exchange
- **Financial_Year**: April 1 to March 31 period used for Indian tax calculations

## Requirements

### Requirement 1: Mutual Fund Data Management

**User Story:** As an investor, I want to add and manage my mutual fund investments, so that I can track them alongside my direct equity holdings.

#### Acceptance Criteria

1. WHEN a user adds a mutual fund, THE Mutual_Fund_System SHALL store the scheme name, current value, and investment date
2. WHEN a user views the mutual funds list, THE Mutual_Fund_System SHALL display all mutual funds with their details sorted by investment date
3. WHEN a user edits a mutual fund, THE Mutual_Fund_System SHALL update the scheme name, current value, or investment date
4. WHEN a user deletes a mutual fund, THE Mutual_Fund_System SHALL remove the mutual fund and all associated stock allocation data
5. THE Mutual_Fund_System SHALL validate that current value is a positive number
6. THE Mutual_Fund_System SHALL validate that investment date is not in the future

### Requirement 2: CSV Stock Allocation Import

**User Story:** As an investor, I want to import mutual fund stock allocation data from a CSV file, so that I can track which stocks my mutual funds are invested in.

#### Acceptance Criteria

1. WHEN a user uploads a CSV file, THE CSV_Importer SHALL parse files containing Stock Symbol, Stock Name, and Allocation Percentage columns
2. WHEN parsing CSV data, THE CSV_Importer SHALL validate that all allocation percentages are between 0 and 100
3. WHEN parsing CSV data, THE CSV_Importer SHALL validate that the sum of allocation percentages is between 95% and 105%
4. WHEN parsing CSV data, THE CSV_Importer SHALL validate that each stock symbol matches a valid BSE scrip code in the stock master data
5. IF a stock symbol is not found, THEN THE CSV_Importer SHALL return a descriptive error identifying the invalid symbol
6. IF the allocation percentages do not sum to approximately 100%, THEN THE CSV_Importer SHALL return a warning with the actual sum
7. WHEN CSV validation succeeds, THE CSV_Importer SHALL store all stock allocations linked to the mutual fund
8. THE CSV_Importer SHALL handle CSV files with up to 500 stock entries per mutual fund

### Requirement 3: Indirect Stock Holdings Calculation

**User Story:** As an investor, I want to see how many shares of each stock I indirectly own through mutual funds, so that I understand my total exposure.

#### Acceptance Criteria

1. WHEN calculating indirect holdings, THE Stock_Exposure_Calculator SHALL compute shares as (mutual fund current value × allocation percentage) ÷ stock current price
2. WHEN a stock appears in multiple mutual funds, THE Stock_Exposure_Calculator SHALL sum the indirect holdings from all mutual funds
3. WHEN a stock price is unavailable, THE Stock_Exposure_Calculator SHALL exclude that stock from indirect holdings calculations
4. WHEN a stock price is zero, THE Stock_Exposure_Calculator SHALL exclude that stock from indirect holdings calculations
5. THE Stock_Exposure_Calculator SHALL round indirect share quantities to 4 decimal places
6. THE Stock_Exposure_Calculator SHALL recalculate indirect holdings whenever mutual fund current value is updated
7. THE Stock_Exposure_Calculator SHALL recalculate indirect holdings whenever stock prices are refreshed

### Requirement 4: Consolidated Holdings Display

**User Story:** As an investor, I want to view my total stock exposure combining direct and indirect holdings, so that I can identify concentration risks in my portfolio.

#### Acceptance Criteria

1. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL show direct holdings quantity for each stock
2. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL show indirect holdings quantity broken down by mutual fund source
3. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL show total holdings as the sum of direct and indirect quantities
4. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL show total value calculated as total holdings × current stock price
5. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL show allocation percentage as (stock total value ÷ total portfolio value) × 100
6. WHEN displaying consolidated holdings, THE Consolidated_Holdings_View SHALL sort stocks by total value in descending order
7. WHEN a stock has only direct holdings, THE Consolidated_Holdings_View SHALL display it with zero indirect holdings
8. WHEN a stock has only indirect holdings, THE Consolidated_Holdings_View SHALL display it with zero direct holdings
9. THE Consolidated_Holdings_View SHALL format currency values using Indian Rupee formatting
10. THE Consolidated_Holdings_View SHALL format allocation percentages to 2 decimal places

### Requirement 5: Mutual Fund Portfolio Value Calculation

**User Story:** As an investor, I want to see the total value of my mutual fund investments, so that I can track my overall portfolio composition.

#### Acceptance Criteria

1. WHEN calculating total mutual fund value, THE Mutual_Fund_System SHALL sum the current values of all mutual funds
2. WHEN displaying portfolio summary, THE Mutual_Fund_System SHALL show mutual fund total value alongside direct equity value
3. WHEN displaying portfolio summary, THE Mutual_Fund_System SHALL show total portfolio value as direct equity value plus mutual fund value
4. THE Mutual_Fund_System SHALL format all values using Indian Rupee formatting with lakhs and crores notation

### Requirement 6: Data Persistence and Integrity

**User Story:** As a user, I want my mutual fund data to be stored securely and reliably, so that I don't lose my investment tracking information.

#### Acceptance Criteria

1. THE Mutual_Fund_System SHALL store all mutual fund data in the local SQLite database
2. THE Mutual_Fund_System SHALL store all stock allocation data in the local SQLite database
3. WHEN a mutual fund is deleted, THE Mutual_Fund_System SHALL cascade delete all associated stock allocations
4. THE Mutual_Fund_System SHALL maintain referential integrity between mutual funds and stock allocations
5. THE Mutual_Fund_System SHALL maintain referential integrity between stock allocations and the BSE stock master data
6. WHEN the application starts, THE Mutual_Fund_System SHALL load all mutual fund data from the database

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can correct issues with my mutual fund data.

#### Acceptance Criteria

1. IF CSV import fails validation, THEN THE Mutual_Fund_System SHALL display specific error messages identifying the problem
2. IF a stock price cannot be fetched, THEN THE Mutual_Fund_System SHALL display a warning that indirect holdings may be incomplete
3. IF database operations fail, THEN THE Mutual_Fund_System SHALL display an error message and maintain data consistency
4. WHEN validation errors occur, THE Mutual_Fund_System SHALL preserve user input to allow correction without re-entry
5. THE Mutual_Fund_System SHALL log all errors to support troubleshooting
