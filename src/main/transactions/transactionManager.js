// Transaction Manager for buy/sell transaction processing
const databaseManager = require('../database/index');
const stockManager = require('../stocks/stockManager');
const FIFOCalculator = require('../../utils/calculations/fifoCalculator');
const CapitalGainsCalculator = require('../../utils/calculations/capitalGainsCalculator');
const { EventEmitter } = require('events');

class TransactionManager extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Emit portfolio update event
   */
  emitPortfolioUpdate(userId) {
    try {
      this.emit('portfolioUpdate', {
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to emit portfolio update:', error);
    }
  }

  /**
   * Add a buy transaction
   */
  async addBuyTransaction(userId, stockId, quantity, price, transactionDate, notes = null) {
    try {
      // Validate inputs
      this.validateTransaction('buy', quantity, price, transactionDate);

      // Verify stock exists
      const stock = stockManager.getStockById(stockId);

      // Create transaction
      const transactionId = await databaseManager.insert(
        `INSERT INTO transactions 
         (user_id, stock_id, transaction_type, quantity, price, transaction_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          stockId,
          'BUY',
          quantity,
          price,
          transactionDate,
          notes,
          new Date().toISOString()
        ]
      );

      console.log(`Buy transaction created: ${stock.symbol} x${quantity} @ ₹${price}`);

      // Trigger portfolio recalculation
      this.emitPortfolioUpdate(userId);

      return {
        id: transactionId,
        type: 'buy',
        symbol: stock.symbol,
        quantity,
        price,
        amount: quantity * price,
        transactionDate,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to add buy transaction:', error);
      throw error;
    }
  }

  /**
   * Add a sell transaction with FIFO calculation
   */
  async addSellTransaction(userId, stockId, quantity, price, transactionDate, notes = null) {
    try {
      // Validate inputs
      this.validateTransaction('sell', quantity, price, transactionDate);

      // Verify stock exists
      const stock = stockManager.getStockById(stockId);

      // Get buy lots for FIFO calculation
      const buyLots = this.getBuyLots(userId, stockId);

      if (buyLots.length === 0) {
        throw new Error(`No buy lots available for ${stock.symbol}`);
      }

      // Calculate FIFO
      const fifoResult = FIFOCalculator.calculateFIFO(buyLots, quantity, price, transactionDate);

      // Create sell transaction
      const transactionId = await databaseManager.insert(
        `INSERT INTO transactions 
         (user_id, stock_id, transaction_type, quantity, price, transaction_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          stockId,
          'SELL',
          quantity,
          price,
          transactionDate,
          notes,
          new Date().toISOString()
        ]
      );

      // Create realized gains records
      for (const lot of fifoResult.matchedLots) {
        await this.createRealizedGain(
          userId,
          stockId,
          transactionId,
          lot,
          stock.symbol
        );
      }

      console.log(`Sell transaction created: ${stock.symbol} x${quantity} @ ₹${price}`);

      // Trigger portfolio recalculation
      this.emitPortfolioUpdate(userId);

      return {
        id: transactionId,
        type: 'sell',
        symbol: stock.symbol,
        quantity,
        price,
        amount: quantity * price,
        transactionDate,
        fifo: fifoResult,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to add sell transaction:', error);
      throw error;
    }
  }

  /**
   * Get buy lots for a stock
   */
  getBuyLots(userId, stockId) {
    try {
      const buyTransactions = databaseManager.getAll(
        `SELECT id, quantity, price, transaction_date as date
         FROM transactions 
         WHERE user_id = ? AND stock_id = ? AND transaction_type = 'BUY'
         ORDER BY transaction_date ASC`,
        [userId, stockId]
      );

      // Calculate available quantity for each lot
      const lots = [];

      for (const tx of buyTransactions) {
        // Get quantity already sold from this lot
        const soldResult = databaseManager.getOne(
          `SELECT COALESCE(SUM(quantity), 0) as soldQuantity
           FROM realized_gains
           WHERE buy_transaction_id = ?`,
          [tx.id]
        );

        const availableQuantity = tx.quantity - soldResult.soldQuantity;

        if (availableQuantity > 0) {
          lots.push({
            id: tx.id,
            date: tx.date,
            price: tx.price,
            quantity: tx.quantity,
            availableQuantity
          });
        }
      }

      return lots;
    } catch (error) {
      console.error('Failed to get buy lots:', error);
      throw error;
    }
  }

  /**
   * Create realized gain record
   */
  async createRealizedGain(userId, stockId, sellTransactionId, lot, symbol) {
    try {
      const gainLoss = lot.gainLoss;
      const taxRate = lot.classification === 'LTCG' ? 0.10 : 0.20;
      const estimatedTax = Math.max(0, gainLoss) * taxRate;
      
      // Calculate financial year from sell date
      const sellDate = new Date(lot.sellDate);
      const fy = sellDate.getMonth() >= 3 
        ? `FY ${sellDate.getFullYear()}-${(sellDate.getFullYear() + 1) % 100}`
        : `FY ${sellDate.getFullYear() - 1}-${sellDate.getFullYear() % 100}`;

      await databaseManager.insert(
        `INSERT INTO realized_gains 
         (user_id, buy_transaction_id, sell_transaction_id, symbol,
          quantity, buy_price, sell_price, buy_date, sell_date, 
          holding_period, gain_amount, gain_type, tax_rate, 
          financial_year, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          lot.buyTransactionId, // Use the buy transaction ID from FIFO
          sellTransactionId,
          symbol,
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

      console.log(`Realized gain recorded: ${symbol} - ${lot.classification} - ₹${gainLoss}`);
    } catch (error) {
      console.error('Failed to create realized gain:', error);
      throw error;
    }
  }

  /**
   * Get all transactions for user
   */
  getTransactions(userId, filters = {}) {
    try {
      let query = `SELECT t.id, t.user_id, t.stock_id, t.transaction_type as type, 
                   t.quantity, t.price, t.charges, t.transaction_date, t.notes, 
                   t.created_at, t.updated_at, s.symbol, s.company_name 
                   FROM transactions t
                   JOIN stocks s ON t.stock_id = s.id
                   WHERE t.user_id = ?`;
      const params = [userId];

      if (filters.type) {
        query += ' AND t.transaction_type = ?';
        params.push(filters.type.toUpperCase());
      }

      if (filters.stockId) {
        query += ' AND t.stock_id = ?';
        params.push(filters.stockId);
      }

      if (filters.startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY t.transaction_date DESC';

      const transactions = databaseManager.getAll(query, params);
      return transactions;
    } catch (error) {
      console.error('Failed to get transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  getTransactionById(transactionId) {
    try {
      const transaction = databaseManager.getOne(
        `SELECT t.id, t.user_id, t.stock_id, t.transaction_type as type, 
         t.quantity, t.price, t.charges, t.transaction_date, t.notes, 
         t.created_at, t.updated_at, s.symbol, s.company_name 
         FROM transactions t
         JOIN stocks s ON t.stock_id = s.id
         WHERE t.id = ?`,
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      return transaction;
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(transactionId, updates) {
    try {
      const transaction = this.getTransactionById(transactionId);

      if (transaction.type === 'sell') {
        throw new Error('Cannot modify sell transactions (affects FIFO calculations)');
      }

      const allowedFields = ['quantity', 'price', 'notes'];
      const updateFields = [];
      const updateValues = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(transactionId);

      const query = `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`;

      await databaseManager.update(query, updateValues);

      console.log(`Transaction updated: ${transactionId}`);

      // Trigger portfolio recalculation
      this.emitPortfolioUpdate(transaction.user_id);

      return this.getTransactionById(transactionId);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(transactionId) {
    try {
      const transaction = this.getTransactionById(transactionId);

      if (transaction.type === 'sell') {
        throw new Error('Cannot delete sell transactions (affects FIFO calculations)');
      }

      // Check if this lot has been used in sell transactions
      const usedInSell = databaseManager.getOne(
        'SELECT COUNT(*) as count FROM realized_gains WHERE buy_transaction_id = ?',
        [transactionId]
      );

      if (usedInSell.count > 0) {
        throw new Error('Cannot delete transaction that has been used in sell transactions');
      }

      await databaseManager.delete(
        'DELETE FROM transactions WHERE id = ?',
        [transactionId]
      );

      console.log(`Transaction deleted: ${transactionId}`);

      // Trigger portfolio recalculation
      this.emitPortfolioUpdate(transaction.user_id);

      return true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }

  /**
   * Validate transaction
   */
  validateTransaction(type, quantity, price, date) {
    try {
      if (!['buy', 'sell'].includes(type)) {
        throw new Error('Invalid transaction type');
      }

      if (!quantity || quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (!price || price <= 0) {
        throw new Error('Price must be greater than 0');
      }

      if (!date) {
        throw new Error('Transaction date is required');
      }

      const txDate = new Date(date);
      if (isNaN(txDate.getTime())) {
        throw new Error('Invalid transaction date');
      }

      if (txDate > new Date()) {
        throw new Error('Transaction date cannot be in the future');
      }

      return true;
    } catch (error) {
      console.error('Transaction validation failed:', error);
      throw error;
    }
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(userId) {
    try {
      const holdings = databaseManager.getAll(
        `SELECT s.id, s.symbol, s.company_name as name, s.sector,
                SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) as quantity,
                AVG(CASE WHEN t.transaction_type = 'BUY' THEN t.price ELSE NULL END) as avgCost
         FROM transactions t
         JOIN stocks s ON t.stock_id = s.id
         WHERE t.user_id = ?
         GROUP BY s.id, s.symbol, s.company_name, s.sector
         HAVING quantity > 0`,
        [userId]
      );

      let totalInvestment = 0;
      for (const holding of holdings) {
        totalInvestment += holding.quantity * holding.avgCost;
      }

      return {
        holdings,
        totalInvestment,
        holdingCount: holdings.length
      };
    } catch (error) {
      console.error('Failed to get portfolio summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
const transactionManager = new TransactionManager();
module.exports = transactionManager;
