/**
 * Unrealized Gains Calculator
 * Calculates real-time unrealized gains/losses based on current prices
 */

class UnrealizedGainsCalculator {
  /**
   * Calculate unrealized gains for a single holding
   * @param {number} quantity - Number of shares held
   * @param {number} avgCost - Average cost per share
   * @param {number} currentPrice - Current market price per share
   * @returns {Object} Unrealized gain/loss details
   */
  static calculateHoldingGains(quantity, avgCost, currentPrice) {
    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!avgCost || avgCost <= 0) {
      throw new Error('Average cost must be greater than 0');
    }

    if (currentPrice === null || currentPrice === undefined || currentPrice < 0) {
      throw new Error('Current price must be a valid non-negative number');
    }

    const totalCost = quantity * avgCost;
    const currentValue = quantity * currentPrice;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = (gainLoss / totalCost) * 100;

    return {
      quantity,
      avgCost,
      currentPrice,
      totalCost,
      currentValue,
      gainLoss,
      gainLossPercent,
      isGain: gainLoss > 0,
      isLoss: gainLoss < 0,
      isBreakeven: gainLoss === 0
    };
  }

  /**
   * Calculate unrealized gains for entire portfolio
   * @param {Array} holdings - Array of holdings with quantity, avgCost, currentPrice
   * @returns {Object} Portfolio-level unrealized gains
   */
  static calculatePortfolioGains(holdings) {
    if (!holdings || !Array.isArray(holdings)) {
      throw new Error('Holdings must be an array');
    }

    if (holdings.length === 0) {
      return {
        totalInvestment: 0,
        currentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        holdings: [],
        gainCount: 0,
        lossCount: 0,
        breakevenCount: 0
      };
    }

    let totalInvestment = 0;
    let currentValue = 0;
    let gainCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;

    const calculatedHoldings = holdings.map(holding => {
      const gains = this.calculateHoldingGains(
        holding.quantity,
        holding.avgCost,
        holding.currentPrice
      );

      totalInvestment += gains.totalCost;
      currentValue += gains.currentValue;

      if (gains.isGain) gainCount++;
      else if (gains.isLoss) lossCount++;
      else breakevenCount++;

      return {
        ...holding,
        ...gains
      };
    });

    const totalGainLoss = currentValue - totalInvestment;
    const totalGainLossPercent = totalInvestment > 0 
      ? (totalGainLoss / totalInvestment) * 100 
      : 0;

    return {
      totalInvestment,
      currentValue,
      totalGainLoss,
      totalGainLossPercent,
      holdings: calculatedHoldings,
      gainCount,
      lossCount,
      breakevenCount,
      holdingCount: holdings.length
    };
  }

  /**
   * Calculate sector-wise unrealized gains
   * @param {Array} holdings - Array of holdings with sector, quantity, avgCost, currentPrice
   * @returns {Object} Sector-wise breakdown
   */
  static calculateSectorGains(holdings) {
    if (!holdings || !Array.isArray(holdings)) {
      throw new Error('Holdings must be an array');
    }

    const sectorMap = {};

    holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown';

      if (!sectorMap[sector]) {
        sectorMap[sector] = {
          sector,
          holdings: [],
          totalInvestment: 0,
          currentValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0
        };
      }

      const gains = this.calculateHoldingGains(
        holding.quantity,
        holding.avgCost,
        holding.currentPrice
      );

      sectorMap[sector].holdings.push({
        ...holding,
        ...gains
      });

      sectorMap[sector].totalInvestment += gains.totalCost;
      sectorMap[sector].currentValue += gains.currentValue;
    });

    // Calculate percentages for each sector
    Object.keys(sectorMap).forEach(sector => {
      const sectorData = sectorMap[sector];
      sectorData.totalGainLoss = sectorData.currentValue - sectorData.totalInvestment;
      sectorData.totalGainLossPercent = sectorData.totalInvestment > 0
        ? (sectorData.totalGainLoss / sectorData.totalInvestment) * 100
        : 0;
    });

    return Object.values(sectorMap);
  }

  /**
   * Calculate gain/loss color coding
   * @param {number} gainLoss - Gain/loss amount
   * @returns {string} Color code ('gain', 'loss', 'breakeven')
   */
  static getGainLossColor(gainLoss) {
    if (gainLoss > 0) return 'gain';
    if (gainLoss < 0) return 'loss';
    return 'breakeven';
  }

  /**
   * Calculate portfolio allocation percentages
   * @param {Array} holdings - Array of holdings with currentValue
   * @returns {Array} Holdings with allocation percentages
   */
  static calculateAllocation(holdings) {
    if (!holdings || !Array.isArray(holdings)) {
      throw new Error('Holdings must be an array');
    }

    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

    if (totalValue === 0) {
      return holdings.map(h => ({
        ...h,
        allocationPercent: 0
      }));
    }

    return holdings.map(h => ({
      ...h,
      allocationPercent: ((h.currentValue || 0) / totalValue) * 100
    }));
  }

  /**
   * Get holdings sorted by gain/loss
   * @param {Array} holdings - Array of holdings with gainLoss
   * @param {string} sortBy - 'gain' or 'loss'
   * @returns {Array} Sorted holdings
   */
  static sortByGainLoss(holdings, sortBy = 'gain') {
    if (!holdings || !Array.isArray(holdings)) {
      throw new Error('Holdings must be an array');
    }

    const sorted = [...holdings];

    if (sortBy === 'gain') {
      sorted.sort((a, b) => (b.gainLoss || 0) - (a.gainLoss || 0));
    } else if (sortBy === 'loss') {
      sorted.sort((a, b) => (a.gainLoss || 0) - (b.gainLoss || 0));
    }

    return sorted;
  }

  /**
   * Get top gainers
   * @param {Array} holdings - Array of holdings
   * @param {number} limit - Number of top gainers to return
   * @returns {Array} Top gainers
   */
  static getTopGainers(holdings, limit = 5) {
    return this.sortByGainLoss(holdings, 'gain').slice(0, limit);
  }

  /**
   * Get top losers
   * @param {Array} holdings - Array of holdings
   * @param {number} limit - Number of top losers to return
   * @returns {Array} Top losers
   */
  static getTopLosers(holdings, limit = 5) {
    return this.sortByGainLoss(holdings, 'loss').slice(0, limit);
  }
}

module.exports = UnrealizedGainsCalculator;
