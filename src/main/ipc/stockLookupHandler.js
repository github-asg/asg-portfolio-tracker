/**
 * Stock Lookup IPC Handlers
 * Provides IPC communication between renderer and main process for stock lookup operations
 */

const { ipcMain } = require('electron');

/**
 * Register all stock lookup IPC handlers
 * @param {StockLookupService} stockLookupService - The stock lookup service instance
 */
function registerStockLookupHandlers(stockLookupService) {
  if (!stockLookupService) {
    console.error('Stock Lookup Service not provided to IPC handlers');
    return;
  }

  /**
   * Handler: stock:lookup-by-code
   * Lookup stock by ScripCode
   */
  ipcMain.handle('stock:lookup-by-code', async (event, scripCode) => {
    try {
      // Validate input
      if (!scripCode || typeof scripCode !== 'string') {
        return {
          success: false,
          error: 'Invalid scrip code provided',
          data: null
        };
      }

      // Check if service is ready
      if (!stockLookupService.isReady()) {
        return {
          success: false,
          error: 'Stock lookup service not initialized',
          data: null
        };
      }

      // Perform lookup
      const result = stockLookupService.lookupByScripCode(scripCode);

      return {
        success: result !== null,
        error: result === null ? 'Stock not found' : null,
        data: result
      };
    } catch (error) {
      console.error('Error in stock:lookup-by-code handler:', error);
      return {
        success: false,
        error: error.message || 'Failed to lookup stock by code',
        data: null
      };
    }
  });

  /**
   * Handler: stock:lookup-by-shortname
   * Lookup stock by ShortName
   */
  ipcMain.handle('stock:lookup-by-shortname', async (event, shortName) => {
    try {
      // Validate input
      if (!shortName || typeof shortName !== 'string') {
        return {
          success: false,
          error: 'Invalid short name provided',
          data: null
        };
      }

      // Check if service is ready
      if (!stockLookupService.isReady()) {
        return {
          success: false,
          error: 'Stock lookup service not initialized',
          data: null
        };
      }

      // Perform lookup
      const result = stockLookupService.lookupByShortName(shortName);

      return {
        success: result !== null,
        error: result === null ? 'Stock not found' : null,
        data: result
      };
    } catch (error) {
      console.error('Error in stock:lookup-by-shortname handler:', error);
      return {
        success: false,
        error: error.message || 'Failed to lookup stock by short name',
        data: null
      };
    }
  });

  /**
   * Handler: stock:search-by-name
   * Search stocks by company name (partial match)
   */
  ipcMain.handle('stock:search-by-name', async (event, searchTerm, maxResults) => {
    try {
      // Validate input
      if (!searchTerm || typeof searchTerm !== 'string') {
        return {
          success: false,
          error: 'Invalid search term provided',
          data: []
        };
      }

      // Validate maxResults if provided
      if (maxResults !== undefined && (typeof maxResults !== 'number' || maxResults < 1)) {
        return {
          success: false,
          error: 'Invalid maxResults parameter',
          data: []
        };
      }

      // Check if service is ready
      if (!stockLookupService.isReady()) {
        return {
          success: false,
          error: 'Stock lookup service not initialized',
          data: []
        };
      }

      // Perform search
      const results = stockLookupService.searchByCompanyName(searchTerm, maxResults);

      return {
        success: true,
        error: null,
        data: results
      };
    } catch (error) {
      console.error('Error in stock:search-by-name handler:', error);
      return {
        success: false,
        error: error.message || 'Failed to search stocks by name',
        data: []
      };
    }
  });

  /**
   * Handler: stock:get-unmapped
   * Get list of unmapped stock codes
   */
  ipcMain.handle('stock:get-unmapped', async (event) => {
    try {
      // Check if service is ready
      if (!stockLookupService.isReady()) {
        return {
          success: false,
          error: 'Stock lookup service not initialized',
          data: []
        };
      }

      // Get unmapped codes
      const unmappedCodes = stockLookupService.getUnmappedCodes();

      return {
        success: true,
        error: null,
        data: unmappedCodes
      };
    } catch (error) {
      console.error('Error in stock:get-unmapped handler:', error);
      return {
        success: false,
        error: error.message || 'Failed to get unmapped codes',
        data: []
      };
    }
  });

  console.log('Stock lookup IPC handlers registered successfully');
}

module.exports = {
  registerStockLookupHandlers
};
