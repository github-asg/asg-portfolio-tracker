# Design Document: Mutual Fund Integration

## Overview

The mutual fund integration feature extends the portfolio management system to track mutual fund investments and calculate consolidated stock exposure across direct equity holdings and indirect holdings through mutual funds. This enables investors to understand their total exposure to individual stocks and identify concentration risks.

The system consists of four main components:
1. **Mutual Fund Management** - CRUD operations for mutual fund entries
2. **CSV Import Engine** - Parsing and validation of stock allocation data
3. **Stock Exposure Calculator** - Computing indirect holdings from mutual fund allocations
4. **Consolidated Holdings View** - Displaying combined direct and indirect exposure

The design leverages the existing SQLite database, BSE stock master data, and ICICI Breeze API price integration.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process (React)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Mutual Funds     │  │ Consolidated Holdings            │ │
│  │ Management Page  │  │ View Page                        │ │
│  └────────┬─────────┘  └────────┬─────────────────────────┘ │
│           │                     │                            │
│           └─────────┬───────────┘                            │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │  IPC Communication │                            │
│           └─────────┬──────────┘                            │
└─────────────────────┼────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                     Main Process (Electron)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Mutual Fund      │  │ Stock Exposure                   │ │
│  │ Service          │  │ Calculator                       │ │
│  └────────┬─────────┘  └────────┬─────────────────────────┘ │
│           │                     │                            │
│  ┌────────▼─────────┐  ┌───────▼──────────┐                │
│  │ CSV Import       │  │ Consolidated     │                │
│  │ Validator        │  │ Holdings Service │                │
│  └────────┬─────────┘  └───────┬──────────┘                │
│           │                     │                            │
│           └─────────┬───────────┘                            │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │  SQLite Database   │                            │
│           └────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Adding a Mutual Fund:**
1. User enters mutual fund details in React form
2. User uploads CSV file with stock allocations
3. IPC sends data to main process
4. CSV Validator parses and validates the file
5. Mutual Fund Service stores mutual fund record
6. Mutual Fund Service stores stock allocation records
7. Success response returned to renderer

**Viewing Consolidated Holdings:**
1. User navigates to Consolidated Holdings page
2. IPC requests consolidated data from main process
3. Consolidated Holdings Service queries direct holdings
4. Stock Exposure Calculator computes indirect holdings
5. Service combines and aggregates data
6. Data returned to renderer for display

## Components and Interfaces

### 1. Mutual Fund Service (Main Process)

**Responsibilities:**
- CRUD operations for mutual fund records
- Storing stock allocation data
- Validating mutual fund data integrity

**Interface:**

```javascript
class MutualFundService {
  /**
   * Add a new mutual fund with stock allocations
   * @param {Object} mutualFund - { schemeName, currentValue, investmentDate }
   * @param {Array} allocations - [{ stockSymbol, stockName, allocationPercent }]
   * @returns {Promise<number>} - Mutual fund ID
   */
  async addMutualFund(mutualFund, allocations);

  /**
   * Update mutual fund details
   * @param {number} id - Mutual fund ID
   * @param {Object} updates - { schemeName?, currentValue?, investmentDate? }
   * @returns {Promise<void>}
   */
  async updateMutualFund(id, updates);

  /**
   * Delete mutual fund and cascade delete allocations
   * @param {number} id - Mutual fund ID
   * @returns {Promise<void>}
   */
  async deleteMutualFund(id);

  /**
   * Get all mutual funds with their allocations
   * @returns {Promise<Array>} - Array of mutual fund objects
   */
  async getAllMutualFunds();

  /**
   * Get single mutual fund by ID
   * @param {number} id - Mutual fund ID
   * @returns {Promise<Object>} - Mutual fund object with allocations
   */
  async getMutualFundById(id);
}
```

### 2. CSV Import Validator (Main Process)

**Responsibilities:**
- Parse CSV files
- Validate stock symbols against BSE master data
- Validate allocation percentages
- Return structured data or validation errors

**Interface:**

```javascript
class CSVImportValidator {
  /**
   * Parse and validate CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} - { success, data?, errors?, warnings? }
   */
  async validateCSV(filePath);

  /**
   * Validate stock symbol exists in BSE master
   * @param {string} symbol - BSE scrip code
   * @returns {Promise<boolean>}
   */
  async validateStockSymbol(symbol);

  /**
   * Validate allocation percentages sum to ~100%
   * @param {Array} allocations - Array of allocation objects
   * @returns {Object} - { valid, sum, message? }
   */
  validateAllocationSum(allocations);

  /**
   * Parse CSV content into structured data
   * @param {string} csvContent - Raw CSV content
   * @returns {Array} - Parsed allocation objects
   */
  parseCSVContent(csvContent);
}
```

### 3. Stock Exposure Calculator (Main Process)

**Responsibilities:**
- Calculate indirect stock holdings from mutual fund allocations
- Aggregate indirect holdings across multiple mutual funds
- Handle missing or zero stock prices gracefully

**Interface:**

```javascript
class StockExposureCalculator {
  /**
   * Calculate indirect holdings for a single mutual fund
   * @param {Object} mutualFund - { id, currentValue }
   * @param {Array} allocations - [{ stockSymbol, allocationPercent }]
   * @param {Map} stockPrices - Map of symbol -> price
   * @returns {Array} - [{ stockSymbol, indirectShares, mutualFundId }]
   */
  calculateIndirectHoldings(mutualFund, allocations, stockPrices);

  /**
   * Calculate indirect holdings for all mutual funds
   * @returns {Promise<Array>} - Array of indirect holding objects
   */
  async calculateAllIndirectHoldings();

  /**
   * Aggregate indirect holdings by stock symbol
   * @param {Array} indirectHoldings - Raw indirect holdings
   * @returns {Map} - Map of symbol -> { totalShares, breakdown: [{mfId, shares}] }
   */
  aggregateIndirectHoldings(indirectHoldings);
}
```

### 4. Consolidated Holdings Service (Main Process)

**Responsibilities:**
- Combine direct and indirect holdings
- Calculate total values and allocation percentages
- Sort and format data for display

**Interface:**

```javascript
class ConsolidatedHoldingsService {
  /**
   * Get consolidated holdings combining direct and indirect exposure
   * @returns {Promise<Object>} - { holdings, summary }
   */
  async getConsolidatedHoldings();

  /**
   * Get direct holdings from transaction history
   * @returns {Promise<Map>} - Map of symbol -> { shares, avgCost }
   */
  async getDirectHoldings();

  /**
   * Calculate portfolio summary statistics
   * @param {Array} holdings - Consolidated holdings array
   * @returns {Object} - { totalValue, directValue, indirectValue }
   */
  calculatePortfolioSummary(holdings);
}
```

### 5. React Components (Renderer Process)

**MutualFundsPage Component:**
- Display list of mutual funds
- Add/Edit/Delete mutual fund forms
- CSV file upload interface

**ConsolidatedHoldingsPage Component:**
- Display table of consolidated holdings
- Show direct vs indirect breakdown
- Display allocation percentages
- Sort by total value

**MutualFundForm Component:**
- Input fields for scheme name, current value, investment date
- CSV file picker
- Validation feedback
- Submit handler

## Data Models

### Database Schema

**mutual_funds table:**
```sql
CREATE TABLE mutual_funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_name TEXT NOT NULL,
  current_value REAL NOT NULL CHECK(current_value > 0),
  investment_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**mutual_fund_allocations table:**
```sql
CREATE TABLE mutual_fund_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mutual_fund_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  allocation_percent REAL NOT NULL CHECK(allocation_percent >= 0 AND allocation_percent <= 100),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mutual_fund_id) REFERENCES mutual_funds(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_symbol) REFERENCES stocks(scrip_cd) ON DELETE RESTRICT
);

CREATE INDEX idx_mf_allocations_mf_id ON mutual_fund_allocations(mutual_fund_id);
CREATE INDEX idx_mf_allocations_stock ON mutual_fund_allocations(stock_symbol);
```

### Application Data Structures

**MutualFund:**
```javascript
{
  id: number,
  schemeName: string,
  currentValue: number,  // in INR
  investmentDate: string,  // ISO date format
  allocations: [
    {
      stockSymbol: string,
      stockName: string,
      allocationPercent: number  // 0-100
    }
  ],
  createdAt: string,
  updatedAt: string
}
```

**ConsolidatedHolding:**
```javascript
{
  stockSymbol: string,
  stockName: string,
  currentPrice: number,
  directHoldings: {
    shares: number,
    value: number,
    avgCost: number
  },
  indirectHoldings: {
    totalShares: number,
    totalValue: number,
    breakdown: [
      {
        mutualFundId: number,
        mutualFundName: string,
        shares: number,
        value: number
      }
    ]
  },
  totalHoldings: {
    shares: number,
    value: number
  },
  allocationPercent: number  // % of total portfolio
}
```

**CSVValidationResult:**
```javascript
{
  success: boolean,
  data: [
    {
      stockSymbol: string,
      stockName: string,
      allocationPercent: number
    }
  ],
  errors: [
    {
      row: number,
      field: string,
      message: string
    }
  ],
  warnings: [
    {
      type: string,
      message: string
    }
  ]
}
```

## Calculation Algorithms

### Indirect Holdings Calculation

For each mutual fund and each stock allocation:

```
indirect_shares = (mutual_fund_current_value × allocation_percent / 100) / stock_current_price
```

**Example:**
- Mutual Fund: ₹1,00,000 current value
- Stock Allocation: 5% to Reliance (RIL)
- RIL Current Price: ₹2,000

```
indirect_shares = (100000 × 5 / 100) / 2000
                = 5000 / 2000
                = 2.5 shares
```

**Edge Cases:**
- If stock price is 0 or unavailable: Skip that stock, log warning
- If allocation percent is 0: Skip calculation
- Round result to 4 decimal places

### Allocation Percentage Calculation

For each stock in consolidated view:

```
allocation_percent = (stock_total_value / total_portfolio_value) × 100
```

Where:
- `stock_total_value = (direct_shares + indirect_shares) × current_price`
- `total_portfolio_value = sum of all direct equity values + sum of all mutual fund current values`

### CSV Validation Algorithm

```javascript
function validateCSV(csvData) {
  const errors = [];
  const warnings = [];
  const allocations = [];
  let totalPercent = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    
    // Validate required fields
    if (!row.stockSymbol || !row.allocationPercent) {
      errors.push({ row: i + 1, message: 'Missing required fields' });
      continue;
    }

    // Validate allocation percent range
    const percent = parseFloat(row.allocationPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      errors.push({ row: i + 1, field: 'allocationPercent', message: 'Must be between 0 and 100' });
      continue;
    }

    // Validate stock symbol exists
    const stockExists = await validateStockSymbol(row.stockSymbol);
    if (!stockExists) {
      errors.push({ row: i + 1, field: 'stockSymbol', message: `Invalid stock symbol: ${row.stockSymbol}` });
      continue;
    }

    totalPercent += percent;
    allocations.push({
      stockSymbol: row.stockSymbol,
      stockName: row.stockName || '',
      allocationPercent: percent
    });
  }

  // Validate total percentage
  if (totalPercent < 95 || totalPercent > 105) {
    warnings.push({
      type: 'allocation_sum',
      message: `Allocations sum to ${totalPercent.toFixed(2)}%, expected ~100%`
    });
  }

  return {
    success: errors.length === 0,
    data: allocations,
    errors,
    warnings
  };
}
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Mutual Fund Data Persistence

*For any* valid mutual fund with scheme name, current value, and investment date, adding it to the system should result in the mutual fund being retrievable from the database with all fields intact.

**Validates: Requirements 1.1, 6.1**

### Property 2: Mutual Fund List Sorting

*For any* set of mutual funds with different investment dates, retrieving the mutual funds list should return them sorted by investment date in ascending order.

**Validates: Requirements 1.2**

### Property 3: Mutual Fund Update Persistence

*For any* existing mutual fund and any valid updates to its fields, updating the mutual fund should result in the changes being persisted and retrievable from the database.

**Validates: Requirements 1.3**

### Property 4: Cascade Deletion

*For any* mutual fund with associated stock allocations, deleting the mutual fund should result in both the mutual fund and all its allocations being removed from the database.

**Validates: Requirements 1.4, 6.3**

### Property 5: Current Value Validation

*For any* mutual fund data with current value less than or equal to zero, the system should reject the addition or update with a validation error.

**Validates: Requirements 1.5**

### Property 6: Investment Date Validation

*For any* mutual fund data with an investment date in the future, the system should reject the addition or update with a validation error.

**Validates: Requirements 1.6**

### Property 7: CSV Parsing Correctness

*For any* valid CSV file with Stock Symbol, Stock Name, and Allocation Percentage columns, the CSV parser should extract all rows into structured allocation objects.

**Validates: Requirements 2.1**

### Property 8: Allocation Percentage Range Validation

*For any* CSV row with an allocation percentage outside the range [0, 100], the CSV validator should reject the import with a descriptive error.

**Validates: Requirements 2.2**

### Property 9: Allocation Sum Validation

*For any* set of allocations where the sum of percentages is outside the range [95, 105], the CSV validator should return a warning with the actual sum.

**Validates: Requirements 2.3**

### Property 10: Stock Symbol Validation

*For any* CSV row with a stock symbol that does not exist in the BSE stock master data, the CSV validator should reject the import with an error identifying the invalid symbol.

**Validates: Requirements 2.4, 2.5**

### Property 11: Allocation Persistence After CSV Import

*For any* valid CSV file that passes validation, importing it should result in all allocations being stored in the database linked to the correct mutual fund.

**Validates: Requirements 2.7, 6.2**

### Property 12: Indirect Holdings Calculation Formula

*For any* mutual fund with current value V, stock allocation percentage P, and stock current price S (where S > 0), the calculated indirect shares should equal (V × P / 100) / S, rounded to 4 decimal places.

**Validates: Requirements 3.1, 3.5**

### Property 13: Indirect Holdings Aggregation

*For any* stock that appears in multiple mutual funds, the total indirect holdings should equal the sum of indirect shares calculated from each mutual fund.

**Validates: Requirements 3.2**

### Property 14: Indirect Holdings Recalculation Consistency

*For any* mutual fund, when its current value is updated or when stock prices are refreshed, the indirect holdings should be recalculated to reflect the new values.

**Validates: Requirements 3.6, 3.7**

### Property 15: Consolidated Holdings Arithmetic

*For any* stock in the consolidated view, the total holdings should equal direct holdings plus indirect holdings, and the total value should equal total holdings multiplied by current price.

**Validates: Requirements 4.3, 4.4**

### Property 16: Allocation Percentage Calculation

*For any* stock in the consolidated view with total value V and total portfolio value P, the allocation percentage should equal (V / P) × 100, formatted to 2 decimal places.

**Validates: Requirements 4.5, 4.10**

### Property 17: Consolidated Holdings Sorting

*For any* set of consolidated holdings, they should be sorted by total value in descending order.

**Validates: Requirements 4.6**

### Property 18: Direct Holdings Display

*For any* stock with direct holdings from transactions, the consolidated view should display the correct direct holdings quantity.

**Validates: Requirements 4.1**

### Property 19: Indirect Holdings Breakdown

*For any* stock with indirect holdings from multiple mutual funds, the consolidated view should display the breakdown showing shares from each mutual fund source.

**Validates: Requirements 4.2**

### Property 20: Indian Currency Formatting

*For any* currency value displayed in the system, it should be formatted with the ₹ symbol and Indian numbering system (lakhs and crores for large values).

**Validates: Requirements 4.9, 5.4**

### Property 21: Portfolio Value Summation

*For any* portfolio with direct equity holdings and mutual fund investments, the total portfolio value should equal the sum of direct equity value and total mutual fund value.

**Validates: Requirements 5.1, 5.3**

### Property 22: Referential Integrity - Mutual Fund to Allocations

*For any* stock allocation, it must reference a valid mutual fund ID that exists in the mutual_funds table.

**Validates: Requirements 6.4**

### Property 23: Referential Integrity - Allocation to Stock Master

*For any* stock allocation, the stock symbol must reference a valid BSE scrip code in the stock master data.

**Validates: Requirements 6.5**

### Property 24: CSV Validation Error Messages

*For any* invalid CSV file, the validation errors should include specific information about which rows and fields are invalid.

**Validates: Requirements 7.1**

### Property 25: Form Input Preservation on Validation Error

*For any* form submission that fails validation, the user's input should be preserved in the form fields to allow correction without re-entry.

**Validates: Requirements 7.4**

### Property 26: Error Logging

*For any* error that occurs in the system, it should be logged with sufficient detail to support troubleshooting.

**Validates: Requirements 7.5**

## Error Handling

### CSV Import Errors

**Invalid File Format:**
- Error: "Invalid CSV format. Expected columns: Stock Symbol, Stock Name, Allocation Percentage"
- Action: Reject import, preserve user's file selection

**Invalid Stock Symbol:**
- Error: "Row {N}: Invalid stock symbol '{SYMBOL}'. Stock not found in BSE master data."
- Action: Reject import, highlight specific rows with errors

**Invalid Allocation Percentage:**
- Error: "Row {N}: Allocation percentage must be between 0 and 100. Got: {VALUE}"
- Action: Reject import, highlight specific rows with errors

**Allocation Sum Warning:**
- Warning: "Allocations sum to {SUM}%, expected approximately 100%"
- Action: Allow import with warning, log for user review

### Database Errors

**Foreign Key Violation:**
- Error: "Cannot add allocation: Invalid stock symbol or mutual fund reference"
- Action: Rollback transaction, display error to user

**Constraint Violation:**
- Error: "Invalid data: {CONSTRAINT_MESSAGE}"
- Action: Rollback transaction, display validation error

**Connection Error:**
- Error: "Database connection failed. Please restart the application."
- Action: Log error, display user-friendly message

### Calculation Errors

**Missing Stock Price:**
- Warning: "Price unavailable for {STOCK_NAME}. Indirect holdings may be incomplete."
- Action: Exclude stock from calculations, log warning

**Zero Stock Price:**
- Warning: "Price is zero for {STOCK_NAME}. Indirect holdings excluded."
- Action: Exclude stock from calculations, log warning

### General Error Handling Strategy

1. **Validation Errors**: Display inline with form fields, preserve user input
2. **Database Errors**: Rollback transactions, display user-friendly messages
3. **Calculation Errors**: Log warnings, exclude problematic data, continue processing
4. **API Errors**: Display warnings, use cached prices if available
5. **All Errors**: Log to file with timestamp, context, and stack trace

## Testing Strategy

### Unit Testing

Unit tests will focus on specific examples, edge cases, and error conditions:

**CSV Validation:**
- Test parsing valid CSV with 3 stocks
- Test parsing CSV with missing columns
- Test parsing CSV with invalid percentages
- Test parsing CSV with unknown stock symbols
- Test allocation sum validation (80%, 100%, 120%)

**Calculation Functions:**
- Test indirect holdings calculation with known values
- Test rounding to 4 decimal places
- Test aggregation of holdings from 2 mutual funds
- Test handling of zero/null prices

**Database Operations:**
- Test adding mutual fund with allocations
- Test cascade deletion
- Test foreign key constraints
- Test transaction rollback on error

**Formatting Functions:**
- Test Indian Rupee formatting (₹1,23,456.78)
- Test lakhs notation (₹1.5L)
- Test crores notation (₹2.3Cr)
- Test percentage formatting (12.34%)

### Property-Based Testing

Property tests will verify universal properties across all inputs using a property-based testing library (fast-check for JavaScript/TypeScript). Each test will run a minimum of 100 iterations with randomly generated inputs.

**Configuration:**
- Library: fast-check (npm package)
- Iterations per test: 100 minimum
- Tag format: `// Feature: mutual-fund-integration, Property {N}: {description}`

**Property Test Coverage:**
- All 26 correctness properties listed above
- Each property maps to one or more property-based tests
- Tests generate random valid inputs and verify properties hold
- Edge cases (zero prices, empty lists) handled by generators

**Example Property Test Structure:**

```javascript
// Feature: mutual-fund-integration, Property 12: Indirect Holdings Calculation Formula
test('indirect holdings calculation is correct', () => {
  fc.assert(
    fc.property(
      fc.record({
        currentValue: fc.float({ min: 1000, max: 10000000 }),
        allocationPercent: fc.float({ min: 0.01, max: 100 }),
        stockPrice: fc.float({ min: 1, max: 100000 })
      }),
      ({ currentValue, allocationPercent, stockPrice }) => {
        const expected = (currentValue * allocationPercent / 100) / stockPrice;
        const result = calculateIndirectShares(currentValue, allocationPercent, stockPrice);
        return Math.abs(result - expected) < 0.00005; // 4 decimal places
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify complete workflows:

**Add Mutual Fund Workflow:**
1. User fills form with mutual fund details
2. User uploads valid CSV file
3. System validates and stores data
4. User views mutual fund in list
5. Verify database contains mutual fund and allocations

**Consolidated Holdings Workflow:**
1. Create direct holdings via transactions
2. Add mutual funds with stock allocations
3. Refresh stock prices
4. View consolidated holdings page
5. Verify direct + indirect holdings displayed correctly
6. Verify allocation percentages sum to 100%

**Update and Recalculation Workflow:**
1. Add mutual fund with allocations
2. View consolidated holdings
3. Update mutual fund current value
4. View consolidated holdings again
5. Verify indirect holdings recalculated

### Test Data

**Sample Mutual Funds:**
- HDFC Equity Fund: ₹5,00,000
- ICICI Bluechip Fund: ₹3,00,000
- SBI Large Cap Fund: ₹2,00,000

**Sample Stock Allocations:**
- Reliance (RIL): 8%, 5%, 6%
- TCS: 7%, 6%, 5%
- HDFC Bank: 6%, 7%, 8%
- Infosys: 5%, 4%, 6%

**Expected Calculations:**
- RIL indirect holdings: (500000×0.08 + 300000×0.05 + 200000×0.06) / RIL_price
- Total portfolio value: Direct equity + ₹10,00,000 (mutual funds)

### Manual Testing Checklist

- [ ] Add mutual fund with valid CSV import
- [ ] Add mutual fund with invalid CSV (missing columns)
- [ ] Add mutual fund with invalid stock symbols
- [ ] Add mutual fund with allocation sum ≠ 100%
- [ ] Edit mutual fund current value
- [ ] Delete mutual fund and verify allocations removed
- [ ] View consolidated holdings with direct + indirect
- [ ] View consolidated holdings with only direct
- [ ] View consolidated holdings with only indirect
- [ ] Verify Indian Rupee formatting throughout
- [ ] Verify allocation percentages sum to 100%
- [ ] Test with 50+ stocks in CSV
- [ ] Test with missing stock prices
- [ ] Restart application and verify data persists
