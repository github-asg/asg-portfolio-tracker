// IPC client utilities for transaction editing in renderer process

/**
 * Transaction editing API client
 */
const transactionEditingAPI = {
  /**
   * Get transaction with edit history
   * @param {string} sessionToken - Session token
   * @param {number} transactionId - Transaction ID
   * @returns {Promise<Object>} Transaction data
   */
  async getTransaction(sessionToken, transactionId) {
    if (!window.electronAPI || !window.electronAPI.getTransaction) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.getTransaction(sessionToken, transactionId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get transaction');
    }

    return result.transaction;
  },

  /**
   * Validate transaction edit
   * @param {string} sessionToken - Session token
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Promise<Object>} Validation result
   */
  async validateEdit(sessionToken, transactionId, editedTransaction) {
    if (!window.electronAPI || !window.electronAPI.validateTransactionEdit) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.validateTransactionEdit(
      sessionToken,
      transactionId,
      editedTransaction
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to validate edit');
    }

    return result.validation;
  },

  /**
   * Calculate impact of edit
   * @param {string} sessionToken - Session token
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Promise<Object>} Impact analysis
   */
  async calculateImpact(sessionToken, transactionId, editedTransaction) {
    if (!window.electronAPI || !window.electronAPI.calculateTransactionImpact) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.calculateTransactionImpact(
      sessionToken,
      transactionId,
      editedTransaction
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to calculate impact');
    }

    return result.impact;
  },

  /**
   * Commit transaction edit
   * @param {string} sessionToken - Session token
   * @param {number} transactionId - Transaction ID
   * @param {Object} editedTransaction - Edited transaction data
   * @returns {Promise<Object>} Commit result
   */
  async commitEdit(sessionToken, transactionId, editedTransaction) {
    if (!window.electronAPI || !window.electronAPI.editTransaction) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.editTransaction(
      sessionToken,
      transactionId,
      editedTransaction
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to commit edit');
    }

    return result.result;
  },

  /**
   * Get audit history for transaction
   * @param {string} sessionToken - Session token
   * @param {number} transactionId - Transaction ID
   * @returns {Promise<Array>} Audit history
   */
  async getAuditHistory(sessionToken, transactionId) {
    if (!window.electronAPI || !window.electronAPI.getTransactionHistory) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.getTransactionHistory(
      sessionToken,
      transactionId
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get audit history');
    }

    return result.history;
  }
};

export default transactionEditingAPI;
