// Common database queries for Stock Portfolio Manager
const databaseManager = require('./index');

class DatabaseQueries {
  constructor() {
    this.db = databaseManager;
  }

  // ==================== USER QUERIES ====================

  /**
   * Create a new user
   */
  createUser(username, passwordHash) {
    const sql = `
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `;
    return this.db.insert(sql, [username, passwordHash]);
  }

  /**
   * Get user by username
   */
  getUserByUsername(username) {
    const sql = `
      SELECT id, username, password_hash, created_at, last_login, is_active
      FROM users
      WHERE username = ? AND is_active = 1
    `;
    return this.db.getOne(sql, [username]);
  }

  /**
   * Update user last login
   */
  updateUserLastLogin(userId) {
    const sql = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return this.db.update(sql, [userId]);
  }

  // ==================== STOCK QUERIES ====================

  /**
   * Get all stocks
   */
  getAllStocks() {
    const sql = `
      SELECT id, symbol, company_name, exchange, sector, industry, stock_token
      FROM stocks
      ORDER BY symbol
    `;
    return this.db.getAll(sql);
  }

  /**
   * Get stock by symbol
   */
  getStockBySymbol(symbol) {
    const sql = `
      SELECT id, symbol, company_name, exchange, sector, industry, stock_token
      FROM stocks
      WHERE symbol = ?
    `;
    return this.db.getOne(sql, [symbol]);
  }

  /**
   * Create or update stock
   */
  upsertStock(stockData) {
    const sql = `
      INSERT INTO stocks (
        symbol, company_name, exchange, sector, industry, stock_token,
        bse_short_name, scrip_name, isin_code, week_52_high, week_52_low
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        company_name = excluded.company_name,
        exchange = excluded.exchange,
        sector = excluded.sector,
        industry = excluded.industry,
        stock_token = excluded.stock_token,
        bse_short_name = excluded.bse_short_name,
        scrip_name = excluded.scrip_name,
        isin_code = excluded.isin_code,
        week_52_high = excluded.week_52_high,
        week_52_low = excluded.week_52_low,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return this.db.executeQuery(sql, [
      stockData.symbol,
      stockData.companyName,
      stockData.exchange,
      stockData.sector,
      stockData.industry,
      stockData.stockToken,
      stockData.bseShortName || null,
      stockData.scripName || null,
      stockData.isinCode || null,
      stockData.week52High || null,
      stockData.week52Low || null
    ]);
  }

  // ==================== TRANSACTION QUERIES ====================

  /**
   * Add a new transaction
   */
  addTransaction(userId, transactionData) {
    const sql = `
      INSERT INTO transactions (
        user_id, stock_id, transaction_type, quantity, price, charges,
        transaction_date, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.db.insert(sql, [
      userId,
      transactionData.stockId,
      transactionData.transactionType,
      transactionData.quantity,
      transactionData.price,
      transactionData.charges || 0,
      transactionData.transactionDate,
      transactionData.notes || null
    ]);
  }

  /**
   * Get all transactions for a user
   */
  getUserTransactions(userId, filters = {}) {
    let sql = `
      SELECT 
        t.id, t.transaction_type, t.quantity, t.price, t.charges,
        t.transaction_date, t.notes, t.created_at,
        s.symbol, s.company_name, s.exchange, s.sector
      FROM transactions t
      JOIN stocks s ON t.stock_id = s.id
      WHERE t.user_id = ?
    `;
    
    const params = [userId];
    
    // Add filters
    if (filters.symbol) {
      sql += ' AND s.symbol = ?';
      params.push(filters.symbol);
    }
    
    if (filters.transactionType) {
      sql += ' AND t.transaction_type = ?';
      params.push(filters.transactionType);
    }
    
    if (filters.startDate) {
      sql += ' AND t.transaction_date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND t.transaction_date <= ?';
      params.push(filters.endDate);
    }
    
    sql += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
    
    return this.db.getAll(sql, params);
  }

  /**
   * Get buy transactions for FIFO calculation
   */
  getBuyTransactionsForStock(userId, stockId, beforeDate = null) {
    let sql = `
      SELECT id, quantity, price, transaction_date, charges
      FROM transactions
      WHERE user_id = ? AND stock_id = ? AND transaction_type = 'BUY'
    `;
    
    const params = [userId, stockId];
    
    if (beforeDate) {
      sql += ' AND transaction_date <= ?';
      params.push(beforeDate);
    }
    
    sql += ' ORDER BY transaction_date ASC, created_at ASC';
    
    return this.db.getAll(sql, params);
  }

  /**
   * Update transaction
   */
  updateTransaction(transactionId, userId, transactionData) {
    const sql = `
      UPDATE transactions
      SET stock_id = ?, transaction_type = ?, quantity = ?, price = ?,
          charges = ?, transaction_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    
    return this.db.update(sql, [
      transactionData.stockId,
      transactionData.transactionType,
      transactionData.quantity,
      transactionData.price,
      transactionData.charges || 0,
      transactionData.transactionDate,
      transactionData.notes || null,
      transactionId,
      userId
    ]);
  }

  /**
   * Delete transaction
   */
  deleteTransaction(transactionId, userId) {
    const sql = `
      DELETE FROM transactions
      WHERE id = ? AND user_id = ?
    `;
    return this.db.delete(sql, [transactionId, userId]);
  }

  // ==================== PORTFOLIO QUERIES ====================

  /**
   * Get current portfolio holdings for a user
   */
  getPortfolioHoldings(userId) {
    const sql = `
      SELECT 
        s.id as stock_id,
        s.symbol,
        s.company_name,
        s.exchange,
        s.sector,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) as total_quantity,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity * t.price + t.charges ELSE 0 END) as total_investment,
        SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.quantity * t.price - t.charges ELSE 0 END) as total_sales,
        COUNT(t.id) as transaction_count
      FROM stocks s
      JOIN transactions t ON s.id = t.stock_id
      WHERE t.user_id = ?
      GROUP BY s.id, s.symbol, s.company_name, s.exchange, s.sector
      HAVING total_quantity > 0
      ORDER BY s.symbol
    `;
    
    return this.db.getAll(sql, [userId]);
  }

  /**
   * Get portfolio summary for a user
   */
  getPortfolioSummary(userId) {
    const sql = `
      SELECT 
        COUNT(DISTINCT s.id) as total_stocks,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity * t.price + t.charges ELSE 0 END) as total_investment,
        SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.quantity * t.price - t.charges ELSE 0 END) as total_sales,
        COUNT(t.id) as total_transactions
      FROM transactions t
      JOIN stocks s ON t.stock_id = s.id
      WHERE t.user_id = ?
    `;
    
    return this.db.getOne(sql, [userId]);
  }

  // ==================== PRICE CACHE QUERIES ====================

  /**
   * Update price cache
   */
  updatePriceCache(stockId, symbol, priceData) {
    const sql = `
      INSERT INTO price_cache (
        stock_id, symbol, ltp, change_amount, change_percent, volume, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stock_id) DO UPDATE SET
        ltp = excluded.ltp,
        change_amount = excluded.change_amount,
        change_percent = excluded.change_percent,
        volume = excluded.volume,
        timestamp = excluded.timestamp,
        created_at = CURRENT_TIMESTAMP
    `;
    
    return this.db.executeQuery(sql, [
      stockId,
      symbol,
      priceData.ltp,
      priceData.changeAmount,
      priceData.changePercent,
      priceData.volume,
      priceData.timestamp
    ]);
  }

  /**
   * Get cached prices for portfolio stocks
   */
  getCachedPrices(stockIds) {
    if (!stockIds || stockIds.length === 0) {
      return [];
    }
    
    const placeholders = stockIds.map(() => '?').join(',');
    const sql = `
      SELECT stock_id, symbol, ltp, change_amount, change_percent, volume, timestamp
      FROM price_cache
      WHERE stock_id IN (${placeholders})
    `;
    
    return this.db.getAll(sql, stockIds);
  }

  // ==================== REALIZED GAINS QUERIES ====================

  /**
   * Add realized gain record
   */
  addRealizedGain(userId, gainData) {
    const sql = `
      INSERT INTO realized_gains (
        user_id, sell_transaction_id, buy_transaction_id, symbol,
        quantity, buy_price, sell_price, buy_date, sell_date,
        holding_period, gain_amount, gain_type, tax_rate, financial_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.db.insert(sql, [
      userId,
      gainData.sellTransactionId,
      gainData.buyTransactionId,
      gainData.symbol,
      gainData.quantity,
      gainData.buyPrice,
      gainData.sellPrice,
      gainData.buyDate,
      gainData.sellDate,
      gainData.holdingPeriod,
      gainData.gainAmount,
      gainData.gainType,
      gainData.taxRate,
      gainData.financialYear
    ]);
  }

  /**
   * Get realized gains for financial year
   */
  getRealizedGainsByFinancialYear(userId, financialYear) {
    const sql = `
      SELECT *
      FROM realized_gains
      WHERE user_id = ? AND financial_year = ?
      ORDER BY sell_date DESC, symbol
    `;
    
    return this.db.getAll(sql, [userId, financialYear]);
  }

  // ==================== APP SETTINGS QUERIES ====================

  /**
   * Get app setting
   */
  getAppSetting(key) {
    const sql = `
      SELECT value
      FROM app_settings
      WHERE key = ?
    `;
    
    const result = this.db.getOne(sql, [key]);
    return result ? result.value : null;
  }

  /**
   * Set app setting
   */
  setAppSetting(key, value) {
    const sql = `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return this.db.executeQuery(sql, [key, value]);
  }

  // ==================== API SETTINGS QUERIES ====================

}

// Export singleton instance
const databaseQueries = new DatabaseQueries();
module.exports = databaseQueries;