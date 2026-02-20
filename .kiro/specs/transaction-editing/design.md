# Design Document: Transaction Editing

## Overview

The transaction editing feature enables users to modify existing transactions while maintaining FIFO calculation integrity and preserving an audit trail. The design follows a validation-first approach where all edits are validated before being applied, followed by automatic recalculation of all dependent values.

The feature consists of three main phases:
1. **Edit Phase**: User modifies transaction fields in the Transaction Editor UI
2. **Validation Phase**: System validates that edits maintain FIFO integrity
3. **Commit Phase**: System saves changes, logs audit trail, and recalculates all dependent values

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process (React)                 │
├─────────────────────────────────────────────────────────────┤
│  TransactionList → TransactionEditor → ConfirmationDialog   │
│         ↓                  ↓                    ↓            │
│    IPC Events         IPC Events          IPC Events         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Main Process (Electron)                 │
├─────────────────────────────────────────────────────────────┤
│  TransactionService                                          │
│    ├── ValidationEngine                                      │
│    ├── CalculationEngine                                     │
│    └── AuditLogger                                           │
│         ↓                                                    │
│  Database Layer (SQLite)                                     │
│    ├── transactions table                                    │
│    ├── transaction_audit table                               │
│    ├── realized_gains table                                  │
│    └── portfolio_holdings table                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User clicks "Edit" on a transaction in TransactionList
2. TransactionEditor opens with pre-filled values
3. User modifies fields and clicks "Save"
4. ValidationEngine checks FIFO integrity constraints
5. If valid, ConfirmationDialog shows before/after comparison
6. User confirms changes
7. TransactionService saves to database within a transaction
8. AuditLogger records the modification
9. CalculationEngine recalculates affected FIFO matches and gains
10. TransactionList refreshes with updated data

## Components and Interfaces

### Frontend Components (React)

#### TransactionList Component

**Purpose**: Display all transactions with edit actions

**Props**:
```javascript
{
  transactions: Transaction[],
  onEdit: (transactionId: string) => void,
  onRefresh: () => void
}
```

**State**:
```javascript
{
  editingTransactionId: string | null,
  isLoading: boolean
}
```

**Methods**:
- `handleEditClick(transactionId)`: Opens TransactionEditor for the selected transaction
- `handleRefresh()`: Reloads transaction list from database

#### TransactionEditor Component

**Purpose**: Edit transaction fields with validation feedback

**Props**:
```javascript
{
  transactionId: string,
  onSave: (editedTransaction: Transaction) => void,
  onCancel: () => void
}
```

**State**:
```javascript
{
  originalTransaction: Transaction,
  editedTransaction: Transaction,
  validationErrors: ValidationError[],
  hasUnsavedChanges: boolean,
  isValidating: boolean
}
```

**Methods**:
- `loadTransaction(transactionId)`: Fetches transaction data via IPC
- `handleFieldChange(field, value)`: Updates edited transaction state
- `validateChanges()`: Calls ValidationEngine via IPC
- `handleSave()`: Opens ConfirmationDialog if validation passes
- `handleCancel()`: Closes editor with unsaved changes prompt if needed

#### ConfirmationDialog Component

**Purpose**: Show before/after comparison and impact analysis

**Props**:
```javascript
{
  originalTransaction: Transaction,
  editedTransaction: Transaction,
  impact: EditImpact,
  onConfirm: () => void,
  onCancel: () => void
}
```

**State**:
```javascript
{
  isCommitting: boolean
}
```

**Methods**:
- `renderComparison()`: Displays side-by-side field comparison
- `renderImpact()`: Shows affected calculations
- `handleConfirm()`: Commits changes via IPC

### Backend Services (Electron Main Process)

#### TransactionService

**Purpose**: Orchestrate transaction editing operations

**Interface**:
```javascript
class TransactionService {
  // Fetch transaction by ID
  async getTransaction(transactionId: string): Promise<Transaction>
  
  // Validate proposed edits
  async validateEdit(
    transactionId: string,
    editedTransaction: Transaction
  ): Promise<ValidationResult>
  
  // Calculate impact of edits
  async calculateImpact(
    transactionId: string,
    editedTransaction: Transaction
  ): Promise<EditImpact>
  
  // Commit edited transaction
  async commitEdit(
    transactionId: string,
    editedTransaction: Transaction
  ): Promise<CommitResult>
}
```

#### ValidationEngine

**Purpose**: Ensure edits maintain FIFO integrity

**Interface**:
```javascript
class ValidationEngine {
  // Validate buy quantity reduction
  async validateBuyQuantityReduction(
    transactionId: string,
    newQuantity: number
  ): Promise<ValidationResult>
  
  // Validate date change
  async validateDateChange(
    transactionId: string,
    newDate: Date
  ): Promise<ValidationResult>
  
  // Validate type change (buy ↔ sell)
  async validateTypeChange(
    transactionId: string,
    newType: 'buy' | 'sell'
  ): Promise<ValidationResult>
  
  // Validate all constraints
  async validateTransaction(
    original: Transaction,
    edited: Transaction
  ): Promise<ValidationResult>
}
```

**Validation Rules**:

1. **Buy Quantity Reduction**: 
   - Query all sell transactions matched to this buy via FIFO
   - Sum matched quantities
   - Ensure new quantity ≥ matched quantity

2. **Date Change**:
   - For buy transactions: ensure new date is before all matched sell dates
   - For sell transactions: ensure new date is after all matched buy dates
   - Ensure new date doesn't violate chronological FIFO order

3. **Type Change (Buy → Sell)**:
   - Calculate available buy quantity before transaction date
   - Ensure available quantity ≥ sell quantity

4. **Type Change (Sell → Buy)**:
   - Verify no FIFO matches exist for this transaction
   - If matches exist, reject the change

#### CalculationEngine

**Purpose**: Recalculate FIFO matches and gains after edits

**Interface**:
```javascript
class CalculationEngine {
  // Recalculate FIFO matches for a stock
  async recalculateFIFO(
    stockSymbol: string,
    fromDate: Date
  ): Promise<FIFOResult>
  
  // Recalculate realized gains
  async recalculateRealizedGains(
    stockSymbol: string,
    financialYear: string
  ): Promise<RealizedGainsResult>
  
  // Recalculate portfolio holdings
  async recalculateHoldings(
    stockSymbol: string
  ): Promise<HoldingsResult>
  
  // Orchestrate full recalculation
  async recalculateAll(
    affectedStocks: string[],
    fromDate: Date
  ): Promise<RecalculationResult>
}
```

**Recalculation Strategy**:

1. Identify affected stocks (stock symbol in original or edited transaction)
2. Find earliest affected date (min of original and edited dates)
3. Clear all FIFO matches and realized gains from that date forward
4. Reprocess all transactions chronologically from that date
5. Rebuild FIFO matches using standard FIFO algorithm
6. Recalculate realized gains for each match
7. Update portfolio holdings for affected stocks

#### AuditLogger

**Purpose**: Record transaction modification history

**Interface**:
```javascript
class AuditLogger {
  // Log a transaction edit
  async logEdit(
    transactionId: string,
    originalValues: Transaction,
    newValues: Transaction,
    timestamp: Date
  ): Promise<void>
  
  // Retrieve edit history
  async getEditHistory(
    transactionId: string
  ): Promise<AuditEntry[]>
}
```

## Data Models

### Transaction

```javascript
{
  id: string,                    // UUID
  date: Date,                    // Transaction date
  stockSymbol: string,           // NSE/BSE symbol
  type: 'buy' | 'sell',         // Transaction type
  quantity: number,              // Number of shares
  pricePerShare: number,         // Price in ₹
  totalAmount: number,           // quantity × pricePerShare
  createdAt: Date,               // Record creation timestamp
  modifiedAt: Date | null        // Last modification timestamp
}
```

### TransactionAudit

```javascript
{
  id: string,                    // UUID
  transactionId: string,         // Reference to transaction
  modifiedAt: Date,              // Modification timestamp
  fieldName: string,             // Field that was changed
  oldValue: string,              // Original value (JSON)
  newValue: string               // New value (JSON)
}
```

### ValidationResult

```javascript
{
  isValid: boolean,
  errors: ValidationError[]
}

// ValidationError
{
  field: string,                 // Field with error
  message: string,               // Human-readable error
  constraint: string,            // Constraint violated
  details: object                // Additional context
}
```

### EditImpact

```javascript
{
  affectedStocks: string[],
  realizedGainsChange: {
    before: number,
    after: number,
    delta: number
  },
  holdingsChange: {
    before: number,
    after: number,
    delta: number
  },
  affectedTransactionCount: number
}
```

### CommitResult

```javascript
{
  success: boolean,
  transactionId: string,
  recalculationResult: RecalculationResult,
  error: string | null
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Edit Action Availability

*For any* transaction list, every transaction should have an associated edit action available in the UI.

**Validates: Requirements 1.1**

### Property 2: Editor Pre-population

*For any* transaction, when the edit action is triggered, the Transaction Editor should open with all fields pre-filled with the transaction's current values.

**Validates: Requirements 1.2**

### Property 3: Single Edit Session

*For any* transaction list state, at most one transaction should be in edit mode at any given time.

**Validates: Requirements 1.3**

### Property 4: Field Editability

*For any* transaction in the editor, all fields (date, stockSymbol, type, quantity, pricePerShare) should be modifiable.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 5: Change Indication

*For any* field modification in the editor, the modified field should be visually marked as changed in the UI state.

**Validates: Requirements 2.6**

### Property 6: Buy Quantity Validation

*For any* buy transaction with FIFO matches, reducing the quantity below the total matched quantity should fail validation with a specific error indicating the minimum required quantity.

**Validates: Requirements 3.1**

### Property 7: Date Change Validation

*For any* transaction with FIFO matches, changing the date such that it violates chronological FIFO order (buy after sell or sell before buy) should fail validation with a specific error explaining the date constraint.

**Validates: Requirements 3.2**

### Property 8: Buy-to-Sell Type Change Validation

*For any* buy transaction being changed to a sell transaction, validation should verify that sufficient buy quantity exists before the transaction date, and reject the change if insufficient.

**Validates: Requirements 3.3**

### Property 9: Sell-to-Buy Type Change Validation

*For any* sell transaction with FIFO matches being changed to a buy transaction, validation should reject the change with an error identifying the conflicting matched transactions.

**Validates: Requirements 3.4**

### Property 10: Validation Error Messages

*For any* validation failure, the validation result should contain a specific error message explaining why the edit cannot be applied.

**Validates: Requirements 3.5**

### Property 11: Save Enablement

*For any* transaction edit that passes validation, the save action should be enabled in the Transaction Editor UI state.

**Validates: Requirements 3.6**

### Property 12: Confirmation Dialog Content

*For any* transaction edit being saved, the confirmation dialog should display original values, new values, highlighted changed fields, impact on realized gains, and impact on portfolio holdings.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 13: FIFO Recalculation

*For any* confirmed transaction edit, all FIFO matches for the affected stock(s) from the earliest affected date forward should be recalculated and match the result of reprocessing all transactions chronologically.

**Validates: Requirements 5.1**

### Property 14: Realized Gains Recalculation

*For any* confirmed transaction edit, realized gains for all affected transactions should be recalculated based on the updated FIFO matches.

**Validates: Requirements 5.2**

### Property 15: Holdings Recalculation

*For any* confirmed transaction edit, current portfolio holdings for the affected stock should equal the sum of all buy quantities minus all sell quantities after the edit.

**Validates: Requirements 5.3**

### Property 16: Portfolio Value Recalculation

*For any* confirmed transaction edit, portfolio value and unrealized gains should be recalculated based on updated holdings and current market prices.

**Validates: Requirements 5.4**

### Property 17: Transaction List Refresh

*For any* completed recalculation, the transaction list should refresh to display the updated transaction values.

**Validates: Requirements 5.5**

### Property 18: Audit Log Completeness

*For any* saved transaction edit, the audit log should contain an entry with the modification timestamp, original values of all changed fields, and new values of all changed fields.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 19: Audit History Display

*For any* transaction that has been edited, viewing the transaction details should display the complete modification history.

**Validates: Requirements 6.4**

### Property 20: Audit History Chronology

*For any* transaction edited multiple times, the audit log should maintain all modifications in chronological order.

**Validates: Requirements 6.5**

### Property 21: Confirmation Before Commit

*For any* save action in the Transaction Editor, the confirmation dialog should display before any database changes are committed.

**Validates: Requirements 7.1**

### Property 22: Commit on Confirmation

*For any* confirmed edit in the confirmation dialog, the edited transaction should be saved to the database.

**Validates: Requirements 7.2**

### Property 23: Discard on Cancel

*For any* cancelled confirmation dialog, no database changes should occur and the dialog should close.

**Validates: Requirements 7.3**

### Property 24: Early Cancellation

*For any* cancellation in the Transaction Editor before clicking save, no confirmation dialog should appear and no changes should be saved.

**Validates: Requirements 7.4**

### Property 25: Unsaved Changes Warning

*For any* attempt to close the Transaction Editor with unsaved changes, a confirmation prompt should appear before discarding changes.

**Validates: Requirements 7.5**

### Property 26: Error Recovery

*For any* database error during save, the Transaction Editor should display an error message and preserve the user's edits in the editor state for retry.

**Validates: Requirements 8.4**

### Property 27: Progress Indication

*For any* recalculation operation in progress, the Transaction Editor should display a progress indicator in the UI state.

**Validates: Requirements 9.4**

## Error Handling

### Validation Errors

**Buy Quantity Insufficient**:
- Error Code: `INSUFFICIENT_BUY_QUANTITY`
- Message: "Cannot reduce quantity to {newQuantity}. Minimum required: {minQuantity} (already matched to {matchedSellCount} sell transactions)"
- Recovery: User must increase quantity or delete matched sell transactions first

**Date Conflict**:
- Error Code: `DATE_CONFLICT`
- Message: "Cannot change date to {newDate}. This would violate FIFO order with {conflictingTransactionCount} transactions"
- Recovery: User must choose a different date that maintains chronological order

**Type Change Conflict**:
- Error Code: `TYPE_CHANGE_CONFLICT`
- Message: "Cannot change transaction type. {reason}"
  - For buy→sell: "Insufficient buy quantity ({available}) before this date"
  - For sell→buy: "This transaction is matched to {matchCount} buy transactions"
- Recovery: User must keep original type or resolve conflicts first

### Database Errors

**Save Failure**:
- Error Code: `DATABASE_SAVE_ERROR`
- Message: "Failed to save transaction: {dbError}"
- Recovery: Preserve edits in UI, offer retry button

**Recalculation Failure**:
- Error Code: `RECALCULATION_ERROR`
- Message: "Transaction saved but recalculation failed: {error}"
- Recovery: Offer manual recalculation trigger, log error for debugging

### Concurrency Errors

**Concurrent Edit**:
- Error Code: `CONCURRENT_EDIT`
- Message: "This transaction was modified by another process. Please refresh and try again."
- Recovery: Reload transaction, ask user to reapply changes

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Unit tests should focus on:
- Specific validation scenarios (e.g., reducing buy quantity below matched amount)
- Integration between components (e.g., editor → validation → confirmation flow)
- Error conditions (e.g., database failures, concurrent edits)
- UI state transitions (e.g., opening editor, showing confirmation dialog)

Property tests should focus on:
- Universal validation rules (e.g., all buy quantity reductions respect FIFO matches)
- Recalculation correctness (e.g., FIFO matches always equal reprocessing from scratch)
- Audit logging completeness (e.g., all edits are logged with complete information)
- Data integrity (e.g., holdings always equal sum of buys minus sells)

### Property-Based Testing Configuration

**Testing Library**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `Feature: transaction-editing, Property {number}: {property_text}`

**Example Property Test Structure**:

```javascript
import fc from 'fast-check';

// Feature: transaction-editing, Property 13: FIFO Recalculation
test('FIFO recalculation matches reprocessing from scratch', () => {
  fc.assert(
    fc.property(
      portfolioArbitrary(),
      transactionEditArbitrary(),
      async (portfolio, edit) => {
        // Apply edit and recalculate
        const result = await applyEditAndRecalculate(portfolio, edit);
        
        // Reprocess from scratch
        const expected = await reprocessFromScratch(portfolio, edit);
        
        // FIFO matches should be identical
        expect(result.fifoMatches).toEqual(expected.fifoMatches);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Data Generators

**Portfolio Generator**:
- Generate random portfolios with 1-50 stocks
- Each stock has 1-20 transactions
- Mix of buy and sell transactions
- Dates span 1-5 years
- Ensure valid FIFO state (sells don't exceed buys)

**Transaction Edit Generator**:
- Generate random edits to existing transactions
- Include valid and invalid edits
- Cover all field types (date, quantity, price, type, stock)
- Include edge cases (zero quantity, future dates, negative prices)

**FIFO Match Generator**:
- Generate portfolios with known FIFO matches
- Include partially matched buys
- Include fully matched buys
- Include unmatched buys and sells

### Integration Testing

**End-to-End Edit Workflow**:
1. Create test portfolio with known FIFO state
2. Open editor for a transaction
3. Modify fields
4. Validate changes
5. Confirm in dialog
6. Verify database changes
7. Verify recalculation results
8. Verify audit log entries
9. Verify UI refresh

**Validation Scenarios**:
- Valid edits that should pass
- Invalid edits that should fail with specific errors
- Edge cases (boundary values, empty fields, extreme dates)

**Recalculation Scenarios**:
- Edit affecting single stock
- Edit affecting multiple stocks (stock symbol change)
- Edit affecting many transactions (early date change)
- Edit with no FIFO impact (price change only)

### Manual Testing Checklist

- [ ] Edit transaction and verify all fields are editable
- [ ] Attempt invalid edit and verify error message is clear
- [ ] Confirm edit and verify confirmation dialog shows correct before/after
- [ ] Cancel edit and verify no changes are saved
- [ ] Edit transaction with FIFO matches and verify recalculation is correct
- [ ] Edit transaction multiple times and verify audit history is complete
- [ ] Attempt to edit two transactions simultaneously and verify only one editor opens
- [ ] Close editor with unsaved changes and verify warning appears
- [ ] Trigger database error and verify edits are preserved for retry
- [ ] Edit transaction and verify transaction list refreshes with new values
