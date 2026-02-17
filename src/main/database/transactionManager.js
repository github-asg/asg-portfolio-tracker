// Transaction Manager for ACID compliance
const databaseManager = require('./index');

class TransactionManager {
  constructor() {
    this.activeTransactions = new Map();
    this.transactionCounter = 0;
  }

  /**
   * Begin a new transaction
   * Returns a transaction ID for tracking
   */
  beginTransaction() {
    if (!databaseManager.isInitialized) {
      throw new Error('Database not initialized');
    }

    const transactionId = ++this.transactionCounter;
    const db = databaseManager.getConnection();
    
    try {
      // Start immediate transaction for better isolation
      db.exec('BEGIN IMMEDIATE TRANSACTION');
      
      this.activeTransactions.set(transactionId, {
        id: transactionId,
        startTime: Date.now(),
        operations: [],
        status: 'active'
      });
      
      console.log(`Transaction ${transactionId} started`);
      return transactionId;
    } catch (error) {
      console.error(`Failed to start transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a query within a transaction
   */
  executeInTransaction(transactionId, sql, params = []) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction || transaction.status !== 'active') {
      throw new Error(`Invalid or inactive transaction: ${transactionId}`);
    }

    try {
      const db = databaseManager.getConnection();
      const stmt = db.prepare(sql);
      
      let result;
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = stmt.all(params);
      } else {
        result = stmt.run(params);
      }
      
      // Track the operation
      transaction.operations.push({
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params.length,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error(`Transaction ${transactionId} operation failed:`, error);
      // Mark transaction for rollback
      transaction.status = 'error';
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status === 'error') {
      // Auto-rollback on error
      return this.rollbackTransaction(transactionId);
    }

    try {
      const db = databaseManager.getConnection();
      db.exec('COMMIT');
      
      transaction.status = 'committed';
      transaction.endTime = Date.now();
      
      console.log(`Transaction ${transactionId} committed (${transaction.operations.length} operations)`);
      
      // Clean up after a delay to allow for debugging
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to commit transaction ${transactionId}:`, error);
      // Attempt rollback
      this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      const db = databaseManager.getConnection();
      db.exec('ROLLBACK');
      
      transaction.status = 'rolled_back';
      transaction.endTime = Date.now();
      
      console.log(`Transaction ${transactionId} rolled back`);
      
      // Clean up
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to rollback transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  executeTransaction(operations) {
    const transactionId = this.beginTransaction();
    
    try {
      const results = [];
      
      for (const operation of operations) {
        const result = this.executeInTransaction(
          transactionId, 
          operation.sql, 
          operation.params || []
        );
        results.push(result);
      }
      
      this.commitTransaction(transactionId);
      return results;
    } catch (error) {
      this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Execute a function within a transaction context
   */
  withTransaction(callback) {
    const transactionId = this.beginTransaction();
    
    try {
      const transactionContext = {
        execute: (sql, params) => this.executeInTransaction(transactionId, sql, params),
        query: (sql, params) => this.executeInTransaction(transactionId, sql, params),
        insert: (sql, params) => {
          const result = this.executeInTransaction(transactionId, sql, params);
          return result.lastInsertRowid;
        },
        update: (sql, params) => {
          const result = this.executeInTransaction(transactionId, sql, params);
          return result.changes;
        },
        delete: (sql, params) => {
          const result = this.executeInTransaction(transactionId, sql, params);
          return result.changes;
        }
      };
      
      const result = callback(transactionContext);
      this.commitTransaction(transactionId);
      return result;
    } catch (error) {
      this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    return transaction ? { ...transaction } : null;
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values())
      .filter(t => t.status === 'active');
  }

  /**
   * Clean up old transactions (safety mechanism)
   */
  cleanupOldTransactions(maxAgeMs = 300000) { // 5 minutes default
    const now = Date.now();
    const toCleanup = [];
    
    for (const [id, transaction] of this.activeTransactions) {
      if (transaction.status === 'active' && (now - transaction.startTime) > maxAgeMs) {
        toCleanup.push(id);
      }
    }
    
    for (const id of toCleanup) {
      console.warn(`Cleaning up stale transaction ${id}`);
      try {
        this.rollbackTransaction(id);
      } catch (error) {
        console.error(`Failed to cleanup transaction ${id}:`, error);
      }
    }
    
    return toCleanup.length;
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    const transactions = Array.from(this.activeTransactions.values());
    
    return {
      total: transactions.length,
      active: transactions.filter(t => t.status === 'active').length,
      committed: transactions.filter(t => t.status === 'committed').length,
      rolledBack: transactions.filter(t => t.status === 'rolled_back').length,
      errors: transactions.filter(t => t.status === 'error').length,
      oldestActive: transactions
        .filter(t => t.status === 'active')
        .reduce((oldest, t) => 
          !oldest || t.startTime < oldest.startTime ? t : oldest, null
        )
    };
  }
}

// Export singleton instance
const transactionManager = new TransactionManager();

// Cleanup old transactions every 5 minutes
setInterval(() => {
  transactionManager.cleanupOldTransactions();
}, 300000);

module.exports = transactionManager;