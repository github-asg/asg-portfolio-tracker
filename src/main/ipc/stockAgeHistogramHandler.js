// IPC Handlers for Stock Age Histogram
// Handles communication between renderer and main process for age distribution calculations

const { ipcMain } = require('electron');
const StockAgeCalculator = require('../services/stockAgeCalculator');
const LotDetailService = require('../services/lotDetailService');
const authenticationService = require('../auth/authenticationService');

/**
 * Register all stock age histogram IPC handlers
 */
function registerStockAgeHistogramHandlers() {
  // Get stock age distribution
  ipcMain.handle('stock-age:get-stock-distribution', async (event, sessionToken, stockSymbol) => {
    try {
      console.log(`[IPC] Getting stock age distribution for ${stockSymbol}`);

      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      if (!stockSymbol) {
        throw new Error('Stock symbol is required');
      }

      const distribution = await StockAgeCalculator.calculateStockAgeDistribution(
        validation.userId,
        stockSymbol
      );

      return {
        success: true,
        data: distribution
      };
    } catch (error) {
      console.error('[IPC] Failed to get stock age distribution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get portfolio age distribution
  ipcMain.handle('stock-age:get-portfolio-distribution', async (event, sessionToken) => {
    try {
      console.log('[IPC] Getting portfolio age distribution');

      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const distribution = await StockAgeCalculator.calculatePortfolioAgeDistribution(
        validation.userId
      );

      return {
        success: true,
        data: distribution
      };
    } catch (error) {
      console.error('[IPC] Failed to get portfolio age distribution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get bucket details (lots in a specific bucket)
  ipcMain.handle('stock-age:get-bucket-details', async (event, sessionToken, stockSymbol, bucketName, currentPrice) => {
    try {
      console.log(`[IPC] Getting bucket details for ${stockSymbol} - ${bucketName}`);

      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      if (!stockSymbol) {
        throw new Error('Stock symbol is required');
      }

      if (!bucketName) {
        throw new Error('Bucket name is required');
      }

      const lots = await LotDetailService.getFormattedLotsInBucket(
        validation.userId,
        stockSymbol,
        bucketName,
        currentPrice
      );

      return {
        success: true,
        data: {
          stockSymbol,
          bucketName,
          lots
        }
      };
    } catch (error) {
      console.error('[IPC] Failed to get bucket details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[IPC] Stock age histogram handlers registered');
}

module.exports = { registerStockAgeHistogramHandlers };
