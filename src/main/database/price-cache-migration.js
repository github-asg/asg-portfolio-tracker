// Migration to update price_cache table structure
const { DatabaseManager } = require('./index');

/**
 * Migrate price_cache table to new structure
 * @param {DatabaseManager} db - Database manager instance
 */
async function migratePriceCacheTable(db) {
  try {
    console.log('Starting price_cache table migration...');

    // Check if the table exists and has the old structure
    const tableInfo = db.getAll("PRAGMA table_info(price_cache)");
    
    if (tableInfo.length === 0) {
      console.log('price_cache table does not exist, will be created with new structure');
      return;
    }

    // Check if migration is needed (look for old columns)
    const hasOldStructure = tableInfo.some(col => col.name === 'stock_id' || col.name === 'ltp');
    const hasNewStructure = tableInfo.some(col => col.name === 'exchange' && col.name === 'price');

    if (!hasOldStructure && hasNewStructure) {
      console.log('price_cache table already has new structure');
      return;
    }

    if (hasOldStructure) {
      console.log('Migrating price_cache table from old structure...');
      
      // Backup existing data
      const existingData = db.getAll('SELECT * FROM price_cache');
      
      // Drop the old table
      db.run('DROP TABLE IF EXISTS price_cache');
      
      // Create new table with updated structure
      db.run(`
        CREATE TABLE price_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          exchange TEXT NOT NULL DEFAULT 'BSE',
          price DECIMAL(10,2) NOT NULL,
          bid DECIMAL(10,2),
          ask DECIMAL(10,2),
          high DECIMAL(10,2),
          low DECIMAL(10,2),
          open DECIMAL(10,2),
          close DECIMAL(10,2),
          volume INTEGER,
          change DECIMAL(10,2),
          change_percent DECIMAL(5,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migrate existing data if any
      if (existingData.length > 0) {
        console.log(`Migrating ${existingData.length} existing price records...`);
        
        for (const row of existingData) {
          try {
            db.run(`
              INSERT INTO price_cache 
              (symbol, exchange, price, change, change_percent, volume, created_at, updated_at)
              VALUES (?, 'NSE', ?, ?, ?, ?, ?, ?)
            `, [
              row.symbol,
              row.ltp || 0,
              row.change_amount || 0,
              row.change_percent || 0,
              row.volume || 0,
              row.created_at || new Date().toISOString(),
              row.timestamp || new Date().toISOString()
            ]);
          } catch (error) {
            console.warn(`Failed to migrate price record for ${row.symbol}:`, error.message);
          }
        }
      }

      // Recreate indexes
      db.run('CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(symbol)');
      db.run('CREATE INDEX IF NOT EXISTS idx_price_cache_exchange ON price_cache(exchange)');
      db.run('CREATE INDEX IF NOT EXISTS idx_price_cache_updated_at ON price_cache(updated_at)');

      console.log('✓ price_cache table migrated successfully');
    } else {
      // Table exists but doesn't have old structure, ensure it has new structure
      console.log('Ensuring price_cache table has correct structure...');
      
      // Check for missing columns and add them
      const columnNames = tableInfo.map(col => col.name);
      
      const requiredColumns = [
        { name: 'exchange', type: 'TEXT NOT NULL DEFAULT \'BSE\'', after: 'symbol' },
        { name: 'price', type: 'DECIMAL(10,2) NOT NULL DEFAULT 0', after: 'exchange' },
        { name: 'bid', type: 'DECIMAL(10,2)', after: 'price' },
        { name: 'ask', type: 'DECIMAL(10,2)', after: 'bid' },
        { name: 'high', type: 'DECIMAL(10,2)', after: 'ask' },
        { name: 'low', type: 'DECIMAL(10,2)', after: 'high' },
        { name: 'open', type: 'DECIMAL(10,2)', after: 'low' },
        { name: 'close', type: 'DECIMAL(10,2)', after: 'open' },
        { name: 'change', type: 'DECIMAL(10,2)', after: 'volume' },
        { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP', after: 'created_at' }
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          try {
            db.run(`ALTER TABLE price_cache ADD COLUMN ${col.name} ${col.type}`);
            console.log(`Added column ${col.name} to price_cache table`);
          } catch (error) {
            console.warn(`Failed to add column ${col.name}:`, error.message);
          }
        }
      }

      console.log('✓ price_cache table structure updated');
    }

  } catch (error) {
    console.error('Failed to migrate price_cache table:', error);
    throw error;
  }
}

module.exports = { migratePriceCacheTable };