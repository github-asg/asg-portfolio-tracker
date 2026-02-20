// Migration to add mutual_funds and mutual_fund_allocations tables

function addMutualFundsTables(databaseManager) {
  try {
    console.log('Running migration: Add mutual funds tables');
    
    const db = databaseManager.db;
    
    // Check if mutual_funds table already exists
    const mutualFundsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='mutual_funds'
    `).get();
    
    if (!mutualFundsTableExists) {
      // Create mutual_funds table
      db.exec(`
        CREATE TABLE mutual_funds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scheme_name TEXT NOT NULL,
          current_value REAL NOT NULL CHECK(current_value > 0),
          investment_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✓ mutual_funds table created');
    } else {
      console.log('✓ mutual_funds table already exists');
    }
    
    // Check if mutual_fund_allocations table already exists
    const allocationsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='mutual_fund_allocations'
    `).get();
    
    if (!allocationsTableExists) {
      // Create mutual_fund_allocations table
      db.exec(`
        CREATE TABLE mutual_fund_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mutual_fund_id INTEGER NOT NULL,
          stock_symbol TEXT NOT NULL,
          stock_name TEXT NOT NULL,
          allocation_percent REAL NOT NULL CHECK(allocation_percent >= 0 AND allocation_percent <= 100),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mutual_fund_id) REFERENCES mutual_funds(id) ON DELETE CASCADE
        );
      `);
      
      console.log('✓ mutual_fund_allocations table created');
      
      // Create indexes
      db.exec(`
        CREATE INDEX idx_mf_allocations_mf_id 
        ON mutual_fund_allocations(mutual_fund_id);
      `);
      
      db.exec(`
        CREATE INDEX idx_mf_allocations_stock 
        ON mutual_fund_allocations(stock_symbol);
      `);
      
      console.log('✓ Indexes created on mutual_fund_allocations');
    } else {
      console.log('✓ mutual_fund_allocations table already exists');
    }
    
    console.log('✓ Mutual funds tables migration completed');
    
  } catch (error) {
    console.error('Mutual funds tables migration failed:', error);
    // Don't throw - this is not critical for basic functionality
  }
}

module.exports = { addMutualFundsTables };
