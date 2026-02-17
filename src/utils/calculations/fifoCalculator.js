// FIFO (First In First Out) Calculator for stock portfolio
// Implements chronological lot consumption for accurate capital gains calculation

class FIFOCalculator {
  /**
   * Calculate FIFO for a sell transaction
   * Returns matched buy lots with holding periods and gains
   */
  static calculateFIFO(buyLots, sellQuantity, sellPrice, sellDate) {
    try {
      if (!buyLots || buyLots.length === 0) {
        throw new Error('No buy lots available');
      }

      if (sellQuantity <= 0) {
        throw new Error('Sell quantity must be greater than 0');
      }

      // Sort buy lots chronologically (oldest first)
      const sortedLots = [...buyLots].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      const matchedLots = [];
      let remainingQuantity = sellQuantity;
      let totalCost = 0;

      // Match lots chronologically (FIFO)
      for (const lot of sortedLots) {
        if (remainingQuantity <= 0) break;

        const quantityFromLot = Math.min(remainingQuantity, lot.availableQuantity);

        const matchedLot = {
          buyTransactionId: lot.id, // Preserve the buy transaction ID
          buyDate: lot.date,
          buyPrice: lot.price,
          quantity: quantityFromLot,
          cost: quantityFromLot * lot.price,
          sellDate: sellDate,
          sellPrice: sellPrice,
          proceeds: quantityFromLot * sellPrice,
          holdingPeriod: this.calculateHoldingPeriod(lot.date, sellDate),
          gainLoss: (quantityFromLot * sellPrice) - (quantityFromLot * lot.price)
        };

        // Classify as STCG or LTCG
        matchedLot.classification = this.classifyGain(matchedLot.holdingPeriod);

        matchedLots.push(matchedLot);
        totalCost += matchedLot.cost;
        remainingQuantity -= quantityFromLot;
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient quantity. Need ${remainingQuantity} more shares`);
      }

      return {
        matchedLots,
        totalQuantity: sellQuantity,
        totalCost,
        totalProceeds: sellQuantity * sellPrice,
        totalGainLoss: (sellQuantity * sellPrice) - totalCost,
        averageCost: totalCost / sellQuantity
      };
    } catch (error) {
      console.error('FIFO calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate holding period in days
   */
  static calculateHoldingPeriod(buyDate, sellDate) {
    try {
      const buy = new Date(buyDate);
      const sell = new Date(sellDate);

      const diffTime = Math.abs(sell - buy);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (error) {
      console.error('Holding period calculation failed:', error);
      throw error;
    }
  }

  /**
   * Classify gain as STCG (Short Term Capital Gain) or LTCG (Long Term Capital Gain)
   * In India: LTCG if holding period > 12 months, else STCG
   */
  static classifyGain(holdingPeriodDays) {
    const LTCG_THRESHOLD_DAYS = 365; // 12 months

    if (holdingPeriodDays > LTCG_THRESHOLD_DAYS) {
      return 'LTCG'; // Long Term Capital Gain
    } else {
      return 'STCG'; // Short Term Capital Gain
    }
  }

  /**
   * Calculate tax on capital gains
   * India tax rates: STCG = 20%, LTCG = 10% (above ₹1 lakh exemption)
   */
  static calculateTax(gainLoss, classification, financialYearLTCGGains = 0) {
    try {
      if (gainLoss <= 0) {
        return 0; // No tax on losses
      }

      if (classification === 'LTCG') {
        // LTCG: 10% tax with ₹1 lakh exemption per financial year
        const LTCG_EXEMPTION = 100000; // ₹1 lakh
        const LTCG_TAX_RATE = 0.10; // 10%

        const taxableAmount = Math.max(0, (financialYearLTCGGains + gainLoss) - LTCG_EXEMPTION);
        const tax = taxableAmount * LTCG_TAX_RATE;

        return tax;
      } else {
        // STCG: 20% tax (added to income, taxed as per slab)
        // For simplicity, using flat 20% rate
        const STCG_TAX_RATE = 0.20; // 20%
        return gainLoss * STCG_TAX_RATE;
      }
    } catch (error) {
      console.error('Tax calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate average cost of holdings
   */
  static calculateAverageCost(holdings) {
    try {
      if (!holdings || holdings.length === 0) {
        return 0;
      }

      let totalCost = 0;
      let totalQuantity = 0;

      for (const holding of holdings) {
        totalCost += holding.quantity * holding.price;
        totalQuantity += holding.quantity;
      }

      return totalQuantity > 0 ? totalCost / totalQuantity : 0;
    } catch (error) {
      console.error('Average cost calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate unrealized gains for current holdings
   */
  static calculateUnrealizedGains(holdings, currentPrice) {
    try {
      if (!holdings || holdings.length === 0) {
        return {
          totalCost: 0,
          totalValue: 0,
          totalGain: 0,
          gainPercentage: 0
        };
      }

      let totalCost = 0;
      let totalQuantity = 0;

      for (const holding of holdings) {
        totalCost += holding.quantity * holding.price;
        totalQuantity += holding.quantity;
      }

      const totalValue = totalQuantity * currentPrice;
      const totalGain = totalValue - totalCost;
      const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

      return {
        totalCost,
        totalValue,
        totalGain,
        gainPercentage,
        quantity: totalQuantity,
        averageCost: totalCost / totalQuantity,
        currentPrice
      };
    } catch (error) {
      console.error('Unrealized gains calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get remaining holdings after a sell transaction
   */
  static getRemainingHoldings(buyLots, matchedLots) {
    try {
      const remaining = [];

      for (const lot of buyLots) {
        let remainingQuantity = lot.availableQuantity;

        // Subtract matched quantities
        for (const matched of matchedLots) {
          if (matched.buyDate === lot.date && matched.buyPrice === lot.price) {
            remainingQuantity -= matched.quantity;
          }
        }

        if (remainingQuantity > 0) {
          remaining.push({
            ...lot,
            availableQuantity: remainingQuantity
          });
        }
      }

      return remaining;
    } catch (error) {
      console.error('Failed to get remaining holdings:', error);
      throw error;
    }
  }

  /**
   * Validate buy and sell transactions
   */
  static validateTransaction(transactionType, quantity, price, date) {
    try {
      if (!transactionType || !['buy', 'sell'].includes(transactionType.toLowerCase())) {
        throw new Error('Invalid transaction type. Must be "buy" or "sell"');
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

      const transactionDate = new Date(date);
      if (isNaN(transactionDate.getTime())) {
        throw new Error('Invalid transaction date');
      }

      if (transactionDate > new Date()) {
        throw new Error('Transaction date cannot be in the future');
      }

      return true;
    } catch (error) {
      console.error('Transaction validation failed:', error);
      throw error;
    }
  }
}

module.exports = FIFOCalculator;
