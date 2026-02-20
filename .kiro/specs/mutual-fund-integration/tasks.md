# Implementation Plan: Mutual Fund Integration

## Overview

This implementation plan breaks down the mutual fund integration feature into discrete coding tasks. The approach follows a bottom-up strategy: database schema first, then backend services, then frontend components, with testing integrated throughout. Each task builds on previous work to ensure incremental progress and early validation.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create mutual_funds table schema
    - Create migration file for mutual_funds table with columns: id, scheme_name, current_value, investment_date, created_at, updated_at
    - Add CHECK constraint for current_value > 0
    - _Requirements: 1.1, 1.5, 6.1_
  
  - [x] 1.2 Create mutual_fund_allocations table schema
    - Create migration file for mutual_fund_allocations table with columns: id, mutual_fund_id, stock_symbol, stock_name, allocation_percent, created_at
    - Add CHECK constraint for allocation_percent between 0 and 100
    - Add FOREIGN KEY to mutual_funds with ON DELETE CASCADE
    - Add FOREIGN KEY to stocks table (scrip_cd) with ON DELETE RESTRICT
    - Create indexes on mutual_fund_id and stock_symbol
    - _Requirements: 2.2, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 1.3 Write property test for database schema constraints
    - **Property 5: Current Value Validation**
    - **Property 22: Referential Integrity - Mutual Fund to Allocations**
    - **Property 23: Referential Integrity - Allocation to Stock Master**
    - _Requirements: 1.5, 6.4, 6.5_

- [x] 2. CSV Import Validator service
  - [x] 2.1 Implement CSV parsing logic
    - Create CSVImportValidator class in src/main/services/
    - Implement parseCSVContent() method to parse CSV into structured data
    - Handle CSV files with Stock Symbol, Stock Name, Allocation Percentage columns
    - _Requirements: 2.1_
  
  - [x] 2.2 Implement stock symbol validation
    - Implement validateStockSymbol() method to check against BSE stock master
    - Query stocks table for matching scrip_cd
    - _Requirements: 2.4_
  
  - [x] 2.3 Implement allocation percentage validation
    - Implement validateAllocationSum() method
    - Check each percentage is between 0 and 100
    - Check sum is between 95% and 105%
    - Return errors for invalid percentages, warnings for sum outside range
    - _Requirements: 2.2, 2.3_
  
  - [x] 2.4 Implement main validateCSV() method
    - Orchestrate parsing and all validation checks
    - Return structured result with success flag, data, errors, and warnings
    - Handle up to 500 stock entries per CSV
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.8_
  
  - [ ]* 2.5 Write property tests for CSV validation
    - **Property 7: CSV Parsing Correctness**
    - **Property 8: Allocation Percentage Range Validation**
    - **Property 9: Allocation Sum Validation**
    - **Property 10: Stock Symbol Validation**
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Mutual Fund Service
  - [x] 3.1 Implement addMutualFund() method
    - Create MutualFundService class in src/main/services/
    - Implement transaction-based insert for mutual fund and allocations
    - Validate current value is positive
    - Validate investment date is not in future
    - Return mutual fund ID on success
    - _Requirements: 1.1, 1.5, 1.6_
  
  - [x] 3.2 Implement getAllMutualFunds() method
    - Query mutual_funds table with LEFT JOIN to allocations
    - Sort by investment_date ASC
    - Return array of mutual fund objects with nested allocations
    - _Requirements: 1.2_
  
  - [x] 3.3 Implement getMutualFundById() method
    - Query single mutual fund with allocations
    - Return null if not found
    - _Requirements: 1.2_
  
  - [x] 3.4 Implement updateMutualFund() method
    - Update scheme_name, current_value, or investment_date
    - Validate updated values
    - Return updated mutual fund object
    - _Requirements: 1.3_
  
  - [x] 3.5 Implement deleteMutualFund() method
    - Delete mutual fund record (cascade will handle allocations)
    - Return success/failure
    - _Requirements: 1.4_
  
  - [ ]* 3.6 Write property tests for Mutual Fund Service
    - **Property 1: Mutual Fund Data Persistence**
    - **Property 2: Mutual Fund List Sorting**
    - **Property 3: Mutual Fund Update Persistence**
    - **Property 4: Cascade Deletion**
    - **Property 6: Investment Date Validation**
    - **Property 11: Allocation Persistence After CSV Import**
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.7_

- [x] 4. Stock Exposure Calculator service
  - [x] 4.1 Implement calculateIndirectHoldings() for single mutual fund
    - Create StockExposureCalculator class in src/main/services/
    - Implement formula: (currentValue × allocationPercent / 100) / stockPrice
    - Round result to 4 decimal places
    - Skip stocks with zero or null prices
    - Return array of { stockSymbol, indirectShares, mutualFundId }
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Implement calculateAllIndirectHoldings() method
    - Get all mutual funds with allocations
    - Get current stock prices from price cache or API
    - Calculate indirect holdings for each mutual fund
    - Return combined array of all indirect holdings
    - _Requirements: 3.1_
  
  - [x] 4.3 Implement aggregateIndirectHoldings() method
    - Group indirect holdings by stock symbol
    - Sum shares for each stock across all mutual funds
    - Maintain breakdown by mutual fund source
    - Return Map of symbol -> { totalShares, breakdown }
    - _Requirements: 3.2_
  
  - [ ]* 4.4 Write property tests for Stock Exposure Calculator
    - **Property 12: Indirect Holdings Calculation Formula**
    - **Property 13: Indirect Holdings Aggregation**
    - **Property 14: Indirect Holdings Recalculation Consistency**
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_

- [x] 5. Consolidated Holdings Service
  - [x] 5.1 Implement getDirectHoldings() method
    - Create ConsolidatedHoldingsService class in src/main/services/
    - Query transactions to calculate current holdings using existing FIFO logic
    - Return Map of symbol -> { shares, avgCost }
    - _Requirements: 4.1_
  
  - [x] 5.2 Implement getConsolidatedHoldings() method
    - Get direct holdings from transactions
    - Get indirect holdings from StockExposureCalculator
    - Get current stock prices
    - Combine direct and indirect for each stock
    - Calculate total holdings, total value, allocation percentage
    - Sort by total value descending
    - Return { holdings, summary }
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 5.3 Implement calculatePortfolioSummary() method
    - Sum direct equity values
    - Sum mutual fund current values
    - Calculate total portfolio value
    - Return { totalValue, directValue, indirectValue, mutualFundValue }
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 5.4 Write property tests for Consolidated Holdings Service
    - **Property 15: Consolidated Holdings Arithmetic**
    - **Property 16: Allocation Percentage Calculation**
    - **Property 17: Consolidated Holdings Sorting**
    - **Property 18: Direct Holdings Display**
    - **Property 19: Indirect Holdings Breakdown**
    - **Property 21: Portfolio Value Summation**
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.3_

- [x] 6. IPC handlers for main process
  - [x] 6.1 Create mutual fund IPC handlers
    - Create src/main/ipc/mutualFundHandler.js
    - Register handlers for: add-mutual-fund, get-all-mutual-funds, get-mutual-fund, update-mutual-fund, delete-mutual-fund
    - Wire handlers to MutualFundService methods
    - Handle errors and return appropriate responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 6.2 Create CSV import IPC handler
    - Register handler for: import-mutual-fund-csv
    - Wire to CSVImportValidator.validateCSV()
    - Return validation results with errors/warnings
    - _Requirements: 2.1, 2.4, 2.5, 2.6_
  
  - [x] 6.3 Create consolidated holdings IPC handler
    - Register handler for: get-consolidated-holdings
    - Wire to ConsolidatedHoldingsService.getConsolidatedHoldings()
    - Return consolidated holdings data
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 6.4 Register all handlers in main.js
    - Import and register all mutual fund IPC handlers
    - Add error logging for all handlers
    - _Requirements: 7.5_

- [x] 7. Checkpoint - Backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Frontend API utilities
  - [ ] 8.1 Create mutual fund API client
    - Create src/utils/api/mutualFundAPI.js
    - Implement functions: addMutualFund(), getAllMutualFunds(), getMutualFund(), updateMutualFund(), deleteMutualFund()
    - Use ipcRenderer to communicate with main process
    - Handle promise-based responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 8.2 Create CSV import API client
    - Add importMutualFundCSV() function to mutualFundAPI.js
    - Handle file path parameter
    - Return validation results
    - _Requirements: 2.1_
  
  - [ ] 8.3 Create consolidated holdings API client
    - Create src/utils/api/consolidatedHoldingsAPI.js
    - Implement getConsolidatedHoldings() function
    - Return consolidated holdings data
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 9. Mutual Funds management page
  - [ ] 9.1 Create MutualFundsPage component
    - Create src/pages/MutualFunds/MutualFundsPage.js
    - Display list of mutual funds in table format
    - Show scheme name, current value, investment date
    - Add "Add Mutual Fund" button
    - Add Edit/Delete buttons for each row
    - _Requirements: 1.2_
  
  - [ ] 9.2 Create MutualFundForm component
    - Create src/components/MutualFunds/MutualFundForm.js
    - Input fields: scheme name, current value, investment date
    - CSV file picker for stock allocations
    - Validation feedback display
    - Submit handler to call addMutualFund API
    - _Requirements: 1.1, 1.5, 1.6, 2.1_
  
  - [ ] 9.3 Implement CSV file upload and validation
    - Handle file selection in MutualFundForm
    - Call importMutualFundCSV API for validation
    - Display validation errors and warnings
    - Preserve form data on validation errors
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 7.1, 7.4_
  
  - [ ] 9.4 Implement edit mutual fund functionality
    - Create edit mode in MutualFundForm
    - Pre-populate form with existing data
    - Call updateMutualFund API on submit
    - Trigger recalculation of indirect holdings
    - _Requirements: 1.3, 3.6_
  
  - [ ] 9.5 Implement delete mutual fund functionality
    - Add confirmation dialog for delete action
    - Call deleteMutualFund API
    - Refresh mutual funds list after deletion
    - _Requirements: 1.4_
  
  - [ ] 9.6 Add styling for MutualFundsPage
    - Create src/pages/MutualFunds/MutualFundsPage.css
    - Style table, buttons, form
    - Use Indian Rupee formatting for values
    - Use DD-MMM-YYYY format for dates
    - _Requirements: 4.9, 5.4_

- [ ] 10. Consolidated Holdings page
  - [ ] 10.1 Create ConsolidatedHoldingsPage component
    - Create src/pages/ConsolidatedHoldings/ConsolidatedHoldingsPage.js
    - Display table with columns: Stock Name, Direct Holdings, Indirect Holdings, Total Holdings, Total Value, Allocation %
    - Fetch data using getConsolidatedHoldings API
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 10.2 Implement indirect holdings breakdown display
    - Add expandable rows or tooltip to show breakdown by mutual fund
    - Display mutual fund name and shares for each indirect holding source
    - _Requirements: 4.2_
  
  - [ ] 10.3 Implement portfolio summary section
    - Display total portfolio value
    - Display direct equity value
    - Display mutual fund value
    - Show breakdown percentages
    - _Requirements: 5.2, 5.3_
  
  - [ ] 10.4 Add formatting for consolidated holdings display
    - Format currency values with ₹ symbol and Indian numbering (lakhs/crores)
    - Format allocation percentages to 2 decimal places
    - Format share quantities to 4 decimal places
    - _Requirements: 4.9, 4.10, 5.4_
  
  - [ ] 10.5 Add styling for ConsolidatedHoldingsPage
    - Create src/pages/ConsolidatedHoldings/ConsolidatedHoldingsPage.css
    - Style table with alternating rows
    - Highlight stocks with high allocation percentages
    - Add responsive design for smaller screens
    - _Requirements: 4.9_
  
  - [ ]* 10.6 Write property tests for formatting functions
    - **Property 20: Indian Currency Formatting**
    - _Requirements: 4.9, 5.4_

- [ ] 11. Navigation and routing
  - [ ] 11.1 Add Mutual Funds page to navigation
    - Update main navigation menu to include "Mutual Funds" link
    - Add route for /mutual-funds path
    - _Requirements: 1.2_
  
  - [ ] 11.2 Add Consolidated Holdings page to navigation
    - Update main navigation menu to include "Consolidated Holdings" link
    - Add route for /consolidated-holdings path
    - _Requirements: 4.1_

- [ ] 12. Error handling and user feedback
  - [ ] 12.1 Implement error display components
    - Create ErrorMessage component for displaying validation errors
    - Create WarningMessage component for displaying warnings
    - Use in MutualFundForm for CSV validation feedback
    - _Requirements: 7.1, 7.2_
  
  - [ ] 12.2 Add error logging throughout the system
    - Ensure all service methods log errors with context
    - Log to file with timestamp and stack trace
    - _Requirements: 7.5_
  
  - [ ] 12.3 Implement user-friendly error messages
    - Map technical errors to user-friendly messages
    - Display specific field errors inline with form fields
    - Show toast notifications for success/error actions
    - _Requirements: 7.1, 7.4_
  
  - [ ]* 12.4 Write property tests for error handling
    - **Property 24: CSV Validation Error Messages**
    - **Property 25: Form Input Preservation on Validation Error**
    - **Property 26: Error Logging**
    - _Requirements: 7.1, 7.4, 7.5_

- [ ] 13. Integration and data consistency
  - [ ] 13.1 Implement recalculation trigger on mutual fund update
    - When mutual fund current value is updated, trigger recalculation of indirect holdings
    - Update consolidated holdings cache if exists
    - _Requirements: 3.6_
  
  - [ ] 13.2 Implement recalculation trigger on price refresh
    - When stock prices are refreshed, trigger recalculation of indirect holdings
    - Update consolidated holdings display if page is active
    - _Requirements: 3.7_
  
  - [ ] 13.3 Add data persistence verification on app start
    - Load mutual funds from database on application startup
    - Verify data integrity
    - _Requirements: 6.6_

- [ ] 14. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Documentation and cleanup
  - [ ] 15.1 Add JSDoc comments to all service methods
    - Document parameters, return types, and behavior
    - Include examples for complex methods
  
  - [ ] 15.2 Update README with mutual fund feature documentation
    - Document CSV file format requirements
    - Provide example CSV file
    - Explain consolidated holdings calculation

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows bottom-up approach: database → services → API → UI
- All currency values use Indian Rupee formatting (₹, lakhs, crores)
- All dates use DD-MMM-YYYY format
- CSV files can contain up to 500 stock entries per mutual fund
