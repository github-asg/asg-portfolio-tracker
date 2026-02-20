// Lot Detail Service
// Retrieves detailed information about stock lots in specific age buckets

const StockAgeCalculator = require('./stockAgeCalculator');
const { format } = require('date-fns');

class LotDetailService {
  /**
   * Get lots in a specific age bucket for a stock
   * @param {number} userId - The user ID
   * @param {string} stockSymbol - The stock symbol
   * @param {string} bucketName - The age bucket name
   * @returns {Promise<Array>} Array of lot details
   */
  static async getLotsInBucket(userId, stockSymbol, bucketName) {
    try {
      // Get all unsold lots for the stock
      const unsoldLots = await StockAgeCalculator.getUnsoldLotsForStock(userId, stockSymbol);

      if (unsoldLots.length === 0) {
        return [];
      }

      // Filter lots by bucket
      const currentDate = new Date();
      const lotsInBucket = [];

      for (const lot of unsoldLots) {
        const age = StockAgeCalculator.calculateLotAge(lot.purchaseDate, currentDate);
        const bucket = StockAgeCalculator.categorizeLotIntoBucket(age);

        if (bucket === bucketName) {
          lotsInBucket.push({
            transactionId: lot.transactionId,
            purchaseDate: lot.purchaseDate,
            quantity: lot.quantity,
            price: lot.price,
            ageInDays: age
          });
        }
      }

      return lotsInBucket;
    } catch (error) {
      console.error('Failed to get lots in bucket:', error);
      throw error;
    }
  }

  /**
   * Get formatted lot details for display
   * @param {number} userId - The user ID
   * @param {string} stockSymbol - The stock symbol
   * @param {string} bucketName - The age bucket name
   * @param {number} currentPrice - Current stock price (optional)
   * @returns {Promise<Array>} Array of formatted lot details
   */
  static async getFormattedLotsInBucket(userId, stockSymbol, bucketName, currentPrice = null) {
    try {
      const lots = await this.getLotsInBucket(userId, stockSymbol, bucketName);

      return lots.map(lot => ({
        transactionId: lot.transactionId,
        purchaseDate: this.formatDate(lot.purchaseDate),
        quantity: lot.quantity,
        price: this.formatCurrency(lot.price),
        priceRaw: lot.price,
        ageInDays: lot.ageInDays,
        ageFormatted: this.formatAge(lot.ageInDays),
        currentValue: currentPrice ? this.formatCurrency(lot.quantity * currentPrice) : null,
        currentValueRaw: currentPrice ? lot.quantity * currentPrice : null
      }));
    } catch (error) {
      console.error('Failed to get formatted lots:', error);
      throw error;
    }
  }

  /**
   * Format date as DD-MMM-YYYY
   * @param {string|Date} date - The date to format
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    try {
      return format(new Date(date), 'dd-MMM-yyyy');
    } catch (error) {
      console.error('Failed to format date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Format currency using Indian Rupee formatting
   * @param {number} amount - The amount to format
   * @returns {string} Formatted currency
   */
  static formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error('Failed to format currency:', error);
      return `₹${amount.toFixed(2)}`;
    }
  }

  /**
   * Format age in human-readable format
   * @param {number} ageInDays - Age in days
   * @returns {string} Formatted age (e.g., "1 year 3 months")
   */
  static formatAge(ageInDays) {
    try {
      if (ageInDays === 0) {
        return 'Today';
      }

      if (ageInDays < 30) {
        return `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`;
      }

      if (ageInDays < 365) {
        const months = Math.floor(ageInDays / 30);
        const days = ageInDays % 30;
        if (days === 0) {
          return `${months} month${months !== 1 ? 's' : ''}`;
        }
        return `${months} month${months !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
      }

      const years = Math.floor(ageInDays / 365);
      const remainingDays = ageInDays % 365;
      const months = Math.floor(remainingDays / 30);

      if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
      }

      return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Failed to format age:', error);
      return `${ageInDays} days`;
    }
  }
}

module.exports = LotDetailService;
