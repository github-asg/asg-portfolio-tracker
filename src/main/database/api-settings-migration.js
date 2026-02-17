// Migration for api_settings table to support multiple providers

async function migrateApiSettings(databaseManager) {
  try {
    console.log('Checking api_settings table structure...');
    
    // Check if the table has the old structure
    const tableInfo = databaseManager.db.prepare("PRAGMA table_info(api_settings)").all();
    const hasProviderColumn = tableInfo.some(col => col.name === 'provider');
    
    if (!hasProviderColumn) {
      console.log('Migrating api_settings table to new structure...');
      
      // Backup existing data (if any)
      let existingData = [];
      try {
        existingData = databaseManager.db.prepare(`
          SELECT user_id, api_key_encrypted, secret_key_encrypted, 
                 is_active, last_connected, created_at, updated_at 
          FROM api_settings
        `).all();
      } catch (error) {
        // Table might not exist or have different structure
        console.log('No existing api_settings data to backup');
      }
      
      // Drop the old table
      databaseManager.db.exec('DROP TABLE IF EXISTS api_settings');
      
      // Create new table with updated structure
      databaseManager.db.exec(`
        CREATE TABLE api_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          provider TEXT NOT NULL,
          encrypted_data TEXT NOT NULL,
          salt TEXT NOT NULL,
          iv TEXT NOT NULL,
          auth_tag TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          last_connected DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, provider)
        )
      `);
      
      console.log('✓ api_settings table migrated successfully');
      
      if (existingData.length > 0) {
        console.log(`Note: ${existingData.length} old API credential records were removed during migration.`);
        console.log('Please re-enter your ICICI Breeze API credentials in the Settings page.');
      }
    } else {
      console.log('✓ api_settings table is already up to date');
    }
  } catch (error) {
    console.error('Failed to migrate api_settings table:', error);
    // Don't throw - this is not critical for basic functionality
  }
}

module.exports = { migrateApiSettings };