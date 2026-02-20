// ValidationEngine service for transaction edit validation
// Ensures FIFO integrity is maintained when editing transactions

class ValidationEngine {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Validate all aspects of a transaction edit
   * @param {Object} original - Original transaction
   * @param {Object} edited - Edited transaction
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  async validateTransaction(original, edited) {
    const errors = [];

    try {
      // Validate quantity change for buy transactions
      if (original.transaction_type === 'BUY' && edited.quantity < original.quantity) {
        const quantityResult = await this.validateBuyQuantityReduction(
          original.id,
          edited.quantity
        );
        if (!quantityResult.isValid) {
          errors.push(...quantityResult.errors);
        }
      }

      // Validate date change
      if (original.transaction_date !== edited.transaction_date) {
        const dateResult = await this.validateDateChange(
          original.id,
          original.transaction_type,
          edited.transaction_date
        );
        if (!dateResult.isValid) {
          errors.push(...dateResult.errors);
        }
      }

      // Validate type change
      if (original.transaction_type !== edited.transaction_type) {
        const typeResult = await this.validateTypeChange(
          original.id,
          original.transaction_type,
          edited.transaction_type,
          original.stock_id,
          edited.transaction_date || original.transaction_date,
          edited.quantity
        );
        if (!typeResult.isValid) {
          errors.push(...typeResult.errors);
        }
      }

      // Validate stock change (if stock_id changed)
      if (original.stock_id !== edited.stock_id) {
        // For stock changes, we need to validate both old and new stock contexts
        if (original.transaction_type === 'SELL') {
          errors.push({
            field: 'stock_id',
            message: 'Cannot change stock for sell transactions that have FIFO matches',
            constraint: 'STOCK_CHANGE_WITH_MATCHES'
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: `Validation error: ${error.message}`,
          constraint: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Validate buy quantity reduction
   * @param {number} transactionId - Transaction ID
   * @param {number} newQuantity - New quantity
   * @returns {Object} ValidationResult
   */
  async validateBuyQuantityReduction(transactionId, newQuantity) {
    try {
      // Find all sell transactions matched to this buy via FIFO
      const matches = this.db.getAll(
        `SELECT SUM(quantity) as matched_quantity
         FROM realized_gains
         WHERE buy_transaction_id = ?`,
        [transactionId]
      );

      const matchedQuantity = matches[0]?.matched_quantity || 0;

      if (newQuantity < matchedQuantity) {
        return {
          isValid: false,
          errors: [{
            field: 'quantity',
            message: `Cannot reduce quantity to ${newQuantity}. Minimum required: ${matchedQuantity} (already matched to sell transactions)`,
            constraint: 'INSUFFICIENT_BUY_QUANTITY',
            details: {
              newQuantity,
              matchedQuantity,
              minRequired: matchedQuantity
            }
          }]
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      console.error('Buy quantity validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate date change
   * @param {number} transactionId - Transaction ID
   * @param {string} transactionType - Transaction type (BUY/SELL)
   * @param {string} newDate - New transaction date
   * @returns {Object} ValidationResult
   */
  async validateDateChange(transactionId, transactionType, newDate) {
    try {
      if (transactionType === 'BUY') {
        // For buy transactions: ensure new date is before all matched sell dates
        const conflictingSells = this.db.getAll(
          `SELECT t.id, t.transaction_date, t.quantity
           FROM realized_gains rg
           JOIN transactions t ON t.id = rg.sell_transaction_id
           WHERE rg.buy_transaction_id = ?
           AND t.transaction_date < ?`,
          [transactionId, newDate]
        );

        if (conflictingSells.length > 0) {
          return {
            isValid: false,
            errors: [{
              field: 'transaction_date',
              message: `Cannot change date to ${newDate}. This would violate FIFO order with ${conflictingSells.length} sell transaction(s)`,
              constraint: 'DATE_CONFLICT',
              details: {
                newDate,
                conflictingTransactions: conflictingSells.map(t => ({
                  id: t.id,
                  date: t.transaction_date,
                  quantity: t.quantity
                }))
              }
            }]
          };
        }
      } else if (transactionType === 'SELL') {
        // For sell transactions: ensure new date is after all matched buy dates
        const conflictingBuys = this.db.getAll(
          `SELECT t.id, t.transaction_date, t.quantity
           FROM realized_gains rg
           JOIN transactions t ON t.id = rg.buy_transaction_id
           WHERE rg.sell_transaction_id = ?
           AND t.transaction_date > ?`,
          [transactionId, newDate]
        );

        if (conflictingBuys.length > 0) {
          return {
            isValid: false,
            errors: [{
              field: 'transaction_date',
              message: `Cannot change date to ${newDate}. This would violate FIFO order with ${conflictingBuys.length} buy transaction(s)`,
              constraint: 'DATE_CONFLICT',
              details: {
                newDate,
                conflictingTransactions: conflictingBuys.map(t => ({
                  id: t.id,
                  date: t.transaction_date,
                  quantity: t.quantity
                }))
              }
            }]
          };
        }
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      console.error('Date change validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate type change (BUY ↔ SELL)
   * @param {number} transactionId - Transaction ID
   * @param {string} oldType - Original type
   * @param {string} newType - New type
   * @param {number} stockId - Stock ID
   * @param {string} transactionDate - Transaction date
   * @param {number} quantity - Transaction quantity
   * @returns {Object} ValidationResult
   */
  async validateTypeChange(transactionId, oldType, newType, stockId, transactionDate, quantity) {
    try {
      if (oldType === 'BUY' && newType === 'SELL') {
        // Changing buy to sell: verify sufficient buy quantity exists before this date
        const availableBuys = this.db.getOne(
          `SELECT COALESCE(SUM(quantity), 0) as total_bought
           FROM transactions
           WHERE stock_id = ?
           AND transaction_type = 'BUY'
           AND transaction_date < ?
           AND id != ?`,
          [stockId, transactionDate, transactionId]
        );

        const previousSells = this.db.getOne(
          `SELECT COALESCE(SUM(quantity), 0) as total_sold
           FROM transactions
           WHERE stock_id = ?
           AND transaction_type = 'SELL'
           AND transaction_date < ?`,
          [stockId, transactionDate]
        );

        const availableQuantity = availableBuys.total_bought - previousSells.total_sold;

        if (availableQuantity < quantity) {
          return {
            isValid: false,
            errors: [{
              field: 'transaction_type',
              message: `Cannot change to SELL. Insufficient buy quantity (${availableQuantity}) before this date`,
              constraint: 'TYPE_CHANGE_CONFLICT',
              details: {
                availableQuantity,
                requiredQuantity: quantity
              }
            }]
          };
        }
      } else if (oldType === 'SELL' && newType === 'BUY') {
        // Changing sell to buy: verify no FIFO matches exist
        const matches = this.db.getAll(
          `SELECT COUNT(*) as match_count
           FROM realized_gains
           WHERE sell_transaction_id = ?`,
          [transactionId]
        );

        const matchCount = matches[0]?.match_count || 0;

        if (matchCount > 0) {
          return {
            isValid: false,
            errors: [{
              field: 'transaction_type',
              message: `Cannot change to BUY. This transaction is matched to ${matchCount} buy transaction(s)`,
              constraint: 'TYPE_CHANGE_CONFLICT',
              details: {
                matchCount
              }
            }]
          };
        }
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      console.error('Type change validation failed:', error);
      throw error;
    }
  }
}

module.exports = ValidationEngine;
