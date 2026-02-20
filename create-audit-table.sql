-- Create transaction_audit table
CREATE TABLE IF NOT EXISTS transaction_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id 
ON transaction_audit(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_modified_at 
ON transaction_audit(modified_at);

-- Add modified_at column to transactions table if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so this might fail if column exists
-- ALTER TABLE transactions ADD COLUMN modified_at DATETIME;
