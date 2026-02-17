// Price Manager for API resilience and caching
const databaseManager = require('../database/index');
const breezeClient = require('./breezeClient');
const { EventEmitter } = require('events');

class PriceManager extends EventEmitter {
  constructor(stockLookupService = null) {
    super();
    this.refreshInterval = null;
    this.marketHoursRefreshInterval = 30000; // 30 seconds during market hours
    this.offHoursRefreshInterval = 3600000; // 1 hour outside market hours
    this.isRunning = false;
    this.failureCount = 0;
    this.maxFailures = 5;
    this.stockLookupService = stockLookupService;
  }

  /**
   * Initialize price manager
   */
  async initialize() {
    try {
      console.log('Price manager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize price manager:', error);
      throw error;
    }
  }

  /**
   * Set the stock lookup service for BSE code mapping
   * @param {StockLookupService} service - The stock lookup service instance
   */
  setStockLookupService(service) {
    this.stockLookupService = service;
    console.log('Stock lookup service injected into price manager');
  }

  /**
   * Map user stock codes to BSE ShortNames
   * @param {Array} stockCodes - Array of user stock codes
   * @returns {Object} Object with mapped codes and unmapped codes
   */
  mapStockCodes(stockCodes) {
    const mapped = [];
    const unmapped = [];

    if (!this.stockLookupService || !this.stockLookupService.isReady()) {
      console.warn('Stock lookup service not available, using stock codes as-is');
      return {
        mapped: stockCodes.map(code => ({ userCode: code, bseShortName: code })),
        unmapped: []
      };
    }

    for (const code of stockCodes) {
      // Try lookup by scrip code first
      let stockInfo = this.stockLookupService.lookupByScripCode(code);
      
      // If not found, try by short name
      if (!stockInfo) {
        stockInfo = this.stockLookupService.lookupByShortName(code);
      }

      if (stockInfo && stockInfo.ShortName) {
        mapped.push({
          userCode: code,
          bseShortName: stockInfo.ShortName
        });
      } else {
        console.warn(`Unable to map stock code: ${code}`);
        unmapped.push(code);
      }
    }

    return { mapped, unmapped };
  }

  /**
   * Start automatic price updates
   */
  startAutoUpdate(symbols) {
    try {
      if (this.isRunning) {
        console.warn('Price manager is already running');
        return;
      }

      if (!symbols || symbols.length === 0) {
        throw new Error('At least one symbol is required');
      }

      this.isRunning = true;
      this.failureCount = 0;

      // Initial update
      this.updatePrices(symbols);

      // Schedule periodic updates
      this.scheduleNextUpdate(symbols);

      console.log(`Price manager started for ${symbols.length} symbols`);
      this.emit('started');
    } catch (error) {
      console.error('Failed to start price manager:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Schedule next price update based on market hours
   */
  scheduleNextUpdate(symbols) {
    try {
      if (!this.isRunning) {
        return;
      }

      // Clear existing interval
      if (this.refreshInterval) {
        clearTimeout(this.refreshInterval);
      }

      // Determine interval based on market status
      const marketInfo = breezeClient.getMarketTimeInfo();
      
      let interval;
      if (marketInfo.isOpen) {
        // During market hours: 30 seconds
        interval = this.marketHoursRefreshInterval;
      } else if (marketInfo.status === 'pre-market') {
        // Before market opens: update every 5 minutes
        interval = 5 * 60 * 1000;
      } else if (marketInfo.status === 'post-market') {
        // After market closes: update every 30 minutes
        interval = 30 * 60 * 1000;
      } else if (marketInfo.status === 'weekend') {
        // Weekend: update every 1 hour
        interval = this.offHoursRefreshInterval;
      } else {
        // Default: 1 hour
        interval = this.offHoursRefreshInterval;
      }

      console.log(`Scheduling next price update in ${interval / 1000} seconds (market status: ${marketInfo.status})`);

      this.refreshInterval = setTimeout(() => {
        this.updatePrices(symbols);
        this.scheduleNextUpdate(symbols);
      }, interval);
    } catch (error) {
      console.error('Failed to schedule price update:', error);
    }
  }

  /**
   * Update prices for symbols
   */
  async updatePrices(symbols) {
    try {
      if (!symbols || symbols.length === 0) {
        return;
      }

      // Map stock codes to BSE ShortNames
      const { mapped, unmapped } = this.mapStockCodes(symbols);

      // Log warnings for unmapped codes
      if (unmapped.length > 0) {
        console.warn(`Skipping ${unmapped.length} unmapped stock codes:`, unmapped);
      }

      // Skip if no mapped codes
      if (mapped.length === 0) {
        console.warn('No stock codes could be mapped to BSE ShortNames');
        return;
      }

      // Extract BSE ShortNames for API call
      const bseShortNames = mapped.map(m => m.bseShortName);

      // Get quotes from API using BSE exchange
      const quotes = await breezeClient.getMultipleQuotes(bseShortNames, 'BSE');

      // Process and cache quotes
      for (const quote of quotes) {
        if (quote.error) {
          console.warn(`Failed to get price for ${quote.symbol}: ${quote.error}`);
          continue;
        }

        // Find the original user code for this BSE ShortName
        const mapping = mapped.find(m => m.bseShortName === quote.symbol);
        const userCode = mapping ? mapping.userCode : quote.symbol;

        // Save to database cache using original user stock code as key
        await this.savePriceCache({
          ...quote,
          symbol: userCode, // Use original user code for cache key
          exchange: 'BSE'
        });

        // Emit price update event with user code
        this.emit('priceUpdate', {
          ...quote,
          symbol: userCode,
          exchange: 'BSE'
        });
      }

      // Reset failure count on success
      this.failureCount = 0;
      this.emit('updateSuccess', { count: quotes.length });
    } catch (error) {
      this.failureCount++;
      console.error(`Price update failed (attempt ${this.failureCount}):`, error);

      if (this.failureCount >= this.maxFailures) {
        console.error('Max failures reached, stopping price updates');
        this.stopAutoUpdate();
        this.emit('maxFailuresReached');
      }

      this.emit('updateError', error);
    }
  }

  /**
   * Save price to database cache
   */
  async savePriceCache(quote) {
    try {
      const existing = databaseManager.getOne(
        'SELECT id FROM price_cache WHERE symbol = ? AND exchange = ?',
        [quote.symbol, quote.exchange]
      );

      if (existing) {
        await databaseManager.update(
          `UPDATE price_cache 
           SET price = ?, bid = ?, ask = ?, high = ?, low = ?, 
               open = ?, close = ?, volume = ?, change = ?, 
               change_percent = ?, updated_at = ?
           WHERE symbol = ? AND exchange = ?`,
          [
            quote.price,
            quote.bid,
            quote.ask,
            quote.high,
            quote.low,
            quote.open,
            quote.close,
            quote.volume,
            quote.change,
            quote.changePercent,
            new Date().toISOString(),
            quote.symbol,
            quote.exchange
          ]
        );
      } else {
        await databaseManager.insert(
          `INSERT INTO price_cache 
           (symbol, exchange, price, bid, ask, high, low, open, close, 
            volume, change, change_percent, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            quote.symbol,
            quote.exchange,
            quote.price,
            quote.bid,
            quote.ask,
            quote.high,
            quote.low,
            quote.open,
            quote.close,
            quote.volume,
            quote.change,
            quote.changePercent,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
      }
    } catch (error) {
      console.error(`Failed to save price cache for ${quote.symbol}:`, error);
    }
  }

  /**
   * Get cached price
   */
  getCachedPrice(symbol, exchange = 'BSE') {
    try {
      const price = databaseManager.getOne(
        'SELECT * FROM price_cache WHERE symbol = ? AND exchange = ?',
        [symbol, exchange]
      );

      return price;
    } catch (error) {
      console.error(`Failed to get cached price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple cached prices
   */
  getCachedPrices(symbols, exchange = 'BSE') {
    try {
      const placeholders = symbols.map(() => '?').join(',');
      const prices = databaseManager.getAll(
        `SELECT * FROM price_cache WHERE symbol IN (${placeholders}) AND exchange = ?`,
        [...symbols, exchange]
      );

      return prices;
    } catch (error) {
      console.error('Failed to get cached prices:', error);
      return [];
    }
  }

  /**
   * Get price with fallback to cache
   */
  async getPriceWithFallback(symbol, exchange = 'BSE') {
    try {
      // Map the stock code to BSE ShortName
      const { mapped, unmapped } = this.mapStockCodes([symbol]);

      let bseShortName = symbol;
      if (mapped.length > 0) {
        bseShortName = mapped[0].bseShortName;
      } else if (unmapped.length > 0) {
        console.warn(`Stock code ${symbol} could not be mapped to BSE ShortName`);
      }

      // Try to get from API first
      try {
        console.log(`Attempting to get live price for ${symbol} (BSE: ${bseShortName}) from ${exchange}`);
        
        // Check if breezeClient is initialized
        const status = breezeClient.getStatus();
        if (!status.connected) {
          throw new Error('Breeze API not initialized. Please go to Settings → API Configuration and either test your connection or re-save your credentials to initialize the API client.');
        }
        
        const quote = await breezeClient.getStockQuote(bseShortName, exchange);
        console.log(`✓ Got live price for ${symbol}:`, quote.price);
        
        // Save to cache using original user code
        await this.savePriceCache({
          ...quote,
          symbol: symbol, // Use original user code for cache key
          exchange: exchange
        });
        
        return {
          ...quote,
          symbol: symbol, // Return with original user code
          exchange: exchange
        };
      } catch (error) {
        console.warn(`Failed to get live price for ${symbol}, using cache:`, error.message);
      }

      // Fallback to cached price using original user code
      const cached = this.getCachedPrice(symbol, exchange);

      if (cached) {
        console.log(`Using cached price for ${symbol}:`, cached.price);
        return {
          symbol,
          exchange,
          price: cached.price,
          bid: cached.bid,
          ask: cached.ask,
          high: cached.high,
          low: cached.low,
          open: cached.open,
          close: cached.close,
          volume: cached.volume,
          change: cached.change,
          changePercent: cached.change_percent,
          timestamp: cached.updated_at,
          isCached: true
        };
      }

      throw new Error(`No price available for ${symbol} - no live data and no cache. Please initialize Breeze API in Settings → API Configuration.`);
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Stop automatic price updates
   */
  stopAutoUpdate() {
    try {
      if (this.refreshInterval) {
        clearTimeout(this.refreshInterval);
        this.refreshInterval = null;
      }

      this.isRunning = false;
      console.log('Price manager stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('Failed to stop price manager:', error);
    }
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      failureCount: this.failureCount,
      maxFailures: this.maxFailures,
      marketHoursInterval: this.marketHoursRefreshInterval,
      offHoursInterval: this.offHoursRefreshInterval,
      marketInfo: breezeClient.getMarketTimeInfo(),
      apiStatus: breezeClient.getStatus()
    };
  }

  /**
   * Cleanup
   */
  shutdown() {
    try {
      this.stopAutoUpdate();
      console.log('Price manager shut down');
    } catch (error) {
      console.error('Error shutting down price manager:', error);
    }
  }
}

// Export singleton instance
const priceManager = new PriceManager();
module.exports = priceManager;
