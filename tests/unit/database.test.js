// Enhanced Database Manager Tests
/**
 * @jest-environment node
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock electron app for testing
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(os.tmpdir(), 'portfolio-test');
    }
    return os.tmpdir();
  }
};

// Mock electron module
jest.mock('electron', () => ({
  app: mockApp
}));

const databaseManager = require('../../src/main/database/index');

describe('Enhanced Database Manager', () => {
  const testDbPath = path.join(os.tmpdir(), 'portfolio-test', 'portfolio.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Initialize database
    await databaseManager.initialize();
  });

  afterAll(async () => {
    // Clean up
    await databaseManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should initialize database with connection pool', async () => {
    expect(databaseManager.isInitialized).toBe(true);
    expect(databaseManager.getConnectionPool()).toBeDefined();
    
    const stats = databaseManager.getStats();
    expect(stats.connectionPool).toBeDefined();
    expect(stats.transactions).toBeDefined();
  });

  test('should execute queries using connection pool', async () => {
    const result = await databaseManager.executeQuery('SELECT COUNT(*) as count FROM users');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test('should handle transactions with ACID compliance', async () => {
    const result = await databaseManager.withTransaction(async (tx) => {
      // Insert a test user
      const userId = await tx.insert(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
        ['testuser', 'hashedpassword', new Date().toISOString()]
      );
      
      // Verify the user was inserted
      const user = tx.query('SELECT * FROM users WHERE id = ?', [userId]);
      expect(user).toBeDefined();
      expect(user.length).toBe(1);
      expect(user[0].username).toBe('testuser');
      
      return userId;
    });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
    
    // Verify the transaction was committed
    const user = databaseManager.getOne('SELECT * FROM users WHERE id = ?', [result]);
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
  });

  test('should rollback failed transactions', async () => {
    const initialCount = databaseManager.getOne('SELECT COUNT(*) as count FROM users').count;
    
    try {
      await databaseManager.withTransaction(async (tx) => {
        // Insert a user
        await tx.insert(
          'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
          ['failuser', 'hashedpassword', new Date().toISOString()]
        );
        
        // Cause an error to trigger rollback
        throw new Error('Intentional error for testing');
      });
    } catch (error) {
      expect(error.message).toBe('Intentional error for testing');
    }
    
    // Verify the transaction was rolled back
    const finalCount = databaseManager.getOne('SELECT COUNT(*) as count FROM users').count;
    expect(finalCount).toBe(initialCount);
  });

  test('should provide comprehensive statistics', async () => {
    const stats = databaseManager.getStats();
    
    expect(stats.dbPath).toBe(testDbPath);
    expect(stats.fileSize).toBeGreaterThan(0);
    expect(stats.tables).toBeDefined();
    expect(stats.connectionPool).toBeDefined();
    expect(stats.transactions).toBeDefined();
    expect(stats.walInfo).toBeDefined();
    
    // Check connection pool stats
    expect(stats.connectionPool.total).toBeGreaterThanOrEqual(0);
    expect(stats.connectionPool.maxConnections).toBe(5);
    
    // Check transaction stats
    expect(stats.transactions.total).toBeGreaterThanOrEqual(0);
    expect(stats.transactions.active).toBeGreaterThanOrEqual(0);
  });

  test('should perform health check', async () => {
    const health = await databaseManager.healthCheck();
    
    expect(health.healthy).toBe(true);
    expect(health.checks).toBeDefined();
    expect(health.checks.connectivity).toBe(true);
    expect(health.checks.integrity).toBe(true);
    expect(health.checks.connectionPool).toBe(true);
    expect(health.checks.walMode).toBe(true);
    expect(health.checks.foreignKeys).toBe(true);
  });

  test('should handle concurrent operations', async () => {
    const promises = [];
    
    // Create multiple concurrent operations
    for (let i = 0; i < 10; i++) {
      promises.push(
        databaseManager.executeQuery('SELECT COUNT(*) as count FROM users')
      );
    }
    
    const results = await Promise.all(promises);
    
    // All operations should succeed
    expect(results.length).toBe(10);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test('should backup and restore database', async () => {
    const backupPath = path.join(os.tmpdir(), 'portfolio-backup.db');
    
    // Create backup
    await databaseManager.backup(backupPath);
    expect(fs.existsSync(backupPath)).toBe(true);
    
    // Verify backup file size
    const originalSize = fs.statSync(testDbPath).size;
    const backupSize = fs.statSync(backupPath).size;
    expect(backupSize).toBe(originalSize);
    
    // Clean up backup file
    fs.unlinkSync(backupPath);
  });
});