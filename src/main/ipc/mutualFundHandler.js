// IPC handlers for mutual fund management
const { ipcMain } = require('electron');
const mutualFundService = require('../services/mutualFundService');
const csvImportValidator = require('../services/csvImportValidator');
const consolidatedHoldingsService = require('../services/consolidatedHoldingsService');
const authenticationService = require('../auth/authenticationService');

// Create CSV validator instance
const csvValidator = new csvImportValidator();

/**
 * Register all mutual fund IPC handlers
 */
function registerMutualFundHandlers() {
  // Add mutual fund
  ipcMain.handle('mutual-fund:add', async (event, sessionToken, mutualFund, allocations) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const mutualFundId = await mutualFundService.addMutualFund(mutualFund, allocations);
      return { success: true, mutualFundId };
    } catch (error) {
      console.error('Failed to add mutual fund:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all mutual funds
  ipcMain.handle('mutual-fund:get-all', async (event, sessionToken) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const mutualFunds = await mutualFundService.getAllMutualFunds();
      return { success: true, mutualFunds };
    } catch (error) {
      console.error('Failed to get mutual funds:', error);
      return { success: false, error: error.message };
    }
  });

  // Get mutual fund by ID
  ipcMain.handle('mutual-fund:get', async (event, sessionToken, id) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const mutualFund = await mutualFundService.getMutualFundById(id);
      if (!mutualFund) {
        return { success: false, error: 'Mutual fund not found' };
      }
      return { success: true, mutualFund };
    } catch (error) {
      console.error('Failed to get mutual fund:', error);
      return { success: false, error: error.message };
    }
  });

  // Update mutual fund
  ipcMain.handle('mutual-fund:update', async (event, sessionToken, id, updates) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      await mutualFundService.updateMutualFund(id, updates);
      return { success: true };
    } catch (error) {
      console.error('Failed to update mutual fund:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete mutual fund
  ipcMain.handle('mutual-fund:delete', async (event, sessionToken, id) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      await mutualFundService.deleteMutualFund(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete mutual fund:', error);
      return { success: false, error: error.message };
    }
  });

  // Import and validate CSV
  ipcMain.handle('mutual-fund:import-csv', async (event, sessionToken, filePath) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const result = await csvValidator.validateCSV(filePath);
      return { success: result.success, ...result };
    } catch (error) {
      console.error('Failed to import CSV:', error);
      return { success: false, error: error.message };
    }
  });

  // Get consolidated holdings
  ipcMain.handle('mutual-fund:get-consolidated-holdings', async (event, sessionToken) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const result = await consolidatedHoldingsService.getConsolidatedHoldings(validation.userId);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to get consolidated holdings:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Mutual fund IPC handlers registered successfully');
}

module.exports = { registerMutualFundHandlers };
