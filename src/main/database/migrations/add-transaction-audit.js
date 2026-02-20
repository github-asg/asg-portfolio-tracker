// Migration to add transaction_audit table

async function addTransactionAudit(databaseManager) {
  try {
    console.log('Running migration: Add transaction_audit table');
    
    const db = databaseManager.db;
    
    // Check if table already exists
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_audit'").get();
    
    if (tableInfo) {
      console.log('✓ transaction_audit table already exists');
      return;
    }
    
    // Create transaction_audit table
    db.exec(`
      CREATE TABLE transaction_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    db.exec('CREATE INDEX idx_transaction_audit_transaction_id ON transaction_audit(transaction_id)');
    db.exec('CREATE INDEX idx_transaction_audit_modified_at ON transaction_audit(modified_at)');
    
    console.log('✓ transaction_audit table created');
    
    // Add modified_at column to transactions table
    const transColumns = db.prepare("PRAGMA table_info(transactions)").all();
    const hasModifiedAt = transColumns.some(col => col.name === 'modified_at');
    
    if (!hasModifiedAt) {
      db.exec('ALTER TABLE transactions ADD COLUMN modified_at DATETIME');
      console.log('✓ modified_at column added');
    } else {
      console.log('✓ modified_at column already exists');
    }
    
  } catch (error) {
    console.error('Transaction audit migration failed:', error);
  }
}

module.exports = { addTransactionAudit };
