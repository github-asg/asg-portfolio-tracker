// Capital Gains Calculator for Indian tax compliance
// Handles STCG/LTCG classification and tax calculations

const FIFOCalculator = require('./fifoCalculator');

class CapitalGainsCalculator {
  /**
   * Calculate realized gains for a sell transaction
   */
  static calculateRealizedGains(buyLots, sellQuantity, sellPrice, sellDate, stockSymbol) {
    try {
      // Calculate FIFO
      const fifoResult = FIFOCalculator.calculateFIFO(buyLots, sellQuantity, sellPrice, sellDate);

      // Aggregate by classification
      const stcgGains = [];
      const ltcgGains = [];
      let totalSTCG = 0;
      let totalLTCG = 0;

      for (const lot of fifoResult.matchedLots) {
        if (lot.classification === 'STCG') {
          stcgGains.push(lot);
          totalSTCG += lot.gainLoss;
        } else {
          ltcgGains.push(lot);
          totalLTCG += lot.gainLoss;
        }
      }

      return {
        symbol: stockSymbol,
        sellDate,
        sellPrice,
        totalQuantity: sellQuantity,
        totalCost: fifoResult.totalCost,
        totalProceeds: fifoResult.totalProceeds,
        totalGainLoss: fifoResult.totalGainLoss,
        stcg: {
          gains: stcgGains,
          totalGain: totalSTCG,
          count: stcgGains.length
        },
        ltcg: {
          gains: ltcgGains,
          totalGain: totalLTCG,
          count: ltcgGains.length
        },
        matchedLots: fifoResult.matchedLots
      };
    } catch (error) {
      console.error('Realized gains calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate capital gains report for a financial year
   * Financial year in India: April 1 to March 31
   */
  static generateCapitalGainsReport(transactions, financialYear) {
    try {
      if (!transactions || transactions.length === 0) {
        return {
          financialYear,
          startDate: this.getFinancialYearStart(financialYear),
          endDate: this.getFinancialYearEnd(financialYear),
          stcgTransactions: [],
          ltcgTransactions: [],
          totalSTCG: 0,
          totalLTCG: 0,
          totalGainLoss: 0,
          ltcgExemption: 100000,
          taxableSTCG: 0,
          taxableLTCG: 0,
          estimatedTax: 0
        };
      }

      const startDate = this.getFinancialYearStart(financialYear);
      const endDate = this.getFinancialYearEnd(financialYear);

      const stcgTransactions = [];
      const ltcgTransactions = [];
      let totalSTCG = 0;
      let totalLTCG = 0;

      // Filter transactions for the financial year
      for (const transaction of transactions) {
        const txDate = new Date(transaction.sellDate);

        if (txDate >= startDate && txDate <= endDate) {
          if (transaction.stcg && transaction.stcg.totalGain > 0) {
            stcgTransactions.push(transaction);
            totalSTCG += transaction.stcg.totalGain;
          }

          if (transaction.ltcg && transaction.ltcg.totalGain > 0) {
            ltcgTransactions.push(transaction);
            totalLTCG += transaction.ltcg.totalGain;
          }
        }
      }

      // Calculate taxes
      const LTCG_EXEMPTION = 100000; // ₹1 lakh
      const STCG_TAX_RATE = 0.20; // 20%
      const LTCG_TAX_RATE = 0.10; // 10%

      const taxableSTCG = totalSTCG;
      const taxableLTCG = Math.max(0, totalLTCG - LTCG_EXEMPTION);

      const stcgTax = taxableSTCG * STCG_TAX_RATE;
      const ltcgTax = taxableLTCG * LTCG_TAX_RATE;
      const estimatedTax = stcgTax + ltcgTax;

      return {
        financialYear,
        startDate,
        endDate,
        stcgTransactions,
        ltcgTransactions,
        totalSTCG,
        totalLTCG,
        totalGainLoss: totalSTCG + totalLTCG,
        ltcgExemption: LTCG_EXEMPTION,
        taxableSTCG,
        taxableLTCG,
        stcgTax,
        ltcgTax,
        estimatedTax,
        summary: {
          stcgCount: stcgTransactions.length,
          ltcgCount: ltcgTransactions.length,
          totalTransactions: stcgTransactions.length + ltcgTransactions.length
        }
      };
    } catch (error) {
      console.error('Capital gains report generation failed:', error);
      throw error;
    }
  }

  /**
   * Get financial year start date (April 1)
   */
  static getFinancialYearStart(financialYear) {
    try {
      // financialYear format: "2024-25" or just year "2024"
      let year;

      if (typeof financialYear === 'string' && financialYear.includes('-')) {
        year = parseInt(financialYear.split('-')[0]);
      } else {
        year = parseInt(financialYear);
      }

      return new Date(year, 3, 1); // April 1
    } catch (error) {
      console.error('Failed to get financial year start:', error);
      throw error;
    }
  }

  /**
   * Get financial year end date (March 31)
   */
  static getFinancialYearEnd(financialYear) {
    try {
      // financialYear format: "2024-25" or just year "2024"
      let year;

      if (typeof financialYear === 'string' && financialYear.includes('-')) {
        year = parseInt(financialYear.split('-')[1]);
      } else {
        year = parseInt(financialYear) + 1;
      }

      return new Date(year, 2, 31); // March 31
    } catch (error) {
      console.error('Failed to get financial year end:', error);
      throw error;
    }
  }

  /**
   * Determine financial year for a given date
   */
  static getFinancialYearForDate(date) {
    try {
      const d = new Date(date);
      const month = d.getMonth();
      const year = d.getFullYear();

      // If month is April (3) or later, it's the current year's FY
      // Otherwise, it's the previous year's FY
      if (month >= 3) {
        return `${year}-${year + 1}`;
      } else {
        return `${year - 1}-${year}`;
      }
    } catch (error) {
      console.error('Failed to determine financial year:', error);
      throw error;
    }
  }

  /**
   * Calculate LTCG exemption usage
   */
  static calculateLTCGExemptionUsage(ltcgGains) {
    try {
      const LTCG_EXEMPTION = 100000; // ₹1 lakh

      let totalLTCG = 0;
      for (const gain of ltcgGains) {
        totalLTCG += gain;
      }

      const exemptionUsed = Math.min(totalLTCG, LTCG_EXEMPTION);
      const taxableAmount = Math.max(0, totalLTCG - LTCG_EXEMPTION);

      return {
        totalLTCG,
        exemption: LTCG_EXEMPTION,
        exemptionUsed,
        taxableAmount,
        tax: taxableAmount * 0.10 // 10% tax rate
      };
    } catch (error) {
      console.error('LTCG exemption calculation failed:', error);
      throw error;
    }
  }

  /**
   * Validate capital gains data
   */
  static validateCapitalGains(gainData) {
    try {
      if (!gainData) {
        throw new Error('Capital gains data is required');
      }

      if (gainData.totalQuantity <= 0) {
        throw new Error('Total quantity must be greater than 0');
      }

      if (gainData.totalCost < 0) {
        throw new Error('Total cost cannot be negative');
      }

      if (gainData.totalProceeds < 0) {
        throw new Error('Total proceeds cannot be negative');
      }

      if (!gainData.sellDate) {
        throw new Error('Sell date is required');
      }

      return true;
    } catch (error) {
      console.error('Capital gains validation failed:', error);
      throw error;
    }
  }
}

module.exports = CapitalGainsCalculator;
