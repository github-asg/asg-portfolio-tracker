# Implementation Plan: Transaction Editing

## Overview

This implementation plan breaks down the transaction editing feature into discrete coding tasks. The feature enables users to modify existing transactions while maintaining FIFO calculation integrity and preserving an audit trail. Implementation follows a bottom-up approach: database schema → backend services → frontend components → integration.

## Tasks

- [x] 1. Set up database schema and audit logging infrastructure
  - [x] 1.1 Create transaction_audit table schema
    - Add migration file for transaction_audit table with columns: id, transaction_id, modified_at, field_name, old_value, new_value
    - Add index on transaction_id for efficient history queries
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 1.2 Add modified_at column to transactions table
    - Create migration to add modified_at timestamp column (nullable)
    - Update existing transactions to have null modified_at
    - _Requirements: 6.1_
  
  - [ ]* 1.3 Write unit tests for database schema
    - Test transaction_audit table creation
    - Test modified_at column addition
    - Test foreign key constraints
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement AuditLogger service
  - [x] 2.1 Create AuditLogger class in main process
    - Implement logEdit(transactionId, originalValues, newValues, timestamp) method
    - Implement getEditHistory(transactionId) method
    - Store field-level changes as individual audit entries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 2.2 Write property test for audit logging completeness
    - **Property 18: Audit Log Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - For any saved transaction edit, verify audit log contains timestamp, original values, and new values
  
  - [ ]* 2.3 Write property test for audit history chronology
    - **Property 20: Audit History Chronology**
    - **Validates: Requirements 6.5**
    - For any transaction edited multiple times, verify audit log maintains chronological order
  
  - [ ]* 2.4 Write unit tests for AuditLogger edge cases
    - Test logging with no changes (should not create entries)
    - Test logging with all fields changed
    - Test retrieving history for non-existent transaction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement ValidationEngine service
  - [x] 3.1 Create ValidationEngine class in main process
    - Implement validateBuyQuantityReduction(transactionId, newQuantity) method
    - Implement validateDateChange(transactionId, newDate) method
    - Implement validateTypeChange(transactionId, newType) method
    - Implement validateTransaction(original, edited) orchestration method
    - Return ValidationResult with isValid flag and error array
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 3.2 Implement buy quantity validation logic
    - Query FIFO matches for the buy transaction
    - Sum matched quantities from sell transactions
    - Reject if new quantity < matched quantity
    - Return error with minimum required quantity
    - _Requirements: 3.1, 8.1_
  
  - [x] 3.3 Implement date change validation logic
    - For buy transactions: verify new date is before all matched sell dates
    - For sell transactions: verify new date is after all matched buy dates
    - Check chronological FIFO order is maintained
    - Return error with conflicting transaction details
    - _Requirements: 3.2, 8.2_
  
  - [x] 3.4 Implement type change validation logic
    - For buy→sell: calculate available buy quantity before date, reject if insufficient
    - For sell→buy: check for existing FIFO matches, reject if any exist
    - Return error with specific reason and conflicting transaction IDs
    - _Requirements: 3.3, 3.4, 8.3_
  
  - [ ]* 3.5 Write property test for buy quantity validation
    - **Property 6: Buy Quantity Validation**
    - **Validates: Requirements 3.1**
    - For any buy transaction with FIFO matches, verify reducing quantity below matched amount fails validation
  
  - [ ]* 3.6 Write property test for date change validation
    - **Property 7: Date Change Validation**
    - **Validates: Requirements 3.2**
    - For any transaction with FIFO matches, verify date changes that violate chronological order fail validation
  
  - [ ]* 3.7 Write property test for type change validation
    - **Property 8: Buy-to-Sell Type Change Validation**
    - **Property 9: Sell-to-Buy Type Change Validation**
    - **Validates: Requirements 3.3, 3.4**
    - For any type change, verify validation correctly checks FIFO constraints
  
  - [ ]* 3.8 Write unit tests for validation error messages
    - Test error message format for insufficient buy quantity
    - Test error message format for date conflicts
    - Test error message format for type change conflicts
    - _Requirements: 3.5, 8.1, 8.2, 8.3_

- [ ] 4. Implement CalculationEngine recalculation logic
  - [x] 4.1 Create CalculationEngine class in main process
    - Implement recalculateFIFO(stockSymbol, fromDate) method
    - Implement recalculateRealizedGains(stockSymbol, financialYear) method
    - Implement recalculateHoldings(stockSymbol) method
    - Implement recalculateAll(affectedStocks, fromDate) orchestration method
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.2 Implement FIFO recalculation algorithm
    - Clear existing FIFO matches from fromDate forward for the stock
    - Fetch all transactions for the stock chronologically from fromDate
    - Reprocess transactions using standard FIFO matching algorithm
    - Save new FIFO matches to realized_gains table
    - _Requirements: 5.1_
  
  - [x] 4.3 Implement realized gains recalculation
    - Calculate gains for each FIFO match: (sell_price - buy_price) × quantity
    - Determine STCG vs LTCG based on holding period
    - Update realized_gains table with new calculations
    - _Requirements: 5.2_
  
  - [x] 4.4 Implement holdings recalculation
    - Sum all buy quantities for the stock
    - Subtract all sell quantities for the stock
    - Update portfolio_holdings table with current quantity
    - Calculate unrealized gains using current market price
    - _Requirements: 5.3, 5.4_
  
  - [ ]* 4.5 Write property test for FIFO recalculation correctness
    - **Property 13: FIFO Recalculation**
    - **Validates: Requirements 5.1**
    - For any transaction edit, verify FIFO recalculation matches reprocessing all transactions from scratch
  
  - [ ]* 4.6 Write property test for holdings recalculation
    - **Property 15: Holdings Recalculation**
    - **Validates: Requirements 5.3**
    - For any transaction edit, verify holdings equal sum of buys minus sells
  
  - [ ]* 4.7 Write unit tests for recalculation edge cases
    - Test recalculation with no FIFO matches
    - Test recalculation affecting multiple financial years
    - Test recalculation with partially matched buys
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Implement TransactionService orchestration layer
  - [x] 5.1 Create TransactionService class in main process
    - Implement getTransaction(transactionId) method
    - Implement validateEdit(transactionId, editedTransaction) method
    - Implement calculateImpact(transactionId, editedTransaction) method
    - Implement commitEdit(transactionId, editedTransaction) method
    - _Requirements: 1.2, 3.6, 4.4, 4.5, 7.2_
  
  - [x] 5.2 Implement calculateImpact method
    - Calculate affected stocks (original and new stock symbols)
    - Calculate realized gains before and after edit
    - Calculate holdings before and after edit
    - Count affected transactions
    - Return EditImpact object
    - _Requirements: 4.4, 4.5_
  
  - [x] 5.3 Implement commitEdit method with database transaction
    - Begin SQLite transaction
    - Update transaction record with new values and modified_at timestamp
    - Call AuditLogger.logEdit() to record changes
    - Call CalculationEngine.recalculateAll() for affected stocks
    - Commit transaction on success, rollback on error
    - Return CommitResult with success status and recalculation results
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.2_
  
  - [ ]* 5.4 Write property test for commit atomicity
    - **Property 22: Commit on Confirmation**
    - **Validates: Requirements 7.2**
    - For any confirmed edit, verify transaction is saved to database
  
  - [ ]* 5.5 Write unit tests for TransactionService error handling
    - Test database error during commit (should rollback)
    - Test recalculation error after commit (should still save transaction)
    - Test concurrent edit detection
    - _Requirements: 8.4, 8.5_

- [x] 6. Set up IPC communication channels
  - [x] 6.1 Create IPC handlers in main process
    - Register 'transaction:get' handler → TransactionService.getTransaction()
    - Register 'transaction:validate-edit' handler → TransactionService.validateEdit()
    - Register 'transaction:calculate-impact' handler → TransactionService.calculateImpact()
    - Register 'transaction:commit-edit' handler → TransactionService.commitEdit()
    - Register 'transaction:get-audit-history' handler → AuditLogger.getEditHistory()
    - _Requirements: 1.2, 3.6, 4.4, 4.5, 6.4, 7.2_
  
  - [x] 6.2 Create IPC client utilities in renderer process
    - Create transactionAPI.getTransaction(transactionId)
    - Create transactionAPI.validateEdit(transactionId, editedTransaction)
    - Create transactionAPI.calculateImpact(transactionId, editedTransaction)
    - Create transactionAPI.commitEdit(transactionId, editedTransaction)
    - Create transactionAPI.getAuditHistory(transactionId)
    - _Requirements: 1.2, 3.6, 4.4, 4.5, 6.4, 7.2_
  
  - [ ]* 6.3 Write integration tests for IPC communication
    - Test each IPC channel with valid data
    - Test error propagation from main to renderer
    - Test timeout handling for long-running operations
    - _Requirements: 1.2, 3.6, 4.4, 4.5, 6.4, 7.2_

- [x] 7. Checkpoint - Ensure backend services and IPC are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement TransactionEditor React component
  - [x] 8.1 Create TransactionEditor component structure
    - Create component file with props interface (transactionId, onSave, onCancel)
    - Set up state: originalTransaction, editedTransaction, validationErrors, hasUnsavedChanges, isValidating
    - Implement useEffect to load transaction on mount
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 8.2 Implement form fields for all transaction properties
    - Add date picker field with change handler
    - Add stock symbol dropdown/autocomplete field
    - Add transaction type radio buttons (buy/sell)
    - Add quantity number input field
    - Add price per share number input field
    - Display calculated total amount (quantity × price)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 8.3 Implement change tracking and visual indication
    - Compare editedTransaction with originalTransaction on each field change
    - Add CSS class to changed fields for visual highlighting
    - Update hasUnsavedChanges state when any field differs
    - _Requirements: 2.6_
  
  - [x] 8.4 Implement validation on field change
    - Debounce validation calls (500ms after last change)
    - Call transactionAPI.validateEdit() with current edited values
    - Update validationErrors state with results
    - Display validation errors below relevant fields
    - Disable save button if validation errors exist
    - _Requirements: 3.5, 3.6_
  
  - [x] 8.5 Implement save and cancel handlers
    - handleSave: call onSave callback with editedTransaction if validation passes
    - handleCancel: check hasUnsavedChanges, show confirmation if true, call onCancel
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [x] 8.6 Add loading and progress indicators
    - Show spinner while loading transaction
    - Show spinner during validation
    - Show progress indicator during save/recalculation
    - _Requirements: 9.1, 9.4_
  
  - [ ]* 8.7 Write property test for field editability
    - **Property 4: Field Editability**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - For any transaction, verify all fields are modifiable in the editor
  
  - [ ]* 8.8 Write property test for change indication
    - **Property 5: Change Indication**
    - **Validates: Requirements 2.6**
    - For any field modification, verify field is visually marked as changed
  
  - [ ]* 8.9 Write unit tests for TransactionEditor
    - Test component renders with pre-filled values
    - Test field change updates state correctly
    - Test validation error display
    - Test save button disabled when validation fails
    - Test unsaved changes warning on cancel
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.5, 3.6, 7.4, 7.5_

- [ ] 9. Implement ConfirmationDialog React component
  - [ ] 9.1 Create ConfirmationDialog component structure
    - Create component file with props interface (originalTransaction, editedTransaction, impact, onConfirm, onCancel)
    - Set up state: isCommitting
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1_
  
  - [ ] 9.2 Implement before/after comparison display
    - Create side-by-side comparison table
    - Show original values in left column
    - Show new values in right column
    - Highlight rows where values differ
    - Format dates, currency, and numbers using Indian formatting
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 9.3 Implement impact analysis display
    - Display realized gains change (before, after, delta)
    - Display holdings change (before, after, delta)
    - Display count of affected transactions
    - Use color coding (green for positive, red for negative)
    - _Requirements: 4.4, 4.5_
  
  - [ ] 9.4 Implement confirm and cancel handlers
    - handleConfirm: set isCommitting true, call onConfirm callback, handle errors
    - handleCancel: call onCancel callback immediately
    - Disable buttons while isCommitting is true
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 9.5 Write property test for confirmation dialog content
    - **Property 12: Confirmation Dialog Content**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - For any transaction edit, verify dialog displays all required information
  
  - [ ]* 9.6 Write unit tests for ConfirmationDialog
    - Test dialog renders with correct before/after values
    - Test changed fields are highlighted
    - Test impact analysis displays correctly
    - Test confirm button triggers onConfirm callback
    - Test cancel button triggers onCancel callback
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.3_

- [x] 10. Update TransactionList component to support editing
  - [x] 10.1 Add edit action to transaction list items
    - Add "Edit" button/icon to each transaction row
    - Implement handleEditClick(transactionId) handler
    - Store editingTransactionId in component state
    - _Requirements: 1.1, 1.3_
  
  - [x] 10.2 Integrate TransactionEditor into TransactionList
    - Conditionally render TransactionEditor when editingTransactionId is set
    - Pass transactionId, onSave, and onCancel props to editor
    - Prevent editing other transactions while one is being edited (disable other edit buttons)
    - _Requirements: 1.2, 1.3_
  
  - [x] 10.3 Implement edit workflow orchestration
    - onSave: call transactionAPI.calculateImpact(), open ConfirmationDialog
    - onConfirm in dialog: call transactionAPI.commitEdit(), refresh transaction list
    - onCancel: close editor, clear editingTransactionId
    - Handle errors and display error messages
    - _Requirements: 4.4, 4.5, 5.5, 7.1, 7.2, 7.3, 8.4_
  
  - [x] 10.4 Implement transaction list refresh after edit
    - Call refresh handler after successful commit
    - Update transaction list data from database
    - Clear editingTransactionId to close editor
    - Show success notification
    - _Requirements: 5.5_
  
  - [ ]* 10.5 Write property test for single edit session
    - **Property 3: Single Edit Session**
    - **Validates: Requirements 1.3**
    - For any transaction list state, verify at most one transaction is in edit mode
  
  - [ ]* 10.6 Write property test for transaction list refresh
    - **Property 17: Transaction List Refresh**
    - **Validates: Requirements 5.5**
    - For any completed recalculation, verify transaction list displays updated values
  
  - [ ]* 10.7 Write integration tests for edit workflow
    - Test complete edit flow: open editor → modify → validate → confirm → save → refresh
    - Test cancel flow: open editor → modify → cancel → verify no changes
    - Test validation failure flow: open editor → invalid edit → verify error display
    - _Requirements: 1.1, 1.2, 1.3, 3.5, 3.6, 4.4, 4.5, 5.5, 7.1, 7.2, 7.3_

- [ ] 11. Implement audit history display
  - [ ] 11.1 Add audit history section to transaction details view
    - Create AuditHistory component
    - Fetch audit history using transactionAPI.getAuditHistory(transactionId)
    - Display modification history in chronological order
    - Show timestamp, field name, old value, and new value for each entry
    - _Requirements: 6.4, 6.5_
  
  - [ ] 11.2 Add audit history indicator to edited transactions
    - Show "Edited" badge on transactions with modification history
    - Add tooltip showing last modified timestamp
    - _Requirements: 6.4_
  
  - [ ]* 11.3 Write property test for audit history display
    - **Property 19: Audit History Display**
    - **Validates: Requirements 6.4**
    - For any edited transaction, verify details view displays modification history
  
  - [ ]* 11.4 Write unit tests for AuditHistory component
    - Test component renders with empty history
    - Test component renders with multiple history entries
    - Test chronological ordering of entries
    - Test formatting of timestamps and values
    - _Requirements: 6.4, 6.5_

- [ ] 12. Implement error handling and recovery
  - [ ] 12.1 Add error handling to TransactionEditor
    - Catch and display validation errors with specific messages
    - Catch and display database errors during save
    - Preserve edited values in state when errors occur
    - Add retry button for recoverable errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.2 Add error handling to ConfirmationDialog
    - Catch and display commit errors
    - Catch and display recalculation errors
    - Provide option to manually trigger recalculation if it fails
    - _Requirements: 8.4, 8.5_
  
  - [ ] 12.3 Add concurrent edit detection
    - Check transaction modified_at timestamp before committing
    - If timestamp changed since loading, show concurrent edit error
    - Offer to reload transaction and reapply changes
    - _Requirements: 8.4_
  
  - [ ]* 12.4 Write property test for error recovery
    - **Property 26: Error Recovery**
    - **Validates: Requirements 8.4**
    - For any database error during save, verify edits are preserved for retry
  
  - [ ]* 12.5 Write unit tests for error scenarios
    - Test validation error display
    - Test database error handling
    - Test recalculation error handling
    - Test concurrent edit detection
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Add performance optimizations
  - [ ] 13.1 Optimize validation queries
    - Add database indexes on transaction date and stock_symbol
    - Use efficient queries for FIFO match lookups
    - Cache validation results for unchanged fields
    - _Requirements: 9.2_
  
  - [ ] 13.2 Optimize recalculation performance
    - Only recalculate from earliest affected date
    - Batch database updates for FIFO matches
    - Use database transactions for atomic updates
    - _Requirements: 9.3_
  
  - [ ] 13.3 Add progress tracking for long operations
    - Emit progress events during recalculation
    - Update progress indicator in UI
    - Show estimated time remaining for large portfolios
    - _Requirements: 9.4_
  
  - [ ]* 13.4 Write performance tests
    - Test editor opens within 500ms
    - Test validation completes within 1 second
    - Test recalculation completes within 3 seconds for 1000 transactions
    - Test transaction list refresh within 500ms
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 14. Final checkpoint - Integration testing and polish
  - [ ] 14.1 Run full integration test suite
    - Test complete edit workflows with various scenarios
    - Test error handling and recovery paths
    - Test performance with large portfolios
    - _Requirements: All_
  
  - [ ] 14.2 Add CSS styling and polish
    - Style TransactionEditor form with consistent design
    - Style ConfirmationDialog with clear visual hierarchy
    - Add animations for dialog open/close
    - Ensure responsive layout for different window sizes
    - _Requirements: 1.1, 1.2, 2.6, 4.3_
  
  - [ ] 14.3 Add keyboard shortcuts and accessibility
    - Add Escape key to cancel editor
    - Add Enter key to save (when validation passes)
    - Add Tab navigation through form fields
    - Add ARIA labels for screen readers
    - _Requirements: 7.3, 7.4_
  
  - [ ] 14.4 Update user documentation
    - Document how to edit transactions
    - Document validation rules and error messages
    - Document audit history feature
    - Add screenshots to documentation
    - _Requirements: All_
  
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend services (tasks 1-6) should be completed before frontend components (tasks 8-11)
- Checkpoint at task 7 ensures backend is solid before building UI
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate complete workflows from UI to database
- Performance optimizations (task 13) can be deferred if initial performance is acceptable
- Final checkpoint (task 14) ensures everything works together before release
