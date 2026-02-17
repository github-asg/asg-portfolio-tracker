// Stock Manager for managing stock master data
const databaseManager = require('../database/index');

class StockManager {
  constructor() {
    this.stockLookupService = null;
  }

  /**
   * Set the stock lookup service for BSE data integration
   */
  setStockLookupService(service) {
    this.stockLookupService = service;
    console.log('Stock lookup service injected into StockManager');
  }

  /**
   * Create a new stock
   */
  async createStock(symbol, name, exchange = 'BSE', sector = null, isin = null) {
    try {
      if (!symbol || !name) {
        throw new Error('Symbol and name are required');
      }

      // Validate symbol format
      if (!/^[A-Z0-9&-]{1,10}$/.test(symbol)) {
        throw new Error('Invalid symbol format');
      }

      // Check for duplicate
      const existing = databaseManager.getOne(
        'SELECT id FROM stocks WHERE symbol = ? AND exchange = ?',
        [symbol.toUpperCase(), exchange]
      );

      if (existing) {
        throw new Error(`Stock ${symbol} already exists on ${exchange}`);
      }

      // Lookup BSE data if stock lookup service is available
      let bseData = null;
      if (this.stockLookupService && this.stockLookupService.isReady()) {
        // Try lookup by symbol (could be ScripCode or ShortName)
        bseData = this.stockLookupService.lookupByScripCode(symbol) || 
                  this.stockLookupService.lookupByShortName(symbol);
        
        if (bseData) {
          console.log(`✓ BSE data found for ${symbol}: ${bseData.ScripName}`);
        } else {
          console.warn(`⚠ BSE data not found for ${symbol} - inserting without BSE fields`);
        }
      }

      // Create stock with BSE fields
      const stockId = await databaseManager.insert(
        `INSERT INTO stocks (
          symbol, company_name, exchange, sector, isin, 
          bse_short_name, scrip_name, isin_code, week_52_high, week_52_low,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          symbol.toUpperCase(),
          name.trim(),
          exchange,
          sector ? sector.trim() : null,
          isin ? isin.trim() : null,
          bseData ? bseData.ShortName : null,
          bseData ? bseData.ScripName : null,
          bseData ? bseData.ISINCode : null,
          bseData ? bseData['52WeeksHigh'] : null,
          bseData ? bseData['52WeeksLow'] : null,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      console.log(`Stock created: ${symbol} (ID: ${stockId})`);

      return {
        id: stockId,
        symbol: symbol.toUpperCase(),
        name: name.trim(),
        exchange,
        sector,
        isin,
        bseShortName: bseData ? bseData.ShortName : null,
        scripName: bseData ? bseData.ScripName : null,
        isinCode: bseData ? bseData.ISINCode : null,
        week52High: bseData ? bseData['52WeeksHigh'] : null,
        week52Low: bseData ? bseData['52WeeksLow'] : null
      };
    } catch (error) {
      console.error('Failed to create stock:', error);
      throw error;
    }
  }

  /**
   * Get stock by symbol
   */
  getStockBySymbol(symbol, exchange = 'BSE') {
    try {
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      const stock = databaseManager.getOne(
        'SELECT * FROM stocks WHERE symbol = ? AND exchange = ?',
        [symbol.toUpperCase(), exchange]
      );

      if (!stock) {
        throw new Error(`Stock ${symbol} not found on ${exchange}`);
      }

      return stock;
    } catch (error) {
      console.error(`Failed to get stock ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get stock by ID
   */
  getStockById(stockId) {
    try {
      if (!stockId) {
        throw new Error('Stock ID is required');
      }

      const stock = databaseManager.getOne(
        'SELECT * FROM stocks WHERE id = ?',
        [stockId]
      );

      if (!stock) {
        throw new Error(`Stock with ID ${stockId} not found`);
      }

      return stock;
    } catch (error) {
      console.error(`Failed to get stock ${stockId}:`, error);
      throw error;
    }
  }

  /**
   * Get all stocks
   */
  getAllStocks(exchange = null) {
    try {
      let query = 'SELECT * FROM stocks';
      const params = [];

      if (exchange) {
        query += ' WHERE exchange = ?';
        params.push(exchange);
      }

      query += ' ORDER BY symbol';

      const stocks = databaseManager.getAll(query, params);
      return stocks;
    } catch (error) {
      console.error('Failed to get all stocks:', error);
      throw error;
    }
  }

  /**
   * Search stocks by name or symbol
   */
  searchStocks(searchTerm, exchange = null) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new Error('Search term is required');
      }

      const term = `%${searchTerm.toUpperCase()}%`;
      let query = 'SELECT * FROM stocks WHERE symbol LIKE ? OR name LIKE ?';
      const params = [term, term];

      if (exchange) {
        query += ' AND exchange = ?';
        params.push(exchange);
      }

      query += ' ORDER BY symbol LIMIT 20';

      const stocks = databaseManager.getAll(query, params);
      return stocks;
    } catch (error) {
      console.error('Failed to search stocks:', error);
      throw error;
    }
  }

  /**
   * Get stocks by sector
   */
  getStocksBySector(sector, exchange = null) {
    try {
      if (!sector) {
        throw new Error('Sector is required');
      }

      let query = 'SELECT * FROM stocks WHERE sector = ?';
      const params = [sector];

      if (exchange) {
        query += ' AND exchange = ?';
        params.push(exchange);
      }

      query += ' ORDER BY symbol';

      const stocks = databaseManager.getAll(query, params);
      return stocks;
    } catch (error) {
      console.error('Failed to get stocks by sector:', error);
      throw error;
    }
  }

  /**
   * Update stock information
   */
  async updateStock(stockId, updates) {
    try {
      if (!stockId) {
        throw new Error('Stock ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      // Verify stock exists
      const stock = this.getStockById(stockId);

      // Build update query
      const allowedFields = ['name', 'sector', 'isin'];
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
      updateValues.push(stockId);

      const query = `UPDATE stocks SET ${updateFields.join(', ')} WHERE id = ?`;

      await databaseManager.update(query, updateValues);

      console.log(`Stock updated: ${stock.symbol}`);

      return this.getStockById(stockId);
    } catch (error) {
      console.error('Failed to update stock:', error);
      throw error;
    }
  }

  /**
   * Delete stock
   */
  async deleteStock(stockId) {
    try {
      if (!stockId) {
        throw new Error('Stock ID is required');
      }

      // Verify stock exists
      const stock = this.getStockById(stockId);

      // Check if stock has transactions
      const transactionCount = databaseManager.getOne(
        'SELECT COUNT(*) as count FROM transactions WHERE stock_id = ?',
        [stockId]
      );

      if (transactionCount.count > 0) {
        throw new Error(`Cannot delete stock with ${transactionCount.count} transactions`);
      }

      // Delete stock
      await databaseManager.delete(
        'DELETE FROM stocks WHERE id = ?',
        [stockId]
      );

      console.log(`Stock deleted: ${stock.symbol}`);
      return true;
    } catch (error) {
      console.error('Failed to delete stock:', error);
      throw error;
    }
  }

  /**
   * Get all sectors
   */
  getAllSectors(exchange = null) {
    try {
      let query = 'SELECT DISTINCT sector FROM stocks WHERE sector IS NOT NULL';
      const params = [];

      if (exchange) {
        query += ' AND exchange = ?';
        params.push(exchange);
      }

      query += ' ORDER BY sector';

      const result = databaseManager.getAll(query, params);
      return result.map(r => r.sector);
    } catch (error) {
      console.error('Failed to get sectors:', error);
      throw error;
    }
  }

  /**
   * Get stock count
   */
  getStockCount(exchange = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM stocks';
      const params = [];

      if (exchange) {
        query += ' WHERE exchange = ?';
        params.push(exchange);
      }

      const result = databaseManager.getOne(query, params);
      return result.count;
    } catch (error) {
      console.error('Failed to get stock count:', error);
      throw error;
    }
  }

  /**
   * Validate stock exists
   */
  validateStockExists(symbol, exchange = 'BSE') {
    try {
      const stock = databaseManager.getOne(
        'SELECT id FROM stocks WHERE symbol = ? AND exchange = ?',
        [symbol.toUpperCase(), exchange]
      );

      return !!stock;
    } catch (error) {
      console.error('Failed to validate stock:', error);
      return false;
    }
  }

  /**
   * Get stock information with transaction count
   */
  getStockInfo(stockId) {
    try {
      if (!stockId) {
        throw new Error('Stock ID is required');
      }

      const stock = this.getStockById(stockId);

      // Get transaction count
      const transactionCount = databaseManager.getOne(
        'SELECT COUNT(*) as count FROM transactions WHERE stock_id = ?',
        [stockId]
      );

      // Get total quantity held
      const holdings = databaseManager.getOne(
        `SELECT SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) as quantity
         FROM transactions WHERE stock_id = ?`,
        [stockId]
      );

      // Get average cost
      const avgCost = databaseManager.getOne(
        `SELECT AVG(price) as avgCost FROM transactions 
         WHERE stock_id = ? AND transaction_type = 'BUY'`,
        [stockId]
      );

      return {
        ...stock,
        transactionCount: transactionCount.count,
        currentHolding: holdings.quantity || 0,
        averageCost: avgCost.avgCost || 0
      };
    } catch (error) {
      console.error(`Failed to get stock info for ${stockId}:`, error);
      throw error;
    }
  }

  /**
   * Get all stocks with transaction counts
   */
  getAllStocksWithInfo(exchange = null) {
    try {
      const stocks = this.getAllStocks(exchange);

      return stocks.map(stock => {
        const transactionCount = databaseManager.getOne(
          'SELECT COUNT(*) as count FROM transactions WHERE stock_id = ?',
          [stock.id]
        );

        const holdings = databaseManager.getOne(
          `SELECT SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) as quantity
           FROM transactions WHERE stock_id = ?`,
          [stock.id]
        );

        return {
          ...stock,
          transactionCount: transactionCount.count,
          currentHolding: holdings.quantity || 0
        };
      });
    } catch (error) {
      console.error('Failed to get all stocks with info:', error);
      throw error;
    }
  }

  /**
   * Bulk create stocks
   */
  async bulkCreateStocks(stocks) {
    try {
      if (!stocks || stocks.length === 0) {
        throw new Error('At least one stock is required');
      }

      const created = [];
      const failed = [];

      for (const stock of stocks) {
        try {
          const result = await this.createStock(
            stock.symbol,
            stock.name,
            stock.exchange || 'NSE',
            stock.sector,
            stock.isin
          );

          created.push(result);
        } catch (error) {
          failed.push({
            symbol: stock.symbol,
            error: error.message
          });
        }
      }

      console.log(`Bulk create completed: ${created.length} created, ${failed.length} failed`);

      return {
        created,
        failed,
        total: stocks.length
      };
    } catch (error) {
      console.error('Failed to bulk create stocks:', error);
      throw error;
    }
  }
}

// Export singleton instance
const stockManager = new StockManager();
module.exports = stockManager;
