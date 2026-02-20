// Stock Age Calculator Service
// Calculates the age of stock lots and categorizes them into age buckets for histogram visualization

const databaseQueries = require('../database/queries');

// Age bucket definitions (in days)
const AGE_BUCKETS = {
  '0-6 months': { min: 0, max: 182, label: '0-6 months' },
  '6-12 months': { min: 183, max: 365, label: '6-12 months' },
  '1-2 years': { min: 366, max: 730, label: '1-2 years' },
  '2-5 years': { min: 731, max: 1825, label: '2-5 years' },
  '5+ years': { min: 1826, max: Infinity, label: '5+ years' }
};

const BUCKET_ORDER = ['0-6 months', '6-12 months', '1-2 years', '2-5 years', '5+ years'];

class StockAgeCalculator {
  /**
   * Calculate the age of a lot in days
   * @param {string|Date} purchaseDate - The purchase date of the lot
   * @param {string|Date} currentDate - The current date (defaults to today)
   * @returns {number} Age in days
   */
  static calculateLotAge(purchaseDate, currentDate = new Date()) {
    try {
      const purchase = new Date(purchaseDate);
      const current = new Date(currentDate);

      if (isNaN(purchase.getTime()) || isNaN(current.getTime())) {
        throw new Error('Invalid date provided');
      }

      const diffTime = current - purchase;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays); // Ensure non-negative
    } catch (error) {
      console.error('Failed to calculate lot age:', error);
      throw error;
    }
  }

  /**
   * Categorize a lot into an age bucket based on its age in days
   * @param {number} ageInDays - The age of the lot in days
   * @returns {string} The bucket name
   */
  static categorizeLotIntoBucket(ageInDays) {
    try {
      if (ageInDays < 0) {
        throw new Error('Age cannot be negative');
      }

      for (const bucketName of BUCKET_ORDER) {
        const bucket = AGE_BUCKETS[bucketName];
        if (ageInDays >= bucket.min && ageInDays <= bucket.max) {
          return bucketName;
        }
      }

      // Fallback to 5+ years if somehow not matched
      return '5+ years';
    } catch (error) {
      console.error('Failed to categorize lot into bucket:', error);
      throw error;
    }
  }

  /**
   * Get unsold lots for a specific stock
   * Queries buy transactions and subtracts matched quantities from realized_gains
   * @param {number} userId - The user ID
   * @param {string} stockSymbol - The stock symbol
   * @returns {Promise<Array>} Array of unsold lots with purchase_date, quantity, price
   */
  static async getUnsoldLotsForStock(userId, stockSymbol) {
    try {
      const db = require('../database/index');

      // Get stock ID
      const stock = await databaseQueries.getStockBySymbol(stockSymbol);
      if (!stock) {
        throw new Error(`Stock not found: ${stockSymbol}`);
      }

      // Get all buy transactions for this stock
      const buyTransactions = await db.getAll(
        `SELECT id, transaction_date, quantity, price
         FROM transactions
         WHERE user_id = ? AND stock_id = ? AND transaction_type = 'BUY'
         ORDER BY transaction_date ASC, created_at ASC`,
        [userId, stock.id]
      );

      if (!buyTransactions || buyTransactions.length === 0) {
        return [];
      }

      // Get matched quantities from realized_gains
      const matchedQuantities = await db.getAll(
        `SELECT buy_transaction_id, SUM(quantity) as matched_quantity
         FROM realized_gains
         WHERE user_id = ? AND symbol = ?
         GROUP BY buy_transaction_id`,
        [userId, stockSymbol]
      );

      // Create a map of matched quantities
      const matchedMap = {};
      matchedQuantities.forEach(row => {
        matchedMap[row.buy_transaction_id] = row.matched_quantity;
      });

      // Calculate unsold lots
      const unsoldLots = [];
      for (const txn of buyTransactions) {
        const matchedQty = matchedMap[txn.id] || 0;
        const unsoldQty = txn.quantity - matchedQty;

        if (unsoldQty > 0) {
          unsoldLots.push({
            transactionId: txn.id,
            purchaseDate: txn.transaction_date,
            quantity: unsoldQty,
            price: txn.price
          });
        }
      }

      return unsoldLots;
    } catch (error) {
      console.error('Failed to get unsold lots:', error);
      throw error;
    }
  }

  /**
   * Calculate age distribution for a specific stock
   * @param {number} userId - The user ID
   * @param {string} stockSymbol - The stock symbol
   * @returns {Promise<Object>} Distribution object with buckets, quantities, percentages
   */
  static async calculateStockAgeDistribution(userId, stockSymbol) {
    try {
      // Get unsold lots
      const unsoldLots = await this.getUnsoldLotsForStock(userId, stockSymbol);

      if (unsoldLots.length === 0) {
        return {
          stockSymbol,
          buckets: BUCKET_ORDER.map(name => ({
            name,
            quantity: 0,
            percentage: 0
          })),
          totalQuantity: 0
        };
      }

      // Initialize bucket data
      const bucketData = {};
      BUCKET_ORDER.forEach(name => {
        bucketData[name] = 0;
      });

      let totalQuantity = 0;

      // Categorize each lot into buckets
      const currentDate = new Date();
      for (const lot of unsoldLots) {
        const age = this.calculateLotAge(lot.purchaseDate, currentDate);
        const bucket = this.categorizeLotIntoBucket(age);
        bucketData[bucket] += lot.quantity;
        totalQuantity += lot.quantity;
      }

      // Calculate percentages
      const buckets = BUCKET_ORDER.map(name => ({
        name,
        quantity: bucketData[name],
        percentage: totalQuantity > 0 ? (bucketData[name] / totalQuantity) * 100 : 0
      }));

      return {
        stockSymbol,
        buckets,
        totalQuantity
      };
    } catch (error) {
      console.error('Failed to calculate stock age distribution:', error);
      throw error;
    }
  }

  /**
   * Calculate age distribution for entire portfolio
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} Aggregated distribution across all stocks
   */
  static async calculatePortfolioAgeDistribution(userId) {
    try {
      // Get all stocks with current holdings
      const holdings = await databaseQueries.getPortfolioHoldings(userId);

      if (!holdings || holdings.length === 0) {
        return {
          buckets: BUCKET_ORDER.map(name => ({
            name,
            quantity: 0,
            percentage: 0
          })),
          totalQuantity: 0,
          totalStocks: 0
        };
      }

      // Initialize aggregated bucket data
      const aggregatedBuckets = {};
      BUCKET_ORDER.forEach(name => {
        aggregatedBuckets[name] = 0;
      });

      let totalQuantity = 0;
      let stocksWithHoldings = 0;

      // Aggregate across all stocks
      for (const holding of holdings) {
        try {
          const distribution = await this.calculateStockAgeDistribution(userId, holding.symbol);
          
          if (distribution.totalQuantity > 0) {
            stocksWithHoldings++;
            distribution.buckets.forEach(bucket => {
              aggregatedBuckets[bucket.name] += bucket.quantity;
              totalQuantity += bucket.quantity;
            });
          }
        } catch (error) {
          console.warn(`Failed to calculate distribution for ${holding.symbol}:`, error);
          // Continue with other stocks
        }
      }

      // Calculate percentages
      const buckets = BUCKET_ORDER.map(name => ({
        name,
        quantity: aggregatedBuckets[name],
        percentage: totalQuantity > 0 ? (aggregatedBuckets[name] / totalQuantity) * 100 : 0
      }));

      return {
        buckets,
        totalQuantity,
        totalStocks: stocksWithHoldings
      };
    } catch (error) {
      console.error('Failed to calculate portfolio age distribution:', error);
      throw error;
    }
  }
}

module.exports = StockAgeCalculator;
