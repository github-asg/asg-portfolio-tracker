# Implementation Plan: Stock Age Histogram

## Overview

This implementation plan breaks down the stock age histogram feature into discrete coding tasks. The feature provides investors with a visual representation of their portfolio holdings based on the age of each stock lot, helping with tax planning and portfolio analysis. Implementation follows a bottom-up approach: backend calculation services → IPC communication → React visualization components → integration.

## Tasks

- [x] 1. Implement age calculation and bucketing service
  - [x] 1.1 Create StockAgeCalculator class in main process
    - Create file `src/main/services/stockAgeCalculator.js`
    - Implement calculateLotAge(purchaseDate, currentDate) method returning age in days
    - Implement categorizeLotIntoBucket(ageInDays) method returning bucket name
    - Define age bucket constants: 0-6 months (0-182 days), 6-12 months (183-365 days), 1-2 years (366-730 days), 2-5 years (731-1825 days), 5+ years (1826+ days)
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.5_
  
  - [x] 1.2 Implement getUnsoldLotsForStock method
    - Query transactions table for buy transactions of specified stock
    - Query realized_gains table to determine matched quantities
    - Calculate remaining unsold quantity for each buy lot (buy quantity - matched quantity)
    - Return array of unsold lots with purchase_date, quantity, price
    - _Requirements: 1.2, 1.3, 9.1, 9.3, 9.5_
  
  - [x] 1.3 Implement calculateStockAgeDistribution method
    - Call getUnsoldLotsForStock to retrieve unsold lots
    - For each lot, calculate age and categorize into bucket
    - Aggregate quantities by bucket
    - Calculate percentages for each bucket (bucket quantity / total quantity × 100)
    - Return object with buckets, quantities, percentages, and total quantity
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4_
  
  - [x] 1.4 Implement calculatePortfolioAgeDistribution method
    - Query all stocks with current holdings from portfolio
    - For each stock, call calculateStockAgeDistribution
    - Aggregate quantities across all stocks by bucket
    - Calculate portfolio-wide percentages
    - Return aggregated distribution with total stocks count and total quantity
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [ ]* 1.5 Write property test for age calculation
    - **Property 1: Age Calculation Accuracy**
    - **Validates: Requirements 1.1, 1.4**
    - For any purchase date and current date, verify age in days equals date difference
  
  - [ ]* 1.6 Write property test for bucket categorization
    - **Property 2: Bucket Boundary Handling**
    - **Validates: Requirements 2.2**
    - For any age on bucket boundary, verify lot is placed in older bucket
  
  - [ ]* 1.7 Write property test for percentage calculation
    - **Property 3: Percentage Sum**
    - **Validates: Requirements 2.4**
    - For any stock distribution, verify sum of all bucket percentages equals 100%
  
  - [ ]* 1.8 Write unit tests for edge cases
    - Test lot purchased today (age = 0 days)
    - Test stock with no unsold lots
    - Test stock with all lots in single bucket
    - Test very large quantities (up to 1 million shares)
    - _Requirements: 1.5, 8.1, 8.3, 8.5_

- [x] 2. Implement lot detail retrieval service
  - [x] 2.1 Create LotDetailService class in main process
    - Create file `src/main/services/lotDetailService.js`
    - Implement getLotsInBucket(stockSymbol, bucketName) method
    - Query unsold lots and filter by age bucket
    - Return array with transaction_id, purchase_date, quantity, price, age_in_days
    - _Requirements: 6.1, 6.2_
  
  - [x] 2.2 Add formatting for lot details
    - Format purchase_date as DD-MMM-YYYY
    - Format price using Indian Rupee formatting (₹)
    - Calculate and include current value (quantity × current_price)
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 2.3 Write unit tests for lot detail retrieval
    - Test retrieving lots for valid bucket
    - Test retrieving lots for empty bucket
    - Test date and currency formatting
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Set up IPC communication channels
  - [x] 3.1 Create IPC handlers in main process
    - Create file `src/main/ipc/stockAgeHistogramHandler.js`
    - Register 'stock-age:get-stock-distribution' handler → StockAgeCalculator.calculateStockAgeDistribution()
    - Register 'stock-age:get-portfolio-distribution' handler → StockAgeCalculator.calculatePortfolioAgeDistribution()
    - Register 'stock-age:get-bucket-details' handler → LotDetailService.getLotsInBucket()
    - Import and register handlers in main.js
    - _Requirements: 3.1, 3.2, 4.1, 6.1_
  
  - [x] 3.2 Create IPC client utilities in renderer process
    - Create file `src/utils/api/stockAgeHistogramAPI.js`
    - Create getStockAgeDistribution(stockSymbol) function
    - Create getPortfolioAgeDistribution() function
    - Create getBucketDetails(stockSymbol, bucketName) function
    - Add error handling for IPC communication failures
    - _Requirements: 3.1, 3.2, 4.1, 6.1, 8.4_
  
  - [ ]* 3.3 Write integration tests for IPC communication
    - Test stock distribution IPC channel with valid stock
    - Test portfolio distribution IPC channel
    - Test bucket details IPC channel
    - Test error handling for invalid stock symbol
    - _Requirements: 3.1, 4.1, 6.1, 8.4_

- [ ] 4. Checkpoint - Ensure backend services and IPC are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement StockAgeHistogram React component
  - [x] 5.1 Create StockAgeHistogram component structure
    - Create file `src/components/Portfolio/StockAgeHistogram.js`
    - Create file `src/components/Portfolio/StockAgeHistogram.css`
    - Set up props interface: stockSymbol (optional), viewMode ('stock' | 'portfolio')
    - Set up state: distributionData, loading, error, selectedBucket
    - _Requirements: 3.1, 4.1_
  
  - [x] 5.2 Implement data loading on mount
    - Use useEffect to load distribution data based on viewMode
    - Call stockAgeHistogramAPI.getStockAgeDistribution() for stock view
    - Call stockAgeHistogramAPI.getPortfolioAgeDistribution() for portfolio view
    - Update loading and error states appropriately
    - _Requirements: 3.1, 4.1, 9.2, 10.1, 10.2_
  
  - [x] 5.3 Implement histogram bar chart rendering
    - Use recharts library (BarChart component)
    - Configure x-axis with age bucket labels
    - Configure y-axis with quantity values using Indian number formatting
    - Render bars with quantity data
    - Add tooltip showing quantity and percentage
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 5.4 Implement tax-based color coding
    - Define color constants: STCG_COLOR (orange/red), LTCG_COLOR (green)
    - Apply STCG_COLOR to buckets: 0-6 months, 6-12 months
    - Apply LTCG_COLOR to buckets: 1-2 years, 2-5 years, 5+ years
    - Add legend explaining color coding and tax classification
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 5.5 Implement empty state handling
    - Display "No current holdings" message when stock has no unsold lots
    - Display "No stocks in portfolio" message when portfolio is empty
    - Display all buckets with zero height when data is empty
    - _Requirements: 3.3, 8.1, 8.2, 8.3_
  
  - [ ]* 5.6 Write property test for histogram rendering
    - **Property 4: Histogram Display Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - For any distribution data, verify all buckets are displayed with correct values
  
  - [ ]* 5.7 Write property test for color coding
    - **Property 5: Tax Color Coding**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - For any histogram, verify STCG buckets use distinct color from LTCG buckets
  
  - [ ]* 5.8 Write unit tests for StockAgeHistogram component
    - Test component renders with valid data
    - Test loading state display
    - Test error state display
    - Test empty state display
    - Test color coding applied correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.5, 8.1, 8.2_

- [ ] 6. Implement interactive drill-down functionality
  - [ ] 6.1 Add click handlers to histogram bars
    - Implement handleBarClick(bucketName) handler
    - Update selectedBucket state when bar is clicked
    - _Requirements: 6.1_
  
  - [ ] 6.2 Create BucketDetailModal component
    - Create file `src/components/Portfolio/BucketDetailModal.js`
    - Create file `src/components/Portfolio/BucketDetailModal.css`
    - Set up props: stockSymbol, bucketName, isOpen, onClose
    - Set up state: lotDetails, loading
    - _Requirements: 6.1, 6.2_
  
  - [ ] 6.3 Implement lot details loading and display
    - Call stockAgeHistogramAPI.getBucketDetails() when modal opens
    - Display table with columns: Purchase Date, Quantity, Purchase Price, Current Age
    - Format dates as DD-MMM-YYYY
    - Format currency using ₹ symbol and Indian formatting
    - Calculate and display age in human-readable format (e.g., "1 year 3 months")
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [ ] 6.4 Implement modal close handler
    - Add close button in modal header
    - Add overlay click to close modal
    - Clear selectedBucket state on close
    - _Requirements: 6.5_
  
  - [ ]* 6.5 Write property test for drill-down interaction
    - **Property 6: Drill-Down Display**
    - **Validates: Requirements 6.1, 6.2**
    - For any histogram bar click, verify detail modal displays correct lot information
  
  - [ ]* 6.6 Write unit tests for BucketDetailModal
    - Test modal renders with lot details
    - Test date formatting (DD-MMM-YYYY)
    - Test currency formatting (Indian Rupee)
    - Test close button functionality
    - Test overlay click closes modal
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Implement portfolio-wide histogram view
  - [ ] 7.1 Add view mode toggle to component
    - Add toggle buttons/tabs for "Stock View" and "Portfolio View"
    - Update viewMode state when toggle is clicked
    - Reload distribution data when viewMode changes
    - _Requirements: 4.1, 4.3_
  
  - [ ] 7.2 Implement portfolio summary display
    - Display total number of stocks in portfolio
    - Display total quantity across all stocks
    - Format numbers using Indian number formatting
    - Position summary above histogram chart
    - _Requirements: 4.5_
  
  - [ ] 7.3 Handle portfolio view drill-down
    - When portfolio view bar is clicked, show aggregated lots from all stocks
    - Group lot details by stock symbol in modal
    - Display stock symbol as section header in details table
    - _Requirements: 4.1, 4.2, 6.1_
  
  - [ ]* 7.4 Write property test for portfolio aggregation
    - **Property 7: Portfolio Aggregation**
    - **Validates: Requirements 4.1, 4.2**
    - For any portfolio, verify aggregated quantities equal sum of individual stock quantities
  
  - [ ]* 7.5 Write unit tests for portfolio view
    - Test view mode toggle functionality
    - Test portfolio summary display
    - Test portfolio histogram rendering
    - Test portfolio drill-down with multiple stocks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8. Implement export functionality
  - [ ] 8.1 Create ExportService in main process
    - Create file `src/main/services/exportService.js`
    - Implement exportHistogramToPDF(distributionData, stockSymbol, viewMode) method
    - Implement exportHistogramToExcel(distributionData, stockSymbol, viewMode) method
    - Use appropriate libraries (e.g., pdfkit for PDF, exceljs for Excel)
    - _Requirements: 7.1, 7.2_
  
  - [ ] 8.2 Implement PDF export
    - Generate PDF with histogram chart image
    - Include data table with age buckets, quantities, and percentages
    - Add header with export date and stock/portfolio name
    - Format currency and numbers using Indian formatting
    - _Requirements: 7.1, 7.3, 7.5_
  
  - [ ] 8.3 Implement Excel export
    - Create Excel file with columns: Age Bucket, Quantity, Percentage, Average Holding Period
    - Include summary row with totals
    - Add header with export date and stock/portfolio name
    - Apply number formatting for currency and percentages
    - _Requirements: 7.2, 7.4_
  
  - [ ] 8.4 Add export buttons to histogram component
    - Add "Export to PDF" button
    - Add "Export to Excel" button
    - Implement click handlers to call export IPC channels
    - Show success notification after export
    - Handle export errors gracefully
    - _Requirements: 7.1, 7.2_
  
  - [ ] 8.5 Set up export IPC channels
    - Register 'stock-age:export-pdf' handler in main process
    - Register 'stock-age:export-excel' handler in main process
    - Add exportToPDF() and exportToExcel() methods to stockAgeHistogramAPI
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 8.6 Write unit tests for export functionality
    - Test PDF generation with valid data
    - Test Excel generation with valid data
    - Test export includes correct date and name
    - Test export formatting (currency, dates, percentages)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Integrate histogram into Portfolio page
  - [x] 9.1 Add histogram section to Portfolio page
    - Import StockAgeHistogram component
    - Add section in Portfolio.js for age distribution analysis
    - Add section header "Holdings Age Distribution"
    - Position histogram below portfolio summary
    - _Requirements: 3.1, 4.1_
  
  - [x] 9.2 Implement stock selection for histogram
    - Add stock selector dropdown above histogram
    - Populate dropdown with stocks from portfolio
    - Update histogram when stock is selected
    - Default to portfolio view when no stock is selected
    - _Requirements: 3.1, 4.1_
  
  - [x] 9.3 Add refresh mechanism
    - Refresh histogram data when transactions are added/edited
    - Listen for transaction update events
    - Reload distribution data automatically
    - _Requirements: 9.2, 9.4_
  
  - [ ]* 9.4 Write integration tests for portfolio page integration
    - Test histogram displays in portfolio page
    - Test stock selector updates histogram
    - Test histogram refreshes after transaction changes
    - _Requirements: 3.1, 4.1, 9.2, 9.4_

- [ ] 10. Add performance optimizations
  - [ ] 10.1 Optimize database queries
    - Add index on transactions.stock_symbol for faster filtering
    - Add index on transactions.transaction_date for date-based queries
    - Use efficient JOIN queries to retrieve unsold lots
    - Cache current holdings data to avoid repeated queries
    - _Requirements: 9.5, 10.1_
  
  - [ ] 10.2 Implement data caching
    - Cache distribution data in component state
    - Only reload when stock selection changes or transactions update
    - Use React.memo to prevent unnecessary re-renders
    - _Requirements: 10.1, 10.2_
  
  - [ ] 10.3 Add loading indicators
    - Show spinner while loading distribution data
    - Show skeleton chart during initial load
    - Disable interactions during loading
    - _Requirements: 10.1, 10.3_
  
  - [ ]* 10.4 Write performance tests
    - Test histogram renders within 2 seconds for 50 stocks
    - Test view mode switch completes within 500ms
    - Test drill-down displays within 300ms
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11. Final checkpoint - Integration testing and polish
  - [ ] 11.1 Run full integration test suite
    - Test complete workflow: load histogram → drill down → export
    - Test stock view and portfolio view switching
    - Test with various portfolio sizes and distributions
    - Test error handling for edge cases
    - _Requirements: All_
  
  - [ ] 11.2 Add CSS styling and polish
    - Style histogram with consistent color scheme
    - Style bucket detail modal with clear layout
    - Add hover effects on histogram bars
    - Ensure responsive layout for different window sizes
    - Add smooth transitions for view mode switching
    - _Requirements: 3.1, 5.5, 6.1_
  
  - [ ] 11.3 Add accessibility features
    - Add ARIA labels for histogram bars
    - Add keyboard navigation for bar selection
    - Add screen reader descriptions for chart data
    - Ensure color contrast meets WCAG standards
    - Add focus indicators for interactive elements
    - _Requirements: 3.1, 6.1_
  
  - [ ] 11.4 Handle data refresh and synchronization
    - Ensure histogram updates when FIFO calculations change
    - Test histogram accuracy after transaction edits
    - Verify percentages recalculate correctly
    - _Requirements: 9.2, 9.4, 9.5_
  
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend services (tasks 1-3) should be completed before frontend components (tasks 5-7)
- Checkpoint at task 4 ensures backend is solid before building UI
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate complete workflows from UI to database
- The histogram uses existing FIFO calculation data, no new database schema needed
- Export functionality (task 8) can be deferred if not critical for MVP
- Performance optimizations (task 10) should be implemented to meet response time requirements
- Final checkpoint (task 11) ensures everything works together before release
