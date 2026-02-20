// Create transaction_audit table directly
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Get the database path
const userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.env.HOME, 'stock-portfolio-manager');
const dbPath = path.join(userDataPath, 'portfolio.db');

console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('Creating transaction_audit table...');
  
  // Create transaction_audit table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);
  
  console.log('✓ transaction_audit table created');
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id 
    ON transaction_audit(transaction_id);
  `);
  
  console.log('✓ Index created on transaction_audit.transaction_id');
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transaction_audit_modified_at 
    ON transaction_audit(modified_at);
  `);
  
  console.log('✓ Index created on transaction_audit.modified_at');
  
  // Check if modified_at column exists in transactions table
  const columns = db.prepare(`PRAGMA table_info(transactions)`).all();
  const hasModifiedAt = columns.some(col => col.name === 'modified_at');
  
  if (!hasModifiedAt) {
    db.exec(`ALTER TABLE transactions ADD COLUMN modified_at DATETIME;`);
    console.log('✓ modified_at column added to transactions table');
  } else {
    console.log('✓ modified_at column already exists in transactions table');
  }
  
  db.close();
  console.log('✓ Migration completed successfully!');
  
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
