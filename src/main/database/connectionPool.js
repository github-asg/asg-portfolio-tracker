// Connection Pool Manager for better performance and concurrency
const Database = require('better-sqlite3');
const path = require('path');
const { EventEmitter } = require('events');

class ConnectionPool extends EventEmitter {
  constructor(dbPath, options = {}) {
    super();
    
    this.dbPath = dbPath;
    this.options = {
      maxConnections: options.maxConnections || 5,
      idleTimeout: options.idleTimeout || 30000, // 30 seconds
      acquireTimeout: options.acquireTimeout || 10000, // 10 seconds
      ...options
    };
    
    this.connections = new Map();
    this.availableConnections = [];
    this.waitingQueue = [];
    this.connectionCounter = 0;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the connection pool
   */
  async initialize() {
    try {
      // Create initial connection to verify database
      const testConnectionInfo = this.createConnection();
      testConnectionInfo.connection.close();
      this.connections.delete(testConnectionInfo.id);
      
      console.log(`Connection pool initialized for: ${this.dbPath}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize connection pool:', error);
      throw error;
    }
  }

  /**
   * Create a new database connection
   */
  createConnection() {
    const connection = new Database(this.dbPath);
    
    // Configure connection
    connection.pragma('foreign_keys = ON');
    connection.pragma('journal_mode = WAL');
    connection.pragma('synchronous = NORMAL');
    connection.pragma('cache_size = 1000');
    connection.pragma('temp_store = memory');
    
    const connectionId = ++this.connectionCounter;
    const connectionInfo = {
      id: connectionId,
      connection,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      transactionActive: false
    };
    
    this.connections.set(connectionId, connectionInfo);
    
    console.log(`Created database connection ${connectionId}`);
    return connectionInfo;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquireConnection() {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection acquire timeout'));
      }, this.options.acquireTimeout);

      const tryAcquire = () => {
        // Check for available connection
        if (this.availableConnections.length > 0) {
          const connectionInfo = this.availableConnections.pop();
          connectionInfo.inUse = true;
          connectionInfo.lastUsed = Date.now();
          
          clearTimeout(timeout);
          resolve(connectionInfo);
          return;
        }

        // Create new connection if under limit
        if (this.connections.size < this.options.maxConnections) {
          try {
            const connectionInfo = this.createConnection();
            connectionInfo.inUse = true;
            
            clearTimeout(timeout);
            resolve(connectionInfo);
            return;
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
            return;
          }
        }

        // Add to waiting queue
        this.waitingQueue.push({ resolve, reject, timeout });
      };

      tryAcquire();
    });
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connectionInfo) {
    if (!connectionInfo || !this.connections.has(connectionInfo.id)) {
      console.warn('Attempted to release invalid connection');
      return;
    }

    connectionInfo.inUse = false;
    connectionInfo.lastUsed = Date.now();
    connectionInfo.transactionActive = false;

    // Check if there are waiting requests
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      connectionInfo.inUse = true;
      clearTimeout(waiter.timeout);
      waiter.resolve(connectionInfo);
    } else {
      // Return to available pool
      this.availableConnections.push(connectionInfo);
    }

    this.emit('connectionReleased', connectionInfo.id);
  }

  /**
   * Execute a query with automatic connection management
   */
  async executeQuery(sql, params = []) {
    const connectionInfo = await this.acquireConnection();
    
    try {
      const stmt = connectionInfo.connection.prepare(sql);
      
      let result;
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = stmt.all(params);
      } else {
        result = stmt.run(params);
      }
      
      return result;
    } finally {
      this.releaseConnection(connectionInfo);
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(queries) {
    const connectionInfo = await this.acquireConnection();
    
    try {
      connectionInfo.transactionActive = true;
      const db = connectionInfo.connection;
      
      const transaction = db.transaction(() => {
        const results = [];
        for (const query of queries) {
          const stmt = db.prepare(query.sql);
          const result = stmt.run(query.params || []);
          results.push(result);
        }
        return results;
      });
      
      return transaction();
    } finally {
      connectionInfo.transactionActive = false;
      this.releaseConnection(connectionInfo);
    }
  }

  /**
   * Execute a function with a dedicated connection
   */
  async withConnection(callback) {
    const connectionInfo = await this.acquireConnection();
    
    try {
      return await callback(connectionInfo.connection);
    } finally {
      this.releaseConnection(connectionInfo);
    }
  }

  /**
   * Clean up idle connections
   */
  cleanupIdleConnections() {
    const now = Date.now();
    const toRemove = [];
    
    for (const connectionInfo of this.availableConnections) {
      if (now - connectionInfo.lastUsed > this.options.idleTimeout) {
        toRemove.push(connectionInfo);
      }
    }
    
    for (const connectionInfo of toRemove) {
      this.removeConnection(connectionInfo);
    }
    
    return toRemove.length;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connectionInfo) {
    try {
      connectionInfo.connection.close();
      this.connections.delete(connectionInfo.id);
      
      const index = this.availableConnections.indexOf(connectionInfo);
      if (index > -1) {
        this.availableConnections.splice(index, 1);
      }
      
      console.log(`Removed database connection ${connectionInfo.id}`);
      this.emit('connectionRemoved', connectionInfo.id);
    } catch (error) {
      console.error(`Error removing connection ${connectionInfo.id}:`, error);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const connections = Array.from(this.connections.values());
    
    return {
      total: connections.length,
      available: this.availableConnections.length,
      inUse: connections.filter(c => c.inUse).length,
      waiting: this.waitingQueue.length,
      maxConnections: this.options.maxConnections,
      activeTransactions: connections.filter(c => c.transactionActive).length,
      oldestConnection: connections.reduce((oldest, c) => 
        !oldest || c.createdAt < oldest.createdAt ? c : oldest, null
      )?.createdAt
    };
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown() {
    this.isShuttingDown = true;
    
    // Reject all waiting requests
    for (const waiter of this.waitingQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Connection pool shutting down'));
    }
    this.waitingQueue.length = 0;
    
    // Close all connections
    for (const connectionInfo of this.connections.values()) {
      try {
        connectionInfo.connection.close();
      } catch (error) {
        console.error(`Error closing connection ${connectionInfo.id}:`, error);
      }
    }
    
    this.connections.clear();
    this.availableConnections.length = 0;
    
    console.log('Connection pool shutdown complete');
    this.emit('shutdown');
  }

  /**
   * Health check for the pool
   */
  async healthCheck() {
    try {
      const result = await this.executeQuery('SELECT 1 as health_check');
      return result && result[0] && result[0].health_check === 1;
    } catch (error) {
      console.error('Connection pool health check failed:', error);
      return false;
    }
  }
}

module.exports = ConnectionPool;