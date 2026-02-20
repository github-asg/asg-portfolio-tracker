// IPC handlers for transaction editing feature
const { ipcMain } = require('electron');
const TransactionService = require('../services/transactionService');
const databaseManager = require('../database/index');
const authenticationService = require('../auth/authenticationService');

// Initialize transaction service
const transactionService = new TransactionService(databaseManager);

/**
 * Register all transaction editing IPC handlers
 */
function registerTransactionEditingHandlers() {
  // Get transaction with edit history
  ipcMain.handle('transaction:get', async (event, sessionToken, transactionId) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const transaction = await transactionService.getTransaction(transactionId);
      return { success: true, transaction };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return { success: false, error: error.message };
    }
  });

  // Validate transaction edit
  ipcMain.handle('transaction:validate-edit', async (event, sessionToken, transactionId, editedTransaction) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const validationResult = await transactionService.validateEdit(transactionId, editedTransaction);
      return { success: true, validation: validationResult };
    } catch (error) {
      console.error('Failed to validate edit:', error);
      return { success: false, error: error.message };
    }
  });

  // Calculate impact of edit
  ipcMain.handle('transaction:calculate-impact', async (event, sessionToken, transactionId, editedTransaction) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const impact = await transactionService.calculateImpact(transactionId, editedTransaction);
      return { success: true, impact };
    } catch (error) {
      console.error('Failed to calculate impact:', error);
      return { success: false, error: error.message };
    }
  });

  // Commit transaction edit
  ipcMain.handle('transaction:commit-edit', async (event, sessionToken, transactionId, editedTransaction) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const result = await transactionService.commitEdit(transactionId, editedTransaction);
      return { success: true, result };
    } catch (error) {
      console.error('Failed to commit edit:', error);
      return { success: false, error: error.message };
    }
  });

  // Get audit history for transaction
  ipcMain.handle('transaction:get-audit-history', async (event, sessionToken, transactionId) => {
    try {
      const validation = authenticationService.validateSession(sessionToken);
      if (!validation.valid) {
        throw new Error('Invalid session');
      }

      const history = await transactionService.auditLogger.getEditHistory(transactionId);
      return { success: true, history };
    } catch (error) {
      console.error('Failed to get audit history:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Transaction editing IPC handlers registered successfully');
}

module.exports = { registerTransactionEditingHandlers };
