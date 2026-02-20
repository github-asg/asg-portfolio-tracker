// Stock Exposure Calculator for computing indirect holdings from mutual funds
const databaseManager = require('../database/index');
const priceManager = require('../api/priceManager');
const mutualFundService = require('./mutualFundService');

class StockExposureCalculator {
  /**
   * Calculate indirect holdings for a single mutual fund
   * @param {Object} mutualFund - { id, currentValue }
   * @param {Array} allocations - [{ stockSymbol, allocationPercent }]
   * @param {Map} stockPrices - Map of symbol -> price
   * @returns {Array} - [{ stockSymbol, indirectShares, mutualFundId }]
   */
  calculateIndirectHoldings(mutualFund, allocations, stockPrices) {
    const indirectHoldings = [];

    for (const allocation of allocations) {
      // Skip if allocation percent is 0
      if (allocation.allocationPercent === 0) {
        continue;
      }

      // Get stock price
      const stockPrice = stockPrices.get(allocation.stockSymbol);

      // Skip if price is unavailable or zero
      if (!stockPrice || stockPrice <= 0) {
        console.warn(`Skipping ${allocation.stockSymbol}: price unavailable or zero`);
        continue;
      }

      // Calculate indirect shares: (currentValue × allocationPercent / 100) / stockPrice
      const allocationValue = (mutualFund.currentValue * allocation.allocationPercent) / 100;
      const indirectShares = allocationValue / stockPrice;

      // Round to 4 decimal places
      const roundedShares = Math.round(indirectShares * 10000) / 10000;

      indirectHoldings.push({
        stockSymbol: allocation.stockSymbol,
        stockName: allocation.stockName,
        indirectShares: roundedShares,
        mutualFundId: mutualFund.id,
        mutualFundName: mutualFund.scheme_name
      });
    }

    return indirectHoldings;
  }

  /**
   * Calculate indirect holdings for all mutual funds
   * @returns {Promise<Array>} - Array of indirect holding objects
   */
  async calculateAllIndirectHoldings() {
    try {
      // Get all mutual funds with allocations
      const mutualFunds = await mutualFundService.getAllMutualFunds();

      if (mutualFunds.length === 0) {
        return [];
      }

      // Collect all unique stock symbols
      const stockSymbols = new Set();
      for (const mf of mutualFunds) {
        for (const allocation of mf.allocations) {
          stockSymbols.add(allocation.stock_symbol);
        }
      }

      // Get current prices for all stocks
      const stockPricesMap = await this.getStockPrices(Array.from(stockSymbols));

      // Calculate indirect holdings for each mutual fund
      const allIndirectHoldings = [];
      for (const mf of mutualFunds) {
        const holdings = this.calculateIndirectHoldings(
          {
            id: mf.id,
            currentValue: mf.current_value,
            scheme_name: mf.scheme_name
          },
          mf.allocations.map(a => ({
            stockSymbol: a.stock_symbol,
            stockName: a.stock_name,
            allocationPercent: a.allocation_percent
          })),
          stockPricesMap
        );

        allIndirectHoldings.push(...holdings);
      }

      return allIndirectHoldings;
    } catch (error) {
      console.error('Failed to calculate all indirect holdings:', error);
      throw error;
    }
  }

  /**
   * Get stock prices from cache or API
   * @param {Array} symbols - Array of stock symbols
   * @returns {Promise<Map>} - Map of symbol -> price
   */
  async getStockPrices(symbols) {
    const pricesMap = new Map();

    try {
      // Try to get cached prices first
      const cachedPrices = priceManager.getCachedPrices(symbols, 'BSE');

      for (const cached of cachedPrices) {
        if (cached.price && cached.price > 0) {
          pricesMap.set(cached.symbol, cached.price);
        }
      }

      // For symbols without cached prices, try to fetch from API
      const missingSymbols = symbols.filter(s => !pricesMap.has(s));

      if (missingSymbols.length > 0) {
        console.log(`Fetching prices for ${missingSymbols.length} stocks without cache`);

        for (const symbol of missingSymbols) {
          try {
            const quote = await priceManager.getPriceWithFallback(symbol, 'BSE');
            if (quote && quote.price && quote.price > 0) {
              pricesMap.set(symbol, quote.price);
            }
          } catch (error) {
            console.warn(`Could not get price for ${symbol}:`, error.message);
          }
        }
      }

      return pricesMap;
    } catch (error) {
      console.error('Failed to get stock prices:', error);
      return pricesMap;
    }
  }

  /**
   * Aggregate indirect holdings by stock symbol
   * @param {Array} indirectHoldings - Raw indirect holdings
   * @returns {Map} - Map of symbol -> { totalShares, breakdown: [{mfId, mfName, shares}] }
   */
  aggregateIndirectHoldings(indirectHoldings) {
    const aggregated = new Map();

    for (const holding of indirectHoldings) {
      if (!aggregated.has(holding.stockSymbol)) {
        aggregated.set(holding.stockSymbol, {
          stockSymbol: holding.stockSymbol,
          stockName: holding.stockName,
          totalShares: 0,
          breakdown: []
        });
      }

      const agg = aggregated.get(holding.stockSymbol);
      agg.totalShares += holding.indirectShares;
      agg.breakdown.push({
        mutualFundId: holding.mutualFundId,
        mutualFundName: holding.mutualFundName,
        shares: holding.indirectShares
      });
    }

    // Round total shares to 4 decimal places
    for (const [symbol, data] of aggregated) {
      data.totalShares = Math.round(data.totalShares * 10000) / 10000;
    }

    return aggregated;
  }
}

module.exports = new StockExposureCalculator();
