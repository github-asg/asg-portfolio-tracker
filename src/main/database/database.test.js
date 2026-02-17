// Database unit tests
/**
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Create mock path before mocking electron
const mockUserDataPath = path.join(os.tmpdir(), 'portfolio-test');

// Ensure test directory exists
if (!fs.existsSync(mockUserDataPath)) {
  fs.mkdirSync(mockUserDataPath, { recursive: true });
}

// Mock electron module completely before any imports
jest.mock('electron', () => {
  const mockPath = require('path');
  const mockOs = require('os');
  const testPath = mockPath.join(mockOs.tmpdir(), 'portfolio-test');
  
  return {
    app: {
      getPath: jest.fn().mockImplementation((name) => {
        return testPath;
      })
    }
  };
});

// Clear module cache to ensure fresh import with mocks
jest.resetModules();

const DatabaseManager = require('./index');
const DatabaseQueries = require('./queries');

describe('Database Manager', () => {
  let testDbPath;

  beforeAll(async () => {
    // Create test data directory
    const testDir = path.join(os.tmpdir(), 'portfolio-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testDbPath = path.join(testDir, 'portfolio.db');
    
    // Remove existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterAll(async () => {
    // Clean up test database
    try {
      await DatabaseManager.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Remove test data directory
    const testDir = path.join(os.tmpdir(), 'portfolio-test');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Database Initialization', () => {
    test('should initialize database successfully', async () => {
      const result = await DatabaseManager.initialize();
      expect(result).toBe(true);
      expect(DatabaseManager.isInitialized).toBe(true);
    });

    test('should create all required tables', () => {
      const tables = [
        'users', 'stocks', 'transactions', 'realized_gains', 
        'price_cache', 'api_settings', 'app_settings'
      ];
      
      for (const table of tables) {
        const result = DatabaseManager.getOne(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table]
        );
        expect(result).toBeTruthy();
        expect(result.name).toBe(table);
      }
    });

    test('should have default app settings', () => {
      const dbVersion = DatabaseManager.getOne(
        'SELECT value FROM app_settings WHERE key = ?',
        ['db_version']
      );
      expect(dbVersion).toBeTruthy();
      expect(dbVersion.value).toBe('1.0.0');
    });

    test('should have sample stocks', () => {
      const stocks = DatabaseManager.getAll('SELECT * FROM stocks');
      expect(stocks.length).toBeGreaterThan(0);
      
      // Check for specific sample stocks
      const reliance = stocks.find(s => s.symbol === 'RELIANCE');
      expect(reliance).toBeTruthy();
      expect(reliance.company_name).toBe('Reliance Industries Ltd');
    });
  });

  describe('Database Operations', () => {
    test('should execute queries successfully', async () => {
      const result = await DatabaseManager.executeQuery(
        'SELECT COUNT(*) as count FROM stocks'
      );
      expect(result).toBeTruthy();
      expect(result[0].count).toBeGreaterThan(0);
    });

    test('should handle transactions with ACID compliance', async () => {
      const result = await DatabaseManager.withTransaction(async (tx) => {
        // Insert a test user
        const userId = await tx.insert(
          'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
          ['txuser', 'hashedpassword', new Date().toISOString()]
        );
        
        // Verify the user was inserted within transaction
        const user = tx.query('SELECT * FROM users WHERE id = ?', [userId]);
        expect(user).toBeDefined();
        expect(user.length).toBe(1);
        expect(user[0].username).toBe('txuser');
        
        return userId;
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      
      // Verify the transaction was committed
      const user = DatabaseManager.getOne('SELECT * FROM users WHERE id = ?', [result]);
      expect(user).toBeDefined();
      expect(user.username).toBe('txuser');
    });

    test('should rollback failed transactions', async () => {
      const initialCount = DatabaseManager.getOne('SELECT COUNT(*) as count FROM users').count;
      
      try {
        await DatabaseManager.withTransaction(async (tx) => {
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
      const finalCount = DatabaseManager.getOne('SELECT COUNT(*) as count FROM users').count;
      expect(finalCount).toBe(initialCount);
    });

    test('should get database statistics with connection pool info', () => {
      const stats = DatabaseManager.getStats();
      expect(stats).toBeTruthy();
      expect(stats.dbPath).toBeTruthy();
      expect(stats.fileSize).toBeGreaterThan(0);
      expect(stats.tables).toBeTruthy();
      expect(stats.totalRecords).toBeGreaterThan(0);
      expect(stats.connectionPool).toBeTruthy();
      expect(stats.transactions).toBeTruthy();
      
      // Check connection pool stats
      expect(stats.connectionPool.maxConnections).toBe(5);
      expect(stats.connectionPool.total).toBeGreaterThanOrEqual(0);
      
      // Check transaction stats
      expect(stats.transactions.total).toBeGreaterThanOrEqual(0);
      expect(stats.transactions.active).toBeGreaterThanOrEqual(0);
    });

    test('should perform health check', async () => {
      const health = await DatabaseManager.healthCheck();
      
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
      for (let i = 0; i < 5; i++) {
        promises.push(
          DatabaseManager.executeQuery('SELECT COUNT(*) as count FROM stocks')
        );
      }
      
      const results = await Promise.all(promises);
      
      // All operations should succeed
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    test('should check database integrity', () => {
      const isIntact = DatabaseManager.checkIntegrity();
      expect(isIntact).toBe(true);
    });
  });

  describe('BSE Migration', () => {
    test('should have runBseMigration method', () => {
      expect(typeof DatabaseManager.runBseMigration).toBe('function');
    });

    test('should call migration with stock lookup service', async () => {
      // This test verifies the method exists and can be called
      // Full integration testing is done in the migration test file
      const mockStockLookupService = {
        isReady: jest.fn().mockReturnValue(false)
      };

      // Mock the require to avoid actual migration
      jest.mock('./migrations/add-bse-fields', () => ({
        addBseFields: jest.fn().mockResolvedValue(true)
      }));

      // If database is initialized, test the method
      if (DatabaseManager.isInitialized) {
        await expect(
          DatabaseManager.runBseMigration(mockStockLookupService)
        ).resolves.toBe(true);
      } else {
        // If not initialized, verify it throws the right error
        await expect(
          DatabaseManager.runBseMigration(mockStockLookupService)
        ).rejects.toThrow('Database not initialized');
      }
    });
  });
});

describe('Database Queries', () => {
  beforeAll(async () => {
    // Ensure database is initialized
    if (!DatabaseManager.isInitialized) {
      await DatabaseManager.initialize();
    }
  });

  describe('Stock Operations', () => {
    test('should get all stocks', () => {
      const stocks = DatabaseQueries.getAllStocks();
      expect(Array.isArray(stocks)).toBe(true);
      expect(stocks.length).toBeGreaterThan(0);
    });

    test('should get stock by symbol', () => {
      const stock = DatabaseQueries.getStockBySymbol('RELIANCE');
      expect(stock).toBeTruthy();
      expect(stock.symbol).toBe('RELIANCE');
      expect(stock.company_name).toBe('Reliance Industries Ltd');
    });
  });

  describe('User Operations', () => {
    let testUserId;

    test('should create user', () => {
      const userId = DatabaseQueries.createUser('testuser', 'hashedpassword123');
      expect(userId).toBeTruthy();
      testUserId = userId;
    });

    test('should get user by username', () => {
      const user = DatabaseQueries.getUserByUsername('testuser');
      expect(user).toBeTruthy();
      expect(user.username).toBe('testuser');
      expect(user.password_hash).toBe('hashedpassword123');
      expect(user.is_active).toBe(1);
    });

    test('should update user last login', () => {
      const changes = DatabaseQueries.updateUserLastLogin(testUserId);
      expect(changes).toBe(1);
      
      const user = DatabaseQueries.getUserByUsername('testuser');
      expect(user.last_login).toBeTruthy();
    });
  });

  describe('App Settings Operations', () => {
    test('should get app setting', () => {
      const dbVersion = DatabaseQueries.getAppSetting('db_version');
      expect(dbVersion).toBe('1.0.0');
    });

    test('should set app setting', () => {
      expect(() => {
        DatabaseQueries.setAppSetting('test_setting', 'test_value');
      }).not.toThrow();
      
      const value = DatabaseQueries.getAppSetting('test_setting');
      expect(value).toBe('test_value');
    });
  });
});