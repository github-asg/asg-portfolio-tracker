# Requirements Document: Stock Age Histogram

## Introduction

The Stock Age Histogram feature provides Indian retail investors with a visual representation of their portfolio holdings based on the age of each stock lot. This feature helps investors understand the distribution of their holdings across different time periods, which is particularly relevant for tax planning (STCG vs LTCG classification) and portfolio rebalancing decisions.

The feature analyzes current holdings by examining which specific buy transaction lots remain unsold (based on FIFO calculations) and groups them into age buckets for visualization.

## Glossary

- **Stock_Age_Histogram**: The system component that calculates and displays the age distribution of stock holdings
- **Age_Bucket**: A time range category (e.g., 0-6 months, 6-12 months) used to group stock lots
- **Stock_Lot**: A specific buy transaction that has not been fully sold via FIFO matching
- **Holding_Age**: The time duration from the purchase date of a stock lot to the current date
- **FIFO_Engine**: The existing system component that tracks which buy lots remain unsold
- **Portfolio_View**: Aggregated histogram showing age distribution across all stocks
- **Stock_View**: Detailed histogram showing age distribution for a single stock
- **STCG_Period**: Short-term capital gains period (holdings less than 12 months)
- **LTCG_Period**: Long-term capital gains period (holdings 12 months or more)
- **Visualization_Component**: The React component that renders the histogram chart
- **Export_Module**: The system component that generates PDF/Excel reports

## Requirements

### Requirement 1: Calculate Stock Lot Ages

**User Story:** As an investor, I want the system to calculate the age of each stock lot I currently hold, so that I can understand how long I've held each portion of my investments.

#### Acceptance Criteria

1. WHEN the system calculates lot ages, THE Stock_Age_Histogram SHALL determine the age from the purchase date to the current date
2. WHEN a stock has multiple unsold lots, THE Stock_Age_Histogram SHALL calculate the age for each lot independently
3. THE Stock_Age_Histogram SHALL retrieve unsold lot information from the FIFO_Engine
4. WHEN calculating ages, THE Stock_Age_Histogram SHALL express ages in days for internal calculations
5. WHEN a lot was purchased today, THE Stock_Age_Histogram SHALL calculate its age as zero days

### Requirement 2: Categorize Holdings into Age Buckets

**User Story:** As an investor, I want my holdings grouped into meaningful time periods, so that I can quickly understand the distribution of my investment timeline.

#### Acceptance Criteria

1. THE Stock_Age_Histogram SHALL categorize stock lots into the following age buckets: 0-6 months, 6-12 months, 1-2 years, 2-5 years, 5+ years
2. WHEN a lot's age falls on a bucket boundary, THE Stock_Age_Histogram SHALL include it in the older bucket
3. WHEN calculating bucket totals, THE Stock_Age_Histogram SHALL sum the quantities of all lots within each bucket
4. WHEN calculating bucket percentages, THE Stock_Age_Histogram SHALL divide the bucket quantity by the total quantity and multiply by 100
5. THE Stock_Age_Histogram SHALL maintain bucket definitions as configurable constants

### Requirement 3: Display Individual Stock Histogram

**User Story:** As an investor, I want to view a histogram for a specific stock, so that I can see the age distribution of my holdings in that particular stock.

#### Acceptance Criteria

1. WHEN a user selects a stock, THE Visualization_Component SHALL display a bar chart with age buckets on the x-axis and quantity on the y-axis
2. WHEN displaying the histogram, THE Visualization_Component SHALL show both absolute quantity and percentage for each bucket
3. WHEN a bucket has zero holdings, THE Visualization_Component SHALL display the bucket with a height of zero
4. THE Visualization_Component SHALL use Indian number formatting for quantity values
5. THE Visualization_Component SHALL display percentage values with two decimal places

### Requirement 4: Display Portfolio-Wide Histogram

**User Story:** As an investor, I want to view an aggregated histogram across all my stocks, so that I can understand the overall age distribution of my entire portfolio.

#### Acceptance Criteria

1. WHEN a user requests the portfolio view, THE Stock_Age_Histogram SHALL aggregate quantities from all stocks into unified age buckets
2. WHEN aggregating, THE Stock_Age_Histogram SHALL sum quantities across all stocks for each age bucket
3. THE Visualization_Component SHALL display the aggregated histogram using the same visual format as individual stock histograms
4. WHEN calculating portfolio percentages, THE Stock_Age_Histogram SHALL use the total quantity across all stocks as the denominator
5. THE Visualization_Component SHALL display a summary showing the total number of stocks and total quantity

### Requirement 5: Apply Tax-Relevant Color Coding

**User Story:** As an investor, I want holdings color-coded by tax classification, so that I can quickly identify which holdings qualify for long-term capital gains treatment.

#### Acceptance Criteria

1. WHEN displaying buckets representing the STCG_Period, THE Visualization_Component SHALL use a distinct color (e.g., orange or red)
2. WHEN displaying buckets representing the LTCG_Period, THE Visualization_Component SHALL use a distinct color (e.g., green)
3. THE Visualization_Component SHALL display a legend explaining the color coding
4. THE Visualization_Component SHALL use the 12-month threshold to distinguish STCG from LTCG periods
5. WHEN rendering bars, THE Visualization_Component SHALL apply colors consistently across all histogram views

### Requirement 6: Enable Interactive Drill-Down

**User Story:** As an investor, I want to click on a histogram bar to see the specific transactions in that age bucket, so that I can review the details of those holdings.

#### Acceptance Criteria

1. WHEN a user clicks on a histogram bar, THE Visualization_Component SHALL display a modal or panel with transaction details
2. WHEN displaying transaction details, THE Stock_Age_Histogram SHALL show purchase date, quantity, purchase price, and current age for each lot
3. WHEN displaying transaction details, THE Visualization_Component SHALL format dates using DD-MMM-YYYY format
4. WHEN displaying transaction details, THE Visualization_Component SHALL format currency values using Indian Rupee formatting
5. WHEN a user closes the detail view, THE Visualization_Component SHALL return to the histogram display

### Requirement 7: Export Histogram Data

**User Story:** As an investor, I want to export the histogram data to PDF or Excel, so that I can share it with my tax advisor or keep it for my records.

#### Acceptance Criteria

1. WHEN a user requests PDF export, THE Export_Module SHALL generate a PDF document containing the histogram visualization and data table
2. WHEN a user requests Excel export, THE Export_Module SHALL generate an Excel file with age bucket data in tabular format
3. WHEN exporting, THE Export_Module SHALL include the export date and portfolio/stock name in the document
4. WHEN exporting to Excel, THE Export_Module SHALL include columns for age bucket, quantity, percentage, and average holding period
5. WHEN exporting to PDF, THE Export_Module SHALL include the histogram chart image and a formatted data table

### Requirement 8: Handle Edge Cases and Empty States

**User Story:** As an investor, I want the system to handle situations where I have no holdings or unusual data gracefully, so that the application remains stable and informative.

#### Acceptance Criteria

1. WHEN a stock has no unsold lots, THE Visualization_Component SHALL display a message indicating no current holdings
2. WHEN the portfolio is empty, THE Visualization_Component SHALL display a message indicating no stocks in portfolio
3. WHEN all holdings fall into a single age bucket, THE Visualization_Component SHALL display all other buckets with zero values
4. IF the FIFO_Engine returns an error, THEN THE Stock_Age_Histogram SHALL log the error and display an error message to the user
5. WHEN calculating with very large quantities, THE Stock_Age_Histogram SHALL handle numbers up to 1 million shares without precision loss

### Requirement 9: Integrate with Existing Portfolio Data

**User Story:** As an investor, I want the histogram to use my existing transaction data, so that I don't need to enter any additional information.

#### Acceptance Criteria

1. THE Stock_Age_Histogram SHALL retrieve unsold lot data from the FIFO_Engine without requiring additional user input
2. WHEN the FIFO_Engine updates lot data, THE Stock_Age_Histogram SHALL reflect changes in the histogram display
3. THE Stock_Age_Histogram SHALL use the existing database schema for transactions and realized gains
4. WHEN a user adds or edits a transaction, THE Stock_Age_Histogram SHALL recalculate ages based on updated data
5. THE Stock_Age_Histogram SHALL query the database using efficient SQL queries to minimize calculation time

### Requirement 10: Provide Responsive User Interface

**User Story:** As an investor, I want the histogram to load quickly and respond smoothly to my interactions, so that I can efficiently analyze my portfolio.

#### Acceptance Criteria

1. WHEN a user navigates to the histogram view, THE Visualization_Component SHALL render the histogram within 2 seconds for portfolios with up to 50 stocks
2. WHEN a user switches between stock view and portfolio view, THE Visualization_Component SHALL update the display within 500 milliseconds
3. WHEN a user clicks on a histogram bar, THE Visualization_Component SHALL display transaction details within 300 milliseconds
4. THE Visualization_Component SHALL use React hooks for efficient state management and re-rendering
5. WHEN rendering large datasets, THE Visualization_Component SHALL implement virtualization or pagination to maintain performance
