// Database initialization and management for Stock Portfolio Manager
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const ConnectionPool = require('./connectionPool');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.connectionPool = null;
    this.activeTransactions = new Map();
    this.transactionCounter = 0;
  }

  /**
   * Initialize the database connection and create schema if needed
   */
  async initialize() {
    try {
      // Determine database path in user's app data directory
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'portfolio.db');
      
      // Ensure the directory exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }

      // Create main database connection
      this.db = new Database(this.dbPath);
      
      // Configure main connection
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = memory');
      
      // Create schema if database is new
      await this.createSchema();
      
      // Initialize connection pool for concurrent operations
      this.connectionPool = new ConnectionPool(this.dbPath, {
        maxConnections: 5,
        idleTimeout: 30000,
        acquireTimeout: 10000
      });
      
      await this.connectionPool.initialize();
      
      // Mark as initialized BEFORE running migrations
      this.isInitialized = true;
      
      // Run migrations after database is fully initialized
      await this.runMigrations();
      
      // Set up cleanup intervals
      this.setupCleanupIntervals();
      
      console.log(`Database initialized at: ${this.dbPath}`);
      
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up periodic cleanup tasks
   */
  setupCleanupIntervals() {
    // Clean up idle connections every 5 minutes
    setInterval(() => {
      if (this.connectionPool) {
        const cleaned = this.connectionPool.cleanupIdleConnections();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} idle database connections`);
        }
      }
    }, 300000);

    // Clean up old transactions every 5 minutes
    setInterval(() => {
      this.cleanupOldTransactions();
    }, 300000);

    // WAL checkpoint every 10 minutes
    setInterval(() => {
      try {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (error) {
        console.error('WAL checkpoint failed:', error);
      }
    }, 600000);
  }

  /**
   * Create database schema from SQL file
   */
  async createSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema in a transaction
      const transaction = this.db.transaction(() => {
        this.db.exec(schema);
      });
      
      transaction();
      
      console.log('Database schema created successfully');
      
      // Create demo user if it doesn't exist
      await this.createDemoUserIfNeeded();
    } catch (error) {
      console.error('Schema creation failed:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    console.log('=== Running Database Migrations ===');
    try {
      // Run ISIN migration
      const { addISINColumn } = require('./add-isin-migration');
      await addISINColumn(this);
      
      // Run API settings migration
      const { migrateApiSettings } = require('./api-settings-migration');
      await migrateApiSettings(this);
      
      // Run price cache migration
      const { migratePriceCacheTable } = require('./price-cache-migration');
      await migratePriceCacheTable(this);
      
      // Run transaction audit migration
      console.log('Loading transaction audit migration...');
      const transactionAuditModule = require('./migrations/add-transaction-audit');
      console.log('Module loaded:', transactionAuditModule);
      console.log('addTransactionAudit function:', typeof transactionAuditModule.addTransactionAudit);
      const { addTransactionAudit } = transactionAuditModule;
      if (typeof addTransactionAudit !== 'function') {
        throw new Error('addTransactionAudit is not a function');
      }
      console.log('Running transaction audit migration...');
      await addTransactionAudit(this);
      console.log('Transaction audit migration completed');
      
      // Run mutual funds tables migration (disabled for v1.0.0)
      // TODO: Uncomment when mutual fund feature is ready
      // const { addMutualFundsTables } = require('./migrations/add-mutual-funds');
      // await addMutualFundsTables(this);
    } catch (error) {
      console.error('Migration failed:', error);
      console.error('Stack trace:', error.stack);
      // Don't throw - migrations are not critical for basic functionality
    }
    console.log('=== Migrations Complete ===');
  }

  /**
   * Create demo user for testing if it doesn't exist
   */
  async createDemoUserIfNeeded() {
    try {
      const bcrypt = require('bcrypt');
      
      // Check if demo user exists
      const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
      
      if (!existingUser) {
        // Create demo user with password 'demo123'
        const passwordHash = await bcrypt.hash('demo123', 10);
        this.db.prepare(
          'INSERT INTO users (username, password_hash, created_at, is_active) VALUES (?, ?, ?, ?)'
        ).run('demo', passwordHash, new Date().toISOString(), 1);
        
        console.log('Demo user created successfully');
      }
    } catch (error) {
      console.error('Failed to create demo user:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Execute a single query with parameters (uses connection pool for concurrency)
   */
  async executeQuery(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Use connection pool for better concurrency
      return await this.connectionPool.executeQuery(sql, params);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction (ACID compliant)
   */
  async executeTransaction(queries) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      return await this.connectionPool.executeTransaction(queries);
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Begin a new transaction and return transaction context
   */
  async beginTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    const transactionId = ++this.transactionCounter;
    const connectionInfo = await this.connectionPool.acquireConnection();
    
    try {
      // Start immediate transaction for better isolation
      connectionInfo.connection.exec('BEGIN IMMEDIATE TRANSACTION');
      connectionInfo.transactionActive = true;
      
      const transactionContext = {
        id: transactionId,
        connectionInfo,
        startTime: Date.now(),
        operations: [],
        status: 'active'
      };
      
      this.activeTransactions.set(transactionId, transactionContext);
      
      console.log(`Transaction ${transactionId} started`);
      return transactionContext;
    } catch (error) {
      this.connectionPool.releaseConnection(connectionInfo);
      console.error(`Failed to start transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a query within a transaction context
   */
  executeInTransaction(transactionContext, sql, params = []) {
    if (!transactionContext || transactionContext.status !== 'active') {
      throw new Error('Invalid or inactive transaction context');
    }

    try {
      const stmt = transactionContext.connectionInfo.connection.prepare(sql);
      
      let result;
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = stmt.all(params);
      } else {
        result = stmt.run(params);
      }
      
      // Track the operation
      transactionContext.operations.push({
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params.length,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error(`Transaction ${transactionContext.id} operation failed:`, error);
      transactionContext.status = 'error';
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionContext) {
    if (!transactionContext) {
      throw new Error('Transaction context not provided');
    }

    if (transactionContext.status === 'error') {
      return await this.rollbackTransaction(transactionContext);
    }

    try {
      transactionContext.connectionInfo.connection.exec('COMMIT');
      transactionContext.status = 'committed';
      transactionContext.endTime = Date.now();
      
      console.log(`Transaction ${transactionContext.id} committed (${transactionContext.operations.length} operations)`);
      
      // Release connection back to pool
      this.connectionPool.releaseConnection(transactionContext.connectionInfo);
      
      // Clean up after a delay
      setTimeout(() => {
        this.activeTransactions.delete(transactionContext.id);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to commit transaction ${transactionContext.id}:`, error);
      await this.rollbackTransaction(transactionContext);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionContext) {
    if (!transactionContext) {
      throw new Error('Transaction context not provided');
    }

    try {
      transactionContext.connectionInfo.connection.exec('ROLLBACK');
      transactionContext.status = 'rolled_back';
      transactionContext.endTime = Date.now();
      
      console.log(`Transaction ${transactionContext.id} rolled back`);
      
      // Release connection back to pool
      this.connectionPool.releaseConnection(transactionContext.connectionInfo);
      
      // Clean up
      setTimeout(() => {
        this.activeTransactions.delete(transactionContext.id);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to rollback transaction ${transactionContext.id}:`, error);
      // Still release the connection
      this.connectionPool.releaseConnection(transactionContext.connectionInfo);
      throw error;
    }
  }

  /**
   * Execute a function within a transaction context
   */
  async withTransaction(callback) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const transactionContext = await this.beginTransaction();
    
    try {
      const transactionAPI = {
        execute: (sql, params) => this.executeInTransaction(transactionContext, sql, params),
        query: (sql, params) => this.executeInTransaction(transactionContext, sql, params),
        insert: (sql, params) => {
          const result = this.executeInTransaction(transactionContext, sql, params);
          return result.lastInsertRowid;
        },
        update: (sql, params) => {
          const result = this.executeInTransaction(transactionContext, sql, params);
          return result.changes;
        },
        delete: (sql, params) => {
          const result = this.executeInTransaction(transactionContext, sql, params);
          return result.changes;
        }
      };
      
      const result = await callback(transactionAPI);
      await this.commitTransaction(transactionContext);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transactionContext);
      throw error;
    }
  }

  /**
   * Get a single record (optimized for read operations)
   */
  getOne(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Get one query failed:', error);
      throw error;
    }
  }

  /**
   * Get multiple records (optimized for read operations)
   */
  getAll(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Get all query failed:', error);
      throw error;
    }
  }

  /**
   * Insert a record and return the inserted ID (uses connection pool)
   */
  async insert(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const result = await this.connectionPool.executeQuery(sql, params);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Insert query failed:', error);
      throw error;
    }
  }

  /**
   * Update records and return number of changes (uses connection pool)
   */
  async update(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const result = await this.connectionPool.executeQuery(sql, params);
      return result.changes;
    } catch (error) {
      console.error('Update query failed:', error);
      throw error;
    }
  }

  /**
   * Delete records and return number of changes (uses connection pool)
   */
  async delete(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const result = await this.connectionPool.executeQuery(sql, params);
      return result.changes;
    } catch (error) {
      console.error('Delete query failed:', error);
      throw error;
    }
  }

  /**
   * Backup database to specified file path with validation
   */
  async backup(backupPath, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Perform integrity check before backup
      if (options.validateBeforeBackup !== false) {
        const isIntact = this.checkIntegrity();
        if (!isIntact) {
          throw new Error('Database integrity check failed - backup aborted');
        }
      }
      
      // Perform WAL checkpoint before backup to ensure all data is in main file
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      
      // Get database stats for backup metadata
      const stats = this.getStats();
      
      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);
      
      // Verify backup file was created and has correct size
      const backupStats = fs.statSync(backupPath);
      if (backupStats.size !== stats.fileSize) {
        throw new Error('Backup file size mismatch - backup may be corrupted');
      }
      
      // Create backup metadata file
      if (options.createMetadata !== false) {
        const metadataPath = backupPath + '.meta';
        const metadata = {
          backupDate: new Date().toISOString(),
          originalPath: this.dbPath,
          originalSize: stats.fileSize,
          backupSize: backupStats.size,
          tableRecords: stats.tables,
          totalRecords: stats.totalRecords,
          version: '1.0.0'
        };
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }
      
      console.log(`Database backed up to: ${backupPath}`);
      console.log(`Backup size: ${backupStats.size} bytes (${stats.totalRecords} records)`);
      
      return {
        success: true,
        backupPath,
        size: backupStats.size,
        records: stats.totalRecords,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup file with validation
   */
  async restore(backupPath, options = {}) {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file does not exist');
    }
    
    try {
      // Check if metadata file exists and validate
      const metadataPath = backupPath + '.meta';
      let metadata = null;
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
          
          // Validate backup file size against metadata
          const backupStats = fs.statSync(backupPath);
          if (metadata.backupSize && backupStats.size !== metadata.backupSize) {
            throw new Error('Backup file size does not match metadata - file may be corrupted');
          }
          
          console.log(`Restoring backup from ${metadata.backupDate}`);
          console.log(`Original records: ${metadata.totalRecords}`);
        } catch (error) {
          console.warn('Could not read backup metadata:', error.message);
        }
      }
      
      // Create backup of current database before restore (if requested)
      if (options.backupCurrent !== false && this.isInitialized) {
        const currentBackupPath = this.dbPath + '.pre-restore.' + Date.now() + '.bak';
        try {
          await this.backup(currentBackupPath, { createMetadata: false });
          console.log(`Current database backed up to: ${currentBackupPath}`);
        } catch (error) {
          console.warn('Could not backup current database:', error.message);
        }
      }
      
      // Close current connections
      await this.close();
      
      // Validate backup file before restore
      if (options.validateBackup !== false) {
        try {
          const testDb = new Database(backupPath, { readonly: true });
          const integrityResult = testDb.pragma('integrity_check');
          testDb.close();
          
          if (integrityResult[0].integrity_check !== 'ok') {
            throw new Error('Backup file integrity check failed');
          }
        } catch (error) {
          throw new Error(`Backup file validation failed: ${error.message}`);
        }
      }
      
      // Copy backup file to database location
      fs.copyFileSync(backupPath, this.dbPath);
      
      // Reinitialize database
      await this.initialize();
      
      // Verify restored database
      const restoredStats = this.getStats();
      
      console.log(`Database restored from: ${backupPath}`);
      console.log(`Restored records: ${restoredStats.totalRecords}`);
      
      // Compare with metadata if available
      if (metadata && metadata.totalRecords !== restoredStats.totalRecords) {
        console.warn(`Record count mismatch: expected ${metadata.totalRecords}, got ${restoredStats.totalRecords}`);
      }
      
      return {
        success: true,
        backupPath,
        restoredRecords: restoredStats.totalRecords,
        timestamp: new Date().toISOString(),
        metadata
      };
    } catch (error) {
      console.error('Database restore failed:', error);
      
      // Try to reinitialize database even if restore failed
      try {
        await this.initialize();
      } catch (initError) {
        console.error('Failed to reinitialize database after restore failure:', initError);
      }
      
      throw error;
    }
  }

  /**
   * List available backups in a directory
   */
  listBackups(backupDirectory) {
    if (!fs.existsSync(backupDirectory)) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(backupDirectory);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.db') && !file.endsWith('.meta')) {
          const backupPath = path.join(backupDirectory, file);
          const metadataPath = backupPath + '.meta';
          
          const backup = {
            filename: file,
            path: backupPath,
            size: fs.statSync(backupPath).size,
            created: fs.statSync(backupPath).mtime,
            hasMetadata: fs.existsSync(metadataPath)
          };
          
          // Read metadata if available
          if (backup.hasMetadata) {
            try {
              const metadataContent = fs.readFileSync(metadataPath, 'utf8');
              backup.metadata = JSON.parse(metadataContent);
            } catch (error) {
              backup.metadataError = error.message;
            }
          }
          
          backups.push(backup);
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created - a.created);
      
      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Validate a backup file without restoring it
   */
  async validateBackup(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file does not exist');
    }
    
    const validation = {
      valid: false,
      errors: [],
      warnings: [],
      metadata: null,
      stats: null
    };
    
    try {
      // Check file size
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        validation.errors.push('Backup file is empty');
        return validation;
      }
      
      // Check metadata
      const metadataPath = backupPath + '.meta';
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          validation.metadata = JSON.parse(metadataContent);
          
          // Validate file size against metadata
          if (validation.metadata.backupSize && stats.size !== validation.metadata.backupSize) {
            validation.errors.push('File size does not match metadata');
          }
        } catch (error) {
          validation.warnings.push(`Could not read metadata: ${error.message}`);
        }
      } else {
        validation.warnings.push('No metadata file found');
      }
      
      // Test database integrity
      try {
        const testDb = new Database(backupPath, { readonly: true });
        
        // Check integrity
        const integrityResult = testDb.pragma('integrity_check');
        if (integrityResult[0].integrity_check !== 'ok') {
          validation.errors.push('Database integrity check failed');
        }
        
        // Get basic stats
        const tables = ['users', 'stocks', 'transactions', 'realized_gains', 'price_cache', 'api_settings', 'app_settings'];
        const tableStats = {};
        let totalRecords = 0;
        
        for (const table of tables) {
          try {
            const result = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            tableStats[table] = result.count;
            totalRecords += result.count;
          } catch (error) {
            validation.warnings.push(`Could not count records in table ${table}: ${error.message}`);
          }
        }
        
        validation.stats = {
          fileSize: stats.size,
          tables: tableStats,
          totalRecords,
          created: stats.mtime
        };
        
        testDb.close();
        
        // Compare with metadata if available
        if (validation.metadata && validation.metadata.totalRecords !== totalRecords) {
          validation.warnings.push(`Record count mismatch: metadata shows ${validation.metadata.totalRecords}, file contains ${totalRecords}`);
        }
        
      } catch (error) {
        validation.errors.push(`Database validation failed: ${error.message}`);
      }
      
      validation.valid = validation.errors.length === 0;
      
    } catch (error) {
      validation.errors.push(`Validation failed: ${error.message}`);
    }
    
    return validation;
  }

  /**
   * Create an automatic backup with timestamp
   */
  async createAutoBackup(backupDirectory) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(backupDirectory)) {
        fs.mkdirSync(backupDirectory, { recursive: true });
      }
      
      // Generate timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `portfolio-backup-${timestamp}.db`;
      const backupPath = path.join(backupDirectory, backupFilename);
      
      // Create backup
      const result = await this.backup(backupPath);
      
      console.log(`Auto backup created: ${backupFilename}`);
      return {
        ...result,
        filename: backupFilename
      };
    } catch (error) {
      console.error('Auto backup failed:', error);
      throw error;
    }
  }
  cleanupOldTransactions(maxAgeMs = 300000) { // 5 minutes default
    const now = Date.now();
    const toCleanup = [];
    
    for (const [id, transactionContext] of this.activeTransactions) {
      if (transactionContext.status === 'active' && (now - transactionContext.startTime) > maxAgeMs) {
        toCleanup.push(transactionContext);
      }
    }
    
    for (const transactionContext of toCleanup) {
      console.warn(`Cleaning up stale transaction ${transactionContext.id}`);
      try {
        this.rollbackTransaction(transactionContext);
      } catch (error) {
        console.error(`Failed to cleanup transaction ${transactionContext.id}:`, error);
      }
    }
    
    return toCleanup.length;
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats() {
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
  /**
   * Get comprehensive database statistics
   */
  getStats() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const stats = {
        dbPath: this.dbPath,
        fileSize: fs.statSync(this.dbPath).size,
        tables: {},
        totalRecords: 0,
        connectionPool: this.connectionPool ? this.connectionPool.getStats() : null,
        transactions: this.getTransactionStats(),
        walInfo: {}
      };
      
      // Get record counts for each table
      const tables = ['users', 'stocks', 'transactions', 'realized_gains', 'price_cache', 'api_settings', 'app_settings'];
      
      for (const table of tables) {
        const result = this.getOne(`SELECT COUNT(*) as count FROM ${table}`);
        stats.tables[table] = result.count;
        stats.totalRecords += result.count;
      }
      
      // Get WAL information
      try {
        const walInfo = this.getOne('PRAGMA wal_checkpoint');
        stats.walInfo = {
          busy: walInfo[0],
          log: walInfo[1],
          checkpointed: walInfo[2]
        };
      } catch (error) {
        stats.walInfo = { error: 'Could not retrieve WAL info' };
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive database health check
   */
  async healthCheck() {
    if (!this.isInitialized) {
      return { healthy: false, error: 'Database not initialized' };
    }
    
    const health = {
      healthy: true,
      checks: {},
      timestamp: new Date().toISOString()
    };
    
    try {
      // Basic connectivity
      health.checks.connectivity = this.getOne('SELECT 1 as test').test === 1;
      
      // Integrity check
      health.checks.integrity = this.checkIntegrity();
      
      // Connection pool health
      if (this.connectionPool) {
        health.checks.connectionPool = await this.connectionPool.healthCheck();
      }
      
      // WAL mode check
      const journalMode = this.getOne('PRAGMA journal_mode');
      health.checks.walMode = journalMode.journal_mode === 'wal';
      
      // Foreign keys enabled
      const foreignKeys = this.getOne('PRAGMA foreign_keys');
      health.checks.foreignKeys = foreignKeys.foreign_keys === 1;
      
      // Check for any failed checks
      health.healthy = Object.values(health.checks).every(check => check === true);
      
    } catch (error) {
      health.healthy = false;
      health.error = error.message;
    }
    
    return health;
  }

  /**
   * Check database integrity
   */
  checkIntegrity() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const result = this.getOne('PRAGMA integrity_check');
      return result.integrity_check === 'ok';
    } catch (error) {
      console.error('Integrity check failed:', error);
      return false;
    }
  }

  /**
   * Optimize database performance
   */
  async optimize() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      console.log('Starting database optimization...');
      
      // Analyze tables for better query planning
      this.db.exec('ANALYZE');
      
      // Vacuum to reclaim space (only if needed)
      const pageCount = this.getOne('PRAGMA page_count').page_count;
      const freePages = this.getOne('PRAGMA freelist_count').freelist_count;
      
      if (freePages > pageCount * 0.1) { // If more than 10% free pages
        console.log('Running VACUUM to reclaim space...');
        this.db.exec('VACUUM');
      }
      
      // WAL checkpoint
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      
      console.log('Database optimization completed');
      return true;
    } catch (error) {
      console.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Run BSE fields migration with stock lookup service
   * This should be called after the stock lookup service is initialized
   * @param {StockLookupService} stockLookupService - Stock lookup service instance
   */
  async runBseMigration(stockLookupService) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const { addBseFields } = require('./migrations/add-bse-fields');
      await addBseFields(this, stockLookupService);
      return true;
    } catch (error) {
      console.error('BSE migration failed:', error);
      throw error;
    }
  }

  /**
   * Close database connections gracefully
   */
  async close() {
    try {
      // Rollback any active transactions
      for (const transactionContext of this.activeTransactions.values()) {
        if (transactionContext.status === 'active') {
          console.warn(`Rolling back active transaction ${transactionContext.id} during shutdown`);
          await this.rollbackTransaction(transactionContext);
        }
      }
      this.activeTransactions.clear();
      
      if (this.connectionPool) {
        await this.connectionPool.shutdown();
        this.connectionPool = null;
      }
      
      if (this.db) {
        // Final WAL checkpoint
        this.db.pragma('wal_checkpoint(TRUNCATE)');
        this.db.close();
        this.db = null;
      }
      
      this.isInitialized = false;
      console.log('Database connections closed gracefully');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  /**
   * Get database connection (for advanced operations)
   */
  getConnection() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Get connection pool (for advanced operations)
   */
  getConnectionPool() {
    return this.connectionPool;
  }
}

// Export singleton instance
const databaseManager = new DatabaseManager();
module.exports = databaseManager;
