/**
 * Portfolio Calculator
 * Integrates transactions, prices, and calculations for real-time portfolio analysis
 */

const databaseManager = require('../database/index');
const transactionManager = require('../transactions/transactionManager');
const priceManager = require('../api/priceManager');
const UnrealizedGainsCalculator = require('../../utils/calculations/unrealizedGains');

class PortfolioCalculator {
  /**
   * Get complete portfolio with unrealized gains
   */
  static getPortfolioWithGains(userId) {
    try {
      // Get portfolio summary from transaction manager
      const summary = transactionManager.getPortfolioSummary(userId);

      if (summary.holdings.length === 0) {
        return {
          holdings: [],
          totalInvestment: 0,
          currentValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          gainCount: 0,
          lossCount: 0,
          breakevenCount: 0,
          holdingCount: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      // Get current prices for all holdings
      const symbols = summary.holdings.map(h => h.symbol);
      const prices = priceManager.getCachedPrices(symbols);

      // Create price map for quick lookup and find the oldest price date
      const priceMap = {};
      let oldestPriceDate = null;
      
      prices.forEach(p => {
        priceMap[p.symbol] = p.price;
        
        // Track the oldest price update date
        if (p.updated_at) {
          const priceDate = new Date(p.updated_at);
          if (!oldestPriceDate || priceDate < oldestPriceDate) {
            oldestPriceDate = priceDate;
          }
        }
      });

      // Enrich holdings with current prices
      const enrichedHoldings = summary.holdings.map(holding => ({
        ...holding,
        currentPrice: priceMap[holding.symbol] || holding.avgCost, // Fallback to avg cost if no price
        symbol: holding.symbol,
        name: holding.name,
        sector: holding.sector
      }));

      // Calculate unrealized gains
      const gains = UnrealizedGainsCalculator.calculatePortfolioGains(enrichedHoldings);

      return {
        ...gains,
        lastUpdated: new Date().toISOString(),
        pricesAsOf: oldestPriceDate ? oldestPriceDate.toISOString() : null
      };
    } catch (error) {
      console.error('Failed to calculate portfolio with gains:', error);
      throw error;
    }
  }

  /**
   * Get sector-wise portfolio breakdown
   */
  static getSectorBreakdown(userId) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);

      if (portfolio.holdings.length === 0) {
        return [];
      }

      return UnrealizedGainsCalculator.calculateSectorGains(portfolio.holdings);
    } catch (error) {
      console.error('Failed to calculate sector breakdown:', error);
      throw error;
    }
  }

  /**
   * Get portfolio allocation
   */
  static getPortfolioAllocation(userId) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);

      if (portfolio.holdings.length === 0) {
        return [];
      }

      return UnrealizedGainsCalculator.calculateAllocation(portfolio.holdings);
    } catch (error) {
      console.error('Failed to calculate portfolio allocation:', error);
      throw error;
    }
  }

  /**
   * Get top gainers
   */
  static getTopGainers(userId, limit = 5) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);
      return UnrealizedGainsCalculator.getTopGainers(portfolio.holdings, limit);
    } catch (error) {
      console.error('Failed to get top gainers:', error);
      throw error;
    }
  }

  /**
   * Get top losers
   */
  static getTopLosers(userId, limit = 5) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);
      return UnrealizedGainsCalculator.getTopLosers(portfolio.holdings, limit);
    } catch (error) {
      console.error('Failed to get top losers:', error);
      throw error;
    }
  }

  /**
   * Get realized gains for a financial year
   */
  static getRealizedGainsByYear(userId, financialYear) {
    try {
      if (!financialYear) {
        throw new Error('Financial year is required');
      }

      // Parse financial year (e.g., "2024-25" or "FY 2024-25")
      const yearMatch = financialYear.match(/(\d{4})-(\d{2})/);
      if (!yearMatch) {
        throw new Error('Invalid financial year format');
      }

      const startYear = parseInt(yearMatch[1]);
      const endYear = parseInt(yearMatch[2]);

      // Calculate date range (April 1 to March 31)
      const startDate = new Date(startYear, 3, 1); // April 1
      const endDate = new Date(startYear + 1, 2, 31); // March 31

      // Get realized gains for the period
      const gains = databaseManager.getAll(
        `SELECT rg.*
         FROM realized_gains rg
         WHERE rg.user_id = ? 
         AND rg.sell_date >= ? 
         AND rg.sell_date <= ?
         ORDER BY rg.sell_date DESC`,
        [userId, startDate.toISOString(), endDate.toISOString()]
      );

      // Group by classification
      const stcg = gains.filter(g => g.gain_type === 'STCG');
      const ltcg = gains.filter(g => g.gain_type === 'LTCG');

      // Calculate totals
      const stcgTotal = stcg.reduce((sum, g) => sum + (g.gain_amount || 0), 0);
      const ltcgTotal = ltcg.reduce((sum, g) => sum + (g.gain_amount || 0), 0);

      // Calculate tax
      const stcgTax = stcgTotal > 0 ? stcgTotal * 0.20 : 0; // 20% tax
      const ltcgExemption = 100000; // ₹1 lakh exemption
      const ltcgTaxable = Math.max(0, ltcgTotal - ltcgExemption);
      const ltcgTax = ltcgTaxable > 0 ? ltcgTaxable * 0.10 : 0; // 10% tax

      return {
        financialYear,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        stcg: {
          gains: stcg,
          total: stcgTotal,
          count: stcg.length,
          taxRate: 0.20,
          estimatedTax: stcgTax
        },
        ltcg: {
          gains: ltcg,
          total: ltcgTotal,
          count: ltcg.length,
          exemption: ltcgExemption,
          taxable: ltcgTaxable,
          taxRate: 0.10,
          estimatedTax: ltcgTax
        },
        summary: {
          totalGains: stcgTotal + ltcgTotal,
          totalTax: stcgTax + ltcgTax,
          netGains: (stcgTotal + ltcgTotal) - (stcgTax + ltcgTax)
        }
      };
    } catch (error) {
      console.error('Failed to get realized gains:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance metrics
   */
  static getPerformanceMetrics(userId) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);

      if (portfolio.holdings.length === 0) {
        return {
          totalReturn: 0,
          totalReturnPercent: 0,
          averageReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          holdingCount: 0
        };
      }

      // Calculate average return
      const averageReturn = portfolio.holdings.length > 0
        ? portfolio.holdings.reduce((sum, h) => sum + (h.gainLossPercent || 0), 0) / portfolio.holdings.length
        : 0;

      // Calculate volatility (standard deviation of returns)
      const variance = portfolio.holdings.length > 0
        ? portfolio.holdings.reduce((sum, h) => {
            const diff = (h.gainLossPercent || 0) - averageReturn;
            return sum + (diff * diff);
          }, 0) / portfolio.holdings.length
        : 0;
      const volatility = Math.sqrt(variance);

      // Simplified Sharpe Ratio (assuming 6% risk-free rate)
      const riskFreeRate = 6;
      const sharpeRatio = volatility > 0
        ? (averageReturn - riskFreeRate) / volatility
        : 0;

      return {
        totalReturn: portfolio.totalGainLoss,
        totalReturnPercent: portfolio.totalGainLossPercent,
        averageReturn,
        volatility,
        sharpeRatio,
        holdingCount: portfolio.holdingCount,
        gainCount: portfolio.gainCount,
        lossCount: portfolio.lossCount
      };
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get portfolio summary for dashboard
   */
  static getDashboardSummary(userId) {
    try {
      const portfolio = this.getPortfolioWithGains(userId);
      const topGainers = this.getTopGainers(userId, 3);
      const topLosers = this.getTopLosers(userId, 3);
      const sectorBreakdown = this.getSectorBreakdown(userId);
      const metrics = this.getPerformanceMetrics(userId);

      return {
        portfolio: {
          totalInvestment: portfolio.totalInvestment,
          currentValue: portfolio.currentValue,
          totalGainLoss: portfolio.totalGainLoss,
          totalGainLossPercent: portfolio.totalGainLossPercent,
          holdingCount: portfolio.holdingCount,
          gainCount: portfolio.gainCount,
          lossCount: portfolio.lossCount
        },
        topGainers,
        topLosers,
        sectorBreakdown,
        metrics,
        lastUpdated: portfolio.lastUpdated
      };
    } catch (error) {
      console.error('Failed to get dashboard summary:', error);
      throw error;
    }
  }
}

module.exports = PortfolioCalculator;
