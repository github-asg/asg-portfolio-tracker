// Migration to add BSE Scrip Master fields to stocks table

/**
 * Add BSE-related columns to stocks table
 * @param {DatabaseManager} db - Database manager instance
 * @param {StockLookupService} stockLookupService - Stock lookup service instance (optional)
 */
async function addBseFields(db, stockLookupService = null) {
  try {
    console.log('Starting BSE fields migration...');

    // Check if the stocks table exists
    const tableInfo = db.getAll("PRAGMA table_info(stocks)");
    
    if (tableInfo.length === 0) {
      console.log('stocks table does not exist, skipping BSE fields migration');
      return;
    }

    // Check which columns already exist
    const existingColumns = tableInfo.map(col => col.name);
    const columnsToAdd = [
      { name: 'bse_short_name', type: 'TEXT' },
      { name: 'scrip_name', type: 'TEXT' },
      { name: 'isin_code', type: 'TEXT' },
      { name: 'week_52_high', type: 'REAL' },
      { name: 'week_52_low', type: 'REAL' }
    ];

    // Add missing columns (idempotent)
    let columnsAdded = 0;
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        try {
          db.executeQuery(`ALTER TABLE stocks ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✓ Added column ${column.name} to stocks table`);
          columnsAdded++;
        } catch (error) {
          console.error(`Failed to add column ${column.name}:`, error.message);
          throw error;
        }
      } else {
        console.log(`Column ${column.name} already exists, skipping`);
      }
    }

    // Create indexes on bse_short_name and isin_code (idempotent)
    try {
      db.executeQuery('CREATE INDEX IF NOT EXISTS idx_stocks_bse_short_name ON stocks(bse_short_name)');
      console.log('✓ Created index on bse_short_name');
    } catch (error) {
      console.error('Failed to create index on bse_short_name:', error.message);
      throw error;
    }

    try {
      db.executeQuery('CREATE INDEX IF NOT EXISTS idx_stocks_isin_code ON stocks(isin_code)');
      console.log('✓ Created index on isin_code');
    } catch (error) {
      console.error('Failed to create index on isin_code:', error.message);
      throw error;
    }

    // Populate existing stock records with BSE data
    if (columnsAdded > 0 && stockLookupService) {
      await populateBseData(db, stockLookupService);
    } else if (columnsAdded > 0) {
      console.log('Stock lookup service not provided, skipping BSE data population');
    } else {
      console.log('No new columns added, skipping BSE data population');
    }

    console.log('✓ BSE fields migration completed successfully');
  } catch (error) {
    console.error('BSE fields migration failed:', error);
    throw error;
  }
}

/**
 * Populate existing stock records with BSE data from Stock Lookup Service
 * @param {DatabaseManager} db - Database manager instance
 * @param {StockLookupService} stockLookupService - Stock lookup service instance
 */
async function populateBseData(db, stockLookupService) {
  try {
    console.log('Populating existing stocks with BSE data...');

    // Check if stock lookup service is available and ready
    if (!stockLookupService || !stockLookupService.isReady()) {
      console.warn('Stock lookup service not ready, skipping BSE data population');
      return;
    }

    // Get all existing stocks
    const stocks = db.getAll('SELECT id, symbol FROM stocks');
    
    if (stocks.length === 0) {
      console.log('No existing stocks to populate');
      return;
    }

    let populatedCount = 0;
    let notFoundCount = 0;

    for (const stock of stocks) {
      try {
        // Try to lookup by symbol (could be ScripCode or ShortName)
        let bseData = stockLookupService.lookupByScripCode(stock.symbol);
        
        if (!bseData) {
          bseData = stockLookupService.lookupByShortName(stock.symbol);
        }

        if (bseData) {
          // Update stock record with BSE data
          db.executeQuery(`
            UPDATE stocks 
            SET bse_short_name = ?,
                scrip_name = ?,
                isin_code = ?,
                week_52_high = ?,
                week_52_low = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            bseData.ShortName || null,
            bseData.ScripName || null,
            bseData.ISINCode || null,
            bseData['52WeeksHigh'] || null,
            bseData['52WeeksLow'] || null,
            stock.id
          ]);

          populatedCount++;
        } else {
          notFoundCount++;
          console.warn(`BSE data not found for stock: ${stock.symbol}`);
        }
      } catch (error) {
        console.error(`Failed to populate BSE data for stock ${stock.symbol}:`, error.message);
        // Continue with other stocks
      }
    }

    console.log(`✓ Populated BSE data for ${populatedCount} stocks`);
    if (notFoundCount > 0) {
      console.log(`⚠ ${notFoundCount} stocks not found in BSE Scrip Master`);
    }
  } catch (error) {
    console.error('Failed to populate BSE data:', error);
    // Don't throw - this is not critical for migration success
  }
}

module.exports = { addBseFields };
