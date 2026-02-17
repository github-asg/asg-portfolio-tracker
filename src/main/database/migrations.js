// Database migration system for Stock Portfolio Manager
const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize migrations table
   */
  initializeMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.executeQuery(sql);
  }

  /**
   * Get list of executed migrations
   */
  getExecutedMigrations() {
    try {
      return this.db.getAll('SELECT version FROM migrations ORDER BY version');
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Get list of pending migrations
   */
  getPendingMigrations() {
    const executedMigrations = this.getExecutedMigrations().map(m => m.version);
    const allMigrations = this.getAllMigrationFiles();
    
    return allMigrations.filter(migration => 
      !executedMigrations.includes(migration.version)
    );
  }

  /**
   * Get all migration files from migrations directory
   */
  getAllMigrationFiles() {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }
    
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.map(file => {
      const version = file.replace('.sql', '');
      return {
        version,
        filename: file,
        path: path.join(this.migrationsPath, file)
      };
    });
  }

  /**
   * Execute a single migration
   */
  executeMigration(migration) {
    try {
      const sql = fs.readFileSync(migration.path, 'utf8');
      
      // Execute migration in transaction
      const transaction = this.db.getConnection().transaction(() => {
        this.db.getConnection().exec(sql);
        
        // Record migration as executed
        this.db.insert(
          'INSERT INTO migrations (version, filename) VALUES (?, ?)',
          [migration.version, migration.filename]
        );
      });
      
      transaction();
      
      console.log(`Migration executed: ${migration.filename}`);
      return true;
    } catch (error) {
      console.error(`Migration failed: ${migration.filename}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  runPendingMigrations() {
    this.initializeMigrationsTable();
    
    const pendingMigrations = this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return true;
    }
    
    console.log(`Running ${pendingMigrations.length} pending migrations...`);
    
    for (const migration of pendingMigrations) {
      this.executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
    return true;
  }

  /**
   * Create a new migration file
   */
  createMigration(name) {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(this.migrationsPath, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- ALTER TABLE stocks ADD COLUMN new_field TEXT;

-- Remember to test your migration before deploying!
`;
    
    fs.writeFileSync(filepath, template);
    console.log(`Migration created: ${filename}`);
    
    return filepath;
  }

  /**
   * Get migration status
   */
  getStatus() {
    const executed = this.getExecutedMigrations();
    const pending = this.getPendingMigrations();
    
    return {
      executed: executed.length,
      pending: pending.length,
      executedMigrations: executed,
      pendingMigrations: pending
    };
  }
}

module.exports = MigrationManager;