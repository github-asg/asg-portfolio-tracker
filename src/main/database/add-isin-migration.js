// Migration to add ISIN column to stocks table

async function addISINColumn(databaseManager) {
  try {
    console.log('Running migration: Add ISIN column to stocks table');
    
    // Check if column already exists
    const tableInfo = databaseManager.db.prepare("PRAGMA table_info(stocks)").all();
    const hasISIN = tableInfo.some(col => col.name === 'isin');
    
    if (hasISIN) {
      console.log('✓ ISIN column already exists');
      return;
    }
    
    // Add ISIN column
    databaseManager.db.exec('ALTER TABLE stocks ADD COLUMN isin TEXT');
    console.log('✓ ISIN column added successfully');
    
  } catch (error) {
    console.error('ISIN migration failed:', error);
    // Don't throw - this is not critical for basic functionality
  }
}

module.exports = { addISINColumn };
