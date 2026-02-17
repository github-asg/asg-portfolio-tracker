# Implementation Plan: BSE Scrip Master Integration

## Overview

This implementation plan breaks down the BSE Scrip Master integration into discrete, incremental coding tasks. Each task builds on previous work, starting with core data loading and lookup functionality, then extending to API integration, database updates, and finally UI enhancements. The plan ensures that functionality is validated early through tests and checkpoints.

## Tasks

- [ ] 1. Create BSE Scrip Loader module
  - [x] 1.1 Implement BSE Scrip Loader class
    - Create `src/main/data/bseScripLoader.js`
    - Implement `loadScripMaster()` method to read and parse BSEScripMaster.txt
    - Implement `parseLine()` method to handle pipe-delimited format with quoted fields
    - Implement `validateRecord()` method to check required fields (Token, ShortName, ScripName)
    - Handle file not found gracefully (return empty array)
    - Handle malformed lines (skip and log warnings)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 1.2 Write property test for parsing valid lines
    - **Property 1: Parse Valid Pipe-Delimited Lines**
    - **Validates: Requirements 1.2**
  
  - [ ]* 1.3 Write property test for handling malformed lines
    - **Property 2: Handle Malformed Lines Gracefully**
    - **Validates: Requirements 1.5**
  
  - [ ]* 1.4 Write property test for required fields validation
    - **Property 14: Required Fields Validation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 1.5 Write property test for non-numeric value handling
    - **Property 15: Non-Numeric Values Stored As Null**
    - **Validates: Requirements 8.3**
  
  - [ ]* 1.6 Write property test for invalid ISIN codes
    - **Property 16: Invalid ISIN Codes Stored With Warning**
    - **Validates: Requirements 8.4**
  
  - [ ]* 1.7 Write unit test for file loading
    - Test loading sample file with 10 known records
    - Test handling missing file (edge case)
    - Test handling empty file (edge case)

- [ ] 2. Create Stock Lookup Service
  - [x] 2.1 Implement Stock Lookup Service class
    - Create `src/main/services/stockLookupService.js`
    - Implement `initialize()` method to build indexes (Map objects for ScripCode, ShortName, CompanyName)
    - Implement `lookupByScripCode()` method
    - Implement `lookupByShortName()` method
    - Implement `searchByCompanyName()` method (case-insensitive, max 20 results)
    - Implement `getUnmappedCodes()` method to track failed lookups
    - Implement `isReady()` method
    - Sanitize all input parameters (trim, uppercase for codes)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.6, 8.5_
  
  - [ ]* 2.2 Write property test for successful lookups
    - **Property 3: Successful Lookup Returns Complete Data**
    - **Validates: Requirements 2.4**
  
  - [ ]* 2.3 Write property test for failed lookups
    - **Property 4: Failed Lookup Returns Null**
    - **Validates: Requirements 2.5, 6.1**
  
  - [ ]* 2.4 Write property test for unmapped code tracking
    - **Property 13: Unmapped Codes Are Tracked**
    - **Validates: Requirements 6.6**
  
  - [ ]* 2.5 Write property test for input sanitization
    - **Property 17: Input Sanitization Prevents Injection**
    - **Validates: Requirements 8.5**
  
  - [ ]* 2.6 Write unit test for service initialization
    - Test initialization with empty data
    - Test that service doesn't reload during runtime

- [ ] 3. Integrate BSE Scrip Loader with application startup
  - [x] 3.1 Update main process to load BSE data at startup
    - Modify `src/main/main.js` to load BSEScripMaster.txt on app ready
    - Initialize Stock Lookup Service with loaded data
    - Handle missing file gracefully (log warning, continue with degraded mode)
    - Log successful load with record count
    - _Requirements: 1.1, 1.4, 6.2_
  
  - [ ]* 3.2 Write unit test for startup integration
    - Test that BSE data loads on startup
    - Test graceful degradation when file is missing (edge case)

- [x] 4. Checkpoint - Verify BSE data loading
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create IPC handlers for Stock Lookup Service
  - [x] 5.1 Implement IPC handlers
    - Create `src/main/ipc/stockLookupHandler.js`
    - Register handler for `stock:lookup-by-code`
    - Register handler for `stock:lookup-by-shortname`
    - Register handler for `stock:search-by-name`
    - Register handler for `stock:get-unmapped`
    - Validate input parameters before calling service
    - Return consistent error format for failures
    - _Requirements: 2.6_
  
  - [ ]* 5.2 Write unit test for IPC communication
    - Test IPC handlers respond correctly
    - Test error handling for invalid inputs

- [ ] 6. Update Price Manager to use BSE ShortName
  - [x] 6.1 Modify Price Manager for BSE integration
    - Modify `src/main/api/priceManager.js`
    - Inject Stock Lookup Service dependency
    - Implement `mapStockCodes()` method to convert user codes to BSE ShortNames
    - Update `fetchPrices()` to use mapped ShortNames
    - Change exchange parameter from "NSE" to "BSE" in API calls
    - Log warnings for unmapped stock codes
    - Skip unmapped stocks and continue with others
    - Cache results using original user stock code as key
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.4_
  
  - [ ]* 6.2 Write property test for ShortName mapping
    - **Property 5: Price Manager Uses Correct BSE ShortName**
    - **Validates: Requirements 3.1**
  
  - [ ]* 6.3 Write property test for BSE exchange parameter
    - **Property 6: API Calls Use BSE Exchange**
    - **Validates: Requirements 3.2**
  
  - [ ]* 6.4 Write property test for unmapped stock handling
    - **Property 7: Unmapped Stocks Are Skipped With Warning**
    - **Validates: Requirements 3.3, 6.4**
  
  - [ ]* 6.5 Write property test for cache key usage
    - **Property 8: Price Cache Uses Original Stock Code**
    - **Validates: Requirements 3.4**

- [ ] 7. Create database migration for BSE fields
  - [x] 7.1 Implement database migration
    - Create `src/main/database/migrations/add-bse-fields.js`
    - Add columns: bse_short_name, scrip_name, isin_code, week_52_high, week_52_low
    - Make migration idempotent (check if columns exist)
    - Create indexes on bse_short_name and isin_code
    - Populate existing stock records with BSE data from Stock Lookup Service
    - Handle migration failure (log error, prevent startup)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.5_
  
  - [ ]* 7.2 Write property test for migration population
    - **Property 11: Migration Populates BSE Fields**
    - **Validates: Requirements 5.7**
  
  - [ ]* 7.3 Write unit test for migration
    - Test migration on database with old schema
    - Test migration is idempotent
    - Test migration failure prevents startup (edge case)

- [ ] 8. Update stock insertion to auto-populate BSE fields
  - [x] 8.1 Modify stock insertion logic
    - Update stock insertion code in database service
    - Lookup BSE data from Stock Lookup Service before insert
    - Populate bse_short_name, scrip_name, isin_code, week_52_high, week_52_low
    - Handle lookup failure gracefully (insert without BSE data, log warning)
    - _Requirements: 5.8_
  
  - [ ]* 8.2 Write property test for auto-population
    - **Property 12: New Stocks Auto-Populate BSE Fields**
    - **Validates: Requirements 5.8**

- [x] 9. Checkpoint - Verify database and API integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Update Portfolio UI to display BSE information
  - [x] 10.1 Modify Portfolio component
    - Modify `src/pages/Portfolio.js`
    - Fetch BSE data for all stocks via IPC on component mount
    - Display ScripName (full company name) as primary text
    - Display BSE ShortName as secondary text
    - Add ISIN code field to stock details
    - Add 52-week high value with color indicator
    - Add 52-week low value with color indicator
    - Show original stock code with "(unmapped)" indicator for stocks without BSE data
    - Cache BSE data in component state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 6.3_
  
  - [x] 10.2 Update Portfolio CSS for new fields
    - Modify `src/pages/Portfolio.css`
    - Add styles for company name display (larger, bold)
    - Add styles for secondary info (BSE code, ISIN)
    - Add styles for 52-week high/low indicators
    - Add styles for unmapped stock indicator
  
  - [ ]* 10.3 Write property test for UI display
    - **Property 9: Portfolio UI Displays Complete Stock Information**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [ ]* 10.4 Write property test for unmapped stock display
    - **Property 10: Unmapped Stocks Show Original Code**
    - **Validates: Requirements 4.6, 6.3**
  
  - [ ]* 10.5 Write unit test for Portfolio component
    - Test component renders with BSE data
    - Test fallback display for unmapped stocks
    - Test loading states during IPC calls

- [ ] 11. Create IPC client utilities for renderer process
  - [x] 11.1 Create stock lookup client utility
    - Create `src/renderer/utils/stockLookupClient.js`
    - Implement wrapper functions for IPC calls
    - Add error handling and retry logic
    - Cache results to minimize IPC calls
    - _Requirements: 2.6_

- [ ] 12. Update Settings page to show BSE data status
  - [x] 12.1 Add BSE data status to Settings
    - Modify `src/pages/Settings.js`
    - Display BSE Scrip Master load status (loaded/not loaded)
    - Display total records loaded
    - Display count of unmapped stocks
    - Add button to view unmapped stocks list
    - _Requirements: 6.6_

- [ ] 13. Final checkpoint - Integration testing
  - [ ]* 13.1 Write integration test for complete startup flow
    - Test: Load file → Initialize service → Migrate database → UI displays data
  
  - [ ]* 13.2 Write integration test for price refresh flow
    - Test: User clicks refresh → Lookup codes → Call API → Cache results → Update UI
  
  - [ ]* 13.3 Write integration test for transaction entry flow
    - Test: User enters stock code → Validate → Auto-populate company name → Save with BSE data
  
  - [x] 13.4 Manual testing
    - Test on Windows with real BSEScripMaster.txt file
    - Test on macOS with real BSEScripMaster.txt file
    - Verify price refresh works with BSE exchange
    - Verify portfolio displays full company names
    - Verify ISIN and 52-week data appears correctly

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows
- The implementation follows the project structure defined in structure.md
- All code follows the conventions in tech.md (JavaScript, 2-space indentation, Indian formatting)
