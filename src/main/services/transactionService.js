// TransactionService for orchestrating transaction editing operations
// Coordinates validation, audit logging, and recalculation

const ValidationEngine = require('./validationEngine');
const AuditLogger = require('./auditLogger');
const FIFOCalculator = require('../../utils/calculations/fifoCalculator');

class TransactionService {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.validationEngine = new ValidationEngine(databaseManager);
    this.auditLogger = new AuditLogger(databaseManager);
  }

  /**
   * Get transaction by ID with full details
   * @param {number} transactionId - Transaction ID
   * @returns {Object} Transaction with stock details
   */
  async getTransaction(transactionId) {
    try {
      const transaction = this.db.getOne(
        `SELECT t.*, s.symbol, s.company_name
         FROM transactions t
         JOIN stocks s ON t.stock_id = s.id
         WHERE t.id = ?`,
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Get edit history
      const editSummary = await this.auditLogger.getEditSummary(transactionId);

      return {
        ...transaction,
        editSummary
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw error;
    }
  }

  /**
   * Validate proposed transaction edit
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Object} Validation result
   */
  async validateEdit(transactionId, editedTransaction) {
    try {
      const original = await this.getTransaction(transactionId);
      
      // Validate using ValidationEngine
      const validationResult = await this.validationEngine.validateTransaction(
        original,
        editedTransaction
      );

      return validationResult;
    } catch (error) {
      console.error('Failed to validate edit:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: error.message,
          constraint: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Calculate impact of proposed edit
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Object} Impact analysis
   */
  async calculateImpact(transactionId, editedTransaction) {
    try {
      const original = await this.getTransaction(transactionId);
      
      // Determine affected stocks
      const affectedStocks = new Set();
      affectedStocks.add(original.stock_id);
      if (editedTransaction.stock_id && editedTransaction.stock_id !== original.stock_id) {
        affectedStocks.add(editedTransaction.stock_id);
      }

      // Calculate realized gains impact (simplified for MVP)
      const realizedGainsBefore = await this.getRealizedGainsForStock(
        original.user_id,
        original.stock_id
      );

      // Calculate holdings impact
      const holdingsBefore = await this.getHoldingsForStock(
        original.user_id,
        original.stock_id
      );

      // Count affected transactions (transactions that would need recalculation)
      const affectedTransactionCount = await this.countAffectedTransactions(
        original.user_id,
        original.stock_id,
        original.transaction_date
      );

      return {
        affectedStocks: Array.from(affectedStocks),
        realizedGainsChange: {
          before: realizedGainsBefore,
          after: realizedGainsBefore, // Would need full recalc to determine
          delta: 0 // Placeholder
        },
        holdingsChange: {
          before: holdingsBefore,
          after: holdingsBefore + (editedTransaction.quantity || 0) - original.quantity,
          delta: (editedTransaction.quantity || original.quantity) - original.quantity
        },
        affectedTransactionCount
      };
    } catch (error) {
      console.error('Failed to calculate impact:', error);
      throw error;
    }
  }

  /**
   * Commit transaction edit with full recalculation
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Object} Commit result
   */
  async commitEdit(transactionId, editedTransaction) {
    const transactionContext = await this.db.beginTransaction();
    
    try {
      // Get original transaction
      const original = this.executeInTransaction(
        transactionContext,
        `SELECT * FROM transactions WHERE id = ?`,
        [transactionId]
      )[0];

      if (!original) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Validate edit
      const validationResult = await this.validateEdit(transactionId, editedTransaction);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Update transaction
      const updateFields = [];
      const updateValues = [];
      const timestamp = new Date();

      if (editedTransaction.transaction_date !== undefined) {
        updateFields.push('transaction_date = ?');
        updateValues.push(editedTransaction.transaction_date);
      }
      if (editedTransaction.stock_id !== undefined) {
        updateFields.push('stock_id = ?');
        updateValues.push(editedTransaction.stock_id);
      }
      if (editedTransaction.transaction_type !== undefined) {
        updateFields.push('transaction_type = ?');
        updateValues.push(editedTransaction.transaction_type);
      }
      if (editedTransaction.quantity !== undefined) {
        updateFields.push('quantity = ?');
        updateValues.push(editedTransaction.quantity);
      }
      if (editedTransaction.price !== undefined) {
        updateFields.push('price = ?');
        updateValues.push(editedTransaction.price);
      }
      if (editedTransaction.charges !== undefined) {
        updateFields.push('charges = ?');
        updateValues.push(editedTransaction.charges);
      }
      if (editedTransaction.notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(editedTransaction.notes);
      }

      updateFields.push('modified_at = ?');
      updateValues.push(timestamp.toISOString());
      updateFields.push('updated_at = ?');
      updateValues.push(timestamp.toISOString());

      updateValues.push(transactionId);

      this.executeInTransaction(
        transactionContext,
        `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Log audit trail
      await this.auditLogger.logEdit(
        transactionId,
        original,
        editedTransaction,
        timestamp
      );

      // Recalculate FIFO for affected stock
      await this.recalculateFIFO(
        transactionContext,
        original.user_id,
        original.stock_id,
        Math.min(
          new Date(original.transaction_date),
          new Date(editedTransaction.transaction_date || original.transaction_date)
        )
      );

      // Commit transaction
      await this.db.commitTransaction(transactionContext);

      console.log(`Transaction ${transactionId} edited successfully`);

      return {
        success: true,
        transactionId,
        timestamp: timestamp.toISOString()
      };
    } catch (error) {
      await this.db.rollbackTransaction(transactionContext);
      console.error('Failed to commit edit:', error);
      throw error;
    }
  }

  /**
   * Execute query within transaction context
   */
  executeInTransaction(transactionContext, sql, params) {
    return this.db.executeInTransaction(transactionContext, sql, params);
  }

  /**
   * Recalculate FIFO matches for a stock from a given date
   * @param {Object} transactionContext - Transaction context
   * @param {number} userId - User ID
   * @param {number} stockId - Stock ID
   * @param {Date} fromDate - Start date for recalculation
   */
  async recalculateFIFO(transactionContext, userId, stockId, fromDate) {
    try {
      // Delete existing realized gains from this date forward
      this.executeInTransaction(
        transactionContext,
        `DELETE FROM realized_gains 
         WHERE user_id = ? AND symbol IN (SELECT symbol FROM stocks WHERE id = ?)
         AND sell_date >= ?`,
        [userId, stockId, fromDate.toISOString().split('T')[0]]
      );

      // Get all transactions for this stock from the date forward
      const transactions = this.executeInTransaction(
        transactionContext,
        `SELECT t.*, s.symbol
         FROM transactions t
         JOIN stocks s ON t.stock_id = s.id
         WHERE t.user_id = ? AND t.stock_id = ? AND t.transaction_date >= ?
         ORDER BY t.transaction_date ASC, t.id ASC`,
        [userId, stockId, fromDate.toISOString().split('T')[0]]
      );

      // Get buy lots before this date (still available)
      const priorBuyLots = this.executeInTransaction(
        transactionContext,
        `SELECT t.id, t.quantity, t.price, t.transaction_date as date,
                COALESCE(SUM(rg.quantity), 0) as sold_quantity
         FROM transactions t
         LEFT JOIN realized_gains rg ON rg.buy_transaction_id = t.id
         WHERE t.user_id = ? AND t.stock_id = ? 
         AND t.transaction_type = 'BUY' AND t.transaction_date < ?
         GROUP BY t.id, t.quantity, t.price, t.transaction_date
         HAVING t.quantity > COALESCE(SUM(rg.quantity), 0)
         ORDER BY t.transaction_date ASC`,
        [userId, stockId, fromDate.toISOString().split('T')[0]]
      );

      // Build available lots
      const availableLots = priorBuyLots.map(lot => ({
        id: lot.id,
        date: lot.date,
        price: lot.price,
        quantity: lot.quantity,
        availableQuantity: lot.quantity - lot.sold_quantity
      }));

      // Process transactions chronologically
      for (const tx of transactions) {
        if (tx.transaction_type === 'BUY') {
          // Add to available lots
          availableLots.push({
            id: tx.id,
            date: tx.transaction_date,
            price: tx.price,
            quantity: tx.quantity,
            availableQuantity: tx.quantity
          });
        } else if (tx.transaction_type === 'SELL') {
          // Match with FIFO
          const fifoResult = FIFOCalculator.calculateFIFO(
            availableLots,
            tx.quantity,
            tx.price,
            tx.transaction_date
          );

          // Create realized gains records
          for (const lot of fifoResult.matchedLots) {
            const gainLoss = lot.gainLoss;
            const taxRate = lot.classification === 'LTCG' ? 0.125 : 0.20;
            
            const sellDate = new Date(tx.transaction_date);
            const fy = sellDate.getMonth() >= 3 
              ? `FY ${sellDate.getFullYear()}-${(sellDate.getFullYear() + 1) % 100}`
              : `FY ${sellDate.getFullYear() - 1}-${sellDate.getFullYear() % 100}`;

            this.executeInTransaction(
              transactionContext,
              `INSERT INTO realized_gains 
               (user_id, buy_transaction_id, sell_transaction_id, symbol,
                quantity, buy_price, sell_price, buy_date, sell_date, 
                holding_period, gain_amount, gain_type, tax_rate, 
                financial_year, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                lot.buyTransactionId,
                tx.id,
                tx.symbol,
                lot.quantity,
                lot.buyPrice,
                lot.sellPrice,
                lot.buyDate,
                lot.sellDate,
                lot.holdingPeriod,
                gainLoss,
                lot.classification,
                taxRate,
                fy,
                new Date().toISOString()
              ]
            );
          }

          // Update available lots
          for (const lot of fifoResult.matchedLots) {
            const lotIndex = availableLots.findIndex(l => l.id === lot.buyTransactionId);
            if (lotIndex !== -1) {
              availableLots[lotIndex].availableQuantity -= lot.quantity;
              if (availableLots[lotIndex].availableQuantity <= 0) {
                availableLots.splice(lotIndex, 1);
              }
            }
          }
        }
      }

      console.log(`FIFO recalculated for stock ${stockId} from ${fromDate.toISOString()}`);
    } catch (error) {
      console.error('FIFO recalculation failed:', error);
      throw error;
    }
  }

  /**
   * Get realized gains for a stock
   */
  async getRealizedGainsForStock(userId, stockId) {
    const result = this.db.getOne(
      `SELECT COALESCE(SUM(gain_amount), 0) as total_gains
       FROM realized_gains rg
       JOIN stocks s ON rg.symbol = s.symbol
       WHERE rg.user_id = ? AND s.id = ?`,
      [userId, stockId]
    );
    return result.total_gains;
  }

  /**
   * Get holdings for a stock
   */
  async getHoldingsForStock(userId, stockId) {
    const result = this.db.getOne(
      `SELECT 
         COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN transaction_type = 'SELL' THEN quantity ELSE 0 END), 0) as holdings
       FROM transactions
       WHERE user_id = ? AND stock_id = ?`,
      [userId, stockId]
    );
    return result.holdings;
  }

  /**
   * Count transactions that would be affected by recalculation
   */
  async countAffectedTransactions(userId, stockId, fromDate) {
    const result = this.db.getOne(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE user_id = ? AND stock_id = ? AND transaction_date >= ?`,
      [userId, stockId, fromDate]
    );
    return result.count;
  }
}

module.exports = TransactionService;
