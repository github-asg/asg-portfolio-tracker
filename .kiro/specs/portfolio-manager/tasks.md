# Implementation Plan: Portfolio Manager

## Overview

This implementation plan breaks down the Stock Portfolio Management Software into discrete, manageable coding tasks. The approach follows a layered architecture starting with core infrastructure (database, authentication), then building the calculation engine, followed by the user interface, and finally integration and testing. Each task builds incrementally on previous work to ensure a working system at each checkpoint.

## Tasks

- [ ] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Electron + React project structure
    - Set up package.json with all required dependencies (electron, react, sqlite3, bcrypt, axios, date-fns, recharts)
    - Configure TypeScript compilation and build scripts
    - Create directory structure following the defined project organization
    - _Requirements: 10.1, 10.2_

  - [x] 1.2 Configure development and build environment
    - Set up electron-builder configuration for Windows MSI and macOS DMG
    - Configure ESLint, Prettier, and Jest for code quality and testing
    - Create npm scripts for development, building, and packaging
    - _Requirements: 10.3, 10.4_

  - [ ]* 1.3 Write property test for project structure validation
    - **Property 20: Database Initialization Consistency**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 2. Database Layer Implementation
  - [x] 2.1 Create SQLite database schema and initialization
    - Implement all database tables (users, stocks, transactions, realized_gains, price_cache, api_settings)
    - Create database initialization and migration system
    - Set up database connection management with proper error handling
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 2.2 Implement database manager with ACID compliance
    - Create DatabaseManager class with transaction support
    - Implement query execution with parameter binding
    - Add concurrent read support while maintaining data integrity
    - _Requirements: 8.4, 8.7_

  - [ ]* 2.3 Write property test for database operations
    - **Property 21: Database Transaction Integrity**
    - **Validates: Requirements 8.4, 8.7**

  - [x] 2.4 Implement backup and restore functionality
    - Create database backup to user-specified location
    - Implement restore from backup file with validation
    - Add integrity checks for backup/restore operations
    - _Requirements: 8.5_

  - [ ]* 2.5 Write property test for backup/restore operations
    - **Property 22: Backup and Restore Round-trip**
    - **Validates: Requirements 8.5**

- [ ] 3. Authentication and Security Layer
  - [x] 3.1 Implement user authentication system
    - Create AuthenticationService with bcrypt password hashing (cost factor 10)
    - Implement user creation, login validation, and session management
    - Add automatic session timeout after 30 minutes of inactivity
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Implement encryption utilities for sensitive data
    - Create AES-256 encryption/decryption for API credentials
    - Implement secure storage of encrypted data in database
    - Add key derivation and secure random generation
    - _Requirements: 1.5, 7.7, 8.6_

  - [ ]* 3.3 Write property tests for authentication security
    - **Property 1: Authentication Security Consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 3.4 Write property test for session management
    - **Property 2: Session Management Integrity**
    - **Validates: Requirements 1.4**

  - [ ]* 3.5 Write property test for data encryption
    - **Property 3: Data Encryption Consistency**
    - **Validates: Requirements 1.5, 7.7, 8.6**

- [ ] 4. Checkpoint - Core Infrastructure Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. FIFO Calculation Engine
  - [x] 5.1 Implement core FIFO calculation algorithm
    - Create FIFOCalculator class with buy lot management
    - Implement chronological lot consumption for sell transactions
    - Add holding period calculation and STCG/LTCG classification
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 5.2 Implement capital gains calculation with tax rules
    - Add STCG (20% tax rate) and LTCG (12.5% tax rate) classification
    - Implement ₹1 lakh LTCG exemption per financial year
    - Create realized gains record generation for each sell transaction
    - _Requirements: 4.3, 4.4, 4.6_

  - [x] 5.3 Implement unrealized gains calculation
    - Create real-time unrealized gains calculation based on current prices
    - Add portfolio value updates when prices change
    - Implement average cost calculation for holdings
    - _Requirements: 4.7_

  - [ ]* 5.4 Write property test for FIFO calculation correctness
    - **Property 10: FIFO Calculation Correctness**
    - **Validates: Requirements 4.1, 4.5**

  - [ ]* 5.5 Write property test for holding period classification
    - **Property 11: Holding Period Classification Accuracy**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 5.6 Write property test for realized gains records
    - **Property 12: Realized Gains Record Integrity**
    - **Validates: Requirements 4.6**

- [ ] 6. Indian Market Utilities and Formatting
  - [x] 6.1 Implement Indian formatting utilities
    - Create currency formatting (₹1,23,456.78) with Indian numbering system
    - Implement large number formatting (lakhs/crores)
    - Add DD-MMM-YYYY date formatting for all displays
    - _Requirements: 2.5, 2.7, 3.7_

  - [x] 6.2 Implement financial year calculation utilities
    - Create financial year determination (April 1 to March 31)
    - Add financial year range calculation for reports
    - Implement transaction filtering by financial year
    - _Requirements: 6.1_

  - [ ]* 6.3 Write property test for Indian formatting consistency
    - **Property 4: Indian Formatting Consistency**
    - **Validates: Requirements 2.5, 2.7, 3.7**

  - [ ]* 6.4 Write property test for financial year calculations
    - **Property 15: Financial Year Calculation Accuracy**
    - **Validates: Requirements 6.1**

- [ ] 7. ICICI Breeze API Integration
  - [x] 7.1 Implement ICICI Breeze API client
    - Create BreezeAPIClient with authentication and connection validation
    - Implement stock quote fetching with error handling
    - Add WebSocket integration for real-time price feeds
    - _Requirements: 7.1, 7.2_

  - [x] 7.2 Implement API resilience and caching
    - Add exponential backoff retry logic for rate limiting
    - Implement local price caching to reduce API calls
    - Create graceful degradation when API is unavailable
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 7.3 Implement market hours adaptive behavior
    - Add market hours detection (9:15 AM - 3:30 PM IST)
    - Implement adaptive refresh frequency (30 seconds during market hours, hourly when closed)
    - Create price update propagation to portfolio calculations
    - _Requirements: 2.2, 7.6_

  - [ ]* 7.4 Write property test for API resilience
    - **Property 6: API Resilience and Caching**
    - **Validates: Requirements 2.4, 7.3, 7.4, 7.5**

  - [ ]* 7.5 Write property test for market hours behavior
    - **Property 19: Market Hours Adaptive Behavior**
    - **Validates: Requirements 2.2, 7.6**

  - [ ]* 7.6 Write property test for API credential validation
    - **Property 18: API Credential Validation**
    - **Validates: Requirements 7.1**

- [ ] 8. Stock Master Data Management
  - [x] 8.1 Implement stock management system
    - Create stock creation with symbol, name, sector, and exchange information
    - Add support for NSE and BSE exchange symbols
    - Implement duplicate prevention for stock symbols
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 8.2 Implement stock data integrity and updates
    - Create stock information retrieval with sector classification
    - Implement stock data updates with propagation to related transactions
    - Maintain stock master data independently of transactions
    - _Requirements: 5.2, 5.5, 5.6_

  - [ ]* 8.3 Write property test for stock master data integrity
    - **Property 13: Stock Master Data Integrity**
    - **Validates: Requirements 5.1, 5.2, 5.5, 5.6**

  - [ ]* 8.4 Write property test for duplicate prevention
    - **Property 14: Duplicate Prevention Consistency**
    - **Validates: Requirements 5.4**

- [ ] 9. Transaction Management System
  - [x] 9.1 Implement transaction validation and processing
    - Create comprehensive transaction validation (required fields, date validation, quantity checks)
    - Implement buy and sell transaction processing
    - Add transaction modification with dependent calculation updates
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 9.2 Integrate transaction processing with FIFO calculations
    - Connect transaction processing to FIFO calculation engine
    - Implement automatic realized gains calculation for sell transactions
    - Add portfolio recalculation after transaction modifications
    - _Requirements: 4.1, 4.6_

  - [ ]* 9.3 Write property test for transaction validation
    - **Property 8: Transaction Validation Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 9.4 Write property test for transaction modification consistency
    - **Property 9: Transaction Modification Consistency**
    - **Validates: Requirements 3.5**

- [ ] 10. Checkpoint - Backend Systems Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Main Process IPC Interface
  - [ ] 11.1 Implement secure IPC channels
    - Create preload script with context isolation
    - Implement IPC channels for authentication, portfolio, transactions, and reports
    - Add proper error handling and response formatting for all channels
    - _Requirements: 8.3_

  - [ ] 11.2 Integrate all backend services with IPC
    - Connect authentication service to IPC channels
    - Integrate FIFO calculator and transaction management
    - Add API client integration with price update broadcasting
    - _Requirements: 2.3, 4.7_

  - [ ]* 11.3 Write property test for price update propagation
    - **Property 5: Real-time Price Update Propagation**
    - **Validates: Requirements 2.3, 4.7**

- [ ] 12. React UI Foundation
  - [x] 12.1 Create base React application structure
    - Set up React Router for navigation between pages
    - Create base layout components with navigation
    - Implement error boundaries and loading states
    - _Requirements: 10.5_

  - [x] 12.2 Implement authentication UI components
    - Create login form with validation and error handling
    - Add user creation form with password confirmation
    - Implement session management in React context
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 12.3 Create common UI components with Indian formatting
    - Implement currency display components with ₹ formatting
    - Create number formatting components (lakhs/crores)
    - Add date display components with DD-MMM-YYYY format
    - _Requirements: 2.5, 2.7, 3.7_

  - [ ]* 12.4 Write property test for color coding consistency
    - **Property 7: Color Coding Consistency**
    - **Validates: Requirements 2.6**

- [ ] 13. Portfolio Dashboard Implementation
  - [x] 13.1 Create portfolio summary components
    - Implement PortfolioSummary component with total investment, current value, and gains
    - Create holdings table with sortable columns and real-time updates
    - Add portfolio performance charts using recharts
    - _Requirements: 2.1, 2.3_

  - [x] 13.2 Implement real-time price updates in UI
    - Connect to IPC price update events
    - Update portfolio values and color coding in real-time
    - Add last update timestamp display
    - _Requirements: 2.3, 2.4, 2.6_

  - [x] 13.3 Add portfolio analysis and sector breakdown
    - Create sector-wise portfolio breakdown
    - Implement gain/loss analysis with visual indicators
    - Add portfolio performance metrics and charts
    - _Requirements: 5.2_

- [ ] 14. Transaction Management UI
  - [x] 14.1 Create transaction form components
    - Implement TransactionForm with validation and error display
    - Add stock selection with search and autocomplete
    - Create date picker with validation (no future dates)
    - _Requirements: 3.1, 3.2_

  - [x] 14.2 Implement transaction list and management
    - Create sortable and filterable transaction list
    - Add transaction editing with validation
    - Implement transaction deletion with confirmation
    - _Requirements: 3.5_

  - [x] 14.3 Add transaction validation feedback
    - Implement real-time validation with field-level errors
    - Add available holdings display for sell transactions
    - Create transaction preview with calculated impacts
    - _Requirements: 3.3_

- [ ] 15. Reports Generation System
  - [x] 15.1 Implement capital gains report generation
    - Create financial year selection interface
    - Implement STCG/LTCG report generation with proper classification
    - Add LTCG exemption calculation and display
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 15.2 Add multiple export formats
    - Implement PDF export using a PDF generation library
    - Add Excel export with proper formatting
    - Create CSV export for data analysis
    - _Requirements: 6.2_

  - [x] 15.3 Create comprehensive report content
    - Include all transaction details, dates, quantities, and prices
    - Add calculated gains with holding periods and tax implications
    - Handle empty financial years with appropriate messaging
    - _Requirements: 6.6, 6.7_

  - [ ]* 15.4 Write property test for LTCG exemption application
    - **Property 16: LTCG Exemption Application**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 15.5 Write property test for report completeness
    - **Property 17: Report Completeness**
    - **Validates: Requirements 6.6, 6.7**

- [ ] 16. Settings and Configuration UI
  - [x] 16.1 Implement API configuration interface
    - Create ICICI Breeze API credential input form
    - Add connection testing and validation
    - Implement secure credential storage with encryption
    - _Requirements: 7.1, 7.7_

  - [x] 16.2 Add application settings management
    - Create user preferences interface
    - Add database backup and restore UI
    - Implement application theme and display settings
    - _Requirements: 8.5_

  - [x] 16.3 Create system information and diagnostics
    - Add database location and size information
    - Implement connection status indicators
    - Create diagnostic tools for troubleshooting
    - _Requirements: 8.1_

- [x] 17. Checkpoint - UI Implementation Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Integration and Cross-Platform Testing
  - [ ] 18.1 Implement comprehensive integration tests
    - Create end-to-end workflow tests (login to report generation)
    - Add cross-component integration tests
    - Test IPC communication between main and renderer processes
    - _Requirements: 10.5_

  - [x] 18.2 Add platform-specific functionality
    - Implement native OS file dialogs for import/export
    - Add OS-specific menu integration
    - Test application behavior on both Windows and macOS
    - _Requirements: 10.6_

  - [ ]* 18.3 Write integration tests for complete workflows
    - Test complete user journeys from authentication to reporting
    - Validate data consistency across all operations
    - Test error recovery and graceful degradation scenarios

- [ ] 19. Performance Optimization and Validation
  - [x] 19.1 Optimize database queries and calculations
    - Add database indexing for frequently queried fields
    - Optimize FIFO calculation performance for large portfolios
    - Implement lazy loading for large transaction lists
    - _Requirements: 9.3, 9.4_

  - [x] 19.2 Implement memory and resource management
    - Add memory usage monitoring and optimization
    - Implement efficient data structures for large portfolios
    - Optimize React component rendering for performance
    - _Requirements: 9.6_

  - [x] 19.3 Add performance monitoring and metrics
    - Implement timing measurements for critical operations
    - Add memory usage tracking during extended operations
    - Create performance benchmarks for validation
    - _Requirements: 9.1, 9.2, 9.5, 9.7_

- [ ] 20. Final Integration and Packaging
  - [x] 20.1 Complete application packaging setup
    - Finalize electron-builder configuration for both platforms
    - Test installer creation and installation process
    - Validate application signing and security settings
    - _Requirements: 10.3, 10.4_

  - [x] 20.2 Final testing and validation
    - Run complete test suite including property-based tests
    - Perform manual testing on both Windows and macOS
    - Validate all requirements are met and functioning correctly
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 20.3 Create distribution packages
    - Generate final MSI installer for Windows
    - Create DMG installer for macOS
    - Test installation and first-run experience on clean systems
    - _Requirements: 10.3, 10.4_

- [x] 21. Final Checkpoint - Application Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation follows TypeScript/JavaScript with Electron + React architecture
- All financial calculations must be thoroughly tested due to tax compliance requirements