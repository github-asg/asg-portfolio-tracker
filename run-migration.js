// Run transaction audit migration manually
const DatabaseManager = require('./src/main/database/index');
const { addTransactionAudit } = require('./src/main/database/migrations/add-transaction-audit');

async function runMigration() {
  try {
    console.log('Initializing database...');
    await DatabaseManager.initialize();
    
    console.log('Running transaction audit migration...');
    await addTransactionAudit(DatabaseManager);
    
    console.log('✓ Migration completed successfully');
    
    await DatabaseManager.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
