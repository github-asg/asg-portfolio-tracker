// Consolidated Holdings Service for combining direct and indirect stock exposure
const databaseManager = require('../database/index');
const priceManager = require('../api/priceManager');
const stockExposureCalculator = require('./stockExposureCalculator');
const mutualFundService = require('./mutualFundService');

class ConsolidatedHoldingsService {
  /**
   * Get direct holdings from transaction history
   * @param {number} userId - User ID
   * @returns {Promise<Map>} - Map of symbol -> { shares, avgCost, stockId, stockName }
   */
  async getDirectHoldings(userId) {
    try {
      const holdings = databaseManager.getAll(
        `SELECT s.id, s.symbol, s.company_name as name, s.scrip_cd,
                SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) as quantity,
                AVG(CASE WHEN t.transaction_type = 'BUY' THEN t.price ELSE NULL END) as avgCost
         FROM transactions t
         JOIN stocks s ON t.stock_id = s.id
         WHERE t.user_id = ?
         GROUP BY s.id, s.symbol, s.company_name, s.scrip_cd
         HAVING quantity > 0`,
        [userId]
      );

      const directHoldingsMap = new Map();

      for (const holding of holdings) {
        // Use scrip_cd as the key to match with mutual fund allocations
        const key = holding.scrip_cd || holding.symbol;
        directHoldingsMap.set(key, {
          stockId: holding.id,
          stockSymbol: key,
          stockName: holding.name,
          shares: holding.quantity,
          avgCost: holding.avgCost
        });
      }

      return directHoldingsMap;
    } catch (error) {
      console.error('Failed to get direct holdings:', error);
      throw error;
    }
  }

  /**
   * Get consolidated holdings combining direct and indirect exposure
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - { holdings, summary }
   */
  async getConsolidatedHoldings(userId) {
    try {
      // Get direct holdings
      const directHoldingsMap = await this.getDirectHoldings(userId);

      // Get indirect holdings
      const indirectHoldings = await stockExposureCalculator.calculateAllIndirectHoldings();
      const aggregatedIndirect = stockExposureCalculator.aggregateIndirectHoldings(indirectHoldings);

      // Collect all unique stock symbols
      const allSymbols = new Set([
        ...directHoldingsMap.keys(),
        ...aggregatedIndirect.keys()
      ]);

      // Get current prices for all stocks
      const stockPricesMap = await stockExposureCalculator.getStockPrices(Array.from(allSymbols));

      // Combine direct and indirect holdings
      const consolidatedHoldings = [];
      let totalPortfolioValue = 0;

      for (const symbol of allSymbols) {
        const direct = directHoldingsMap.get(symbol);
        const indirect = aggregatedIndirect.get(symbol);
        const currentPrice = stockPricesMap.get(symbol) || 0;

        const directShares = direct ? direct.shares : 0;
        const indirectShares = indirect ? indirect.totalShares : 0;
        const totalShares = directShares + indirectShares;

        const directValue = directShares * currentPrice;
        const indirectValue = indirectShares * currentPrice;
        const totalValue = totalShares * currentPrice;

        totalPortfolioValue += totalValue;

        consolidatedHoldings.push({
          stockSymbol: symbol,
          stockName: direct ? direct.stockName : (indirect ? indirect.stockName : symbol),
          currentPrice,
          directHoldings: {
            shares: directShares,
            value: directValue,
            avgCost: direct ? direct.avgCost : 0
          },
          indirectHoldings: {
            totalShares: indirectShares,
            totalValue: indirectValue,
            breakdown: indirect ? indirect.breakdown : []
          },
          totalHoldings: {
            shares: totalShares,
            value: totalValue
          },
          allocationPercent: 0 // Will be calculated after we know total portfolio value
        });
      }

      // Calculate allocation percentages
      for (const holding of consolidatedHoldings) {
        if (totalPortfolioValue > 0) {
          holding.allocationPercent = (holding.totalHoldings.value / totalPortfolioValue) * 100;
          // Round to 2 decimal places
          holding.allocationPercent = Math.round(holding.allocationPercent * 100) / 100;
        }
      }

      // Sort by total value descending
      consolidatedHoldings.sort((a, b) => b.totalHoldings.value - a.totalHoldings.value);

      // Calculate portfolio summary
      const summary = await this.calculatePortfolioSummary(userId, consolidatedHoldings);

      return {
        holdings: consolidatedHoldings,
        summary
      };
    } catch (error) {
      console.error('Failed to get consolidated holdings:', error);
      throw error;
    }
  }

  /**
   * Calculate portfolio summary statistics
   * @param {number} userId - User ID
   * @param {Array} holdings - Consolidated holdings array
   * @returns {Promise<Object>} - { totalValue, directValue, indirectValue, mutualFundValue }
   */
  async calculatePortfolioSummary(userId, holdings) {
    try {
      // Calculate direct and indirect values from holdings
      let directValue = 0;
      let indirectValue = 0;

      for (const holding of holdings) {
        directValue += holding.directHoldings.value;
        indirectValue += holding.indirectHoldings.totalValue;
      }

      // Get total mutual fund value
      const mutualFunds = await mutualFundService.getAllMutualFunds();
      const mutualFundValue = mutualFunds.reduce((sum, mf) => sum + mf.current_value, 0);

      const totalValue = directValue + mutualFundValue;

      return {
        totalValue,
        directValue,
        indirectValue,
        mutualFundValue,
        directPercent: totalValue > 0 ? Math.round((directValue / totalValue) * 10000) / 100 : 0,
        mutualFundPercent: totalValue > 0 ? Math.round((mutualFundValue / totalValue) * 10000) / 100 : 0
      };
    } catch (error) {
      console.error('Failed to calculate portfolio summary:', error);
      throw error;
    }
  }
}

module.exports = new ConsolidatedHoldingsService();
