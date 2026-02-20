// AuditLogger service for tracking transaction modifications
// Part of transaction editing feature

class AuditLogger {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Log a transaction edit with field-level changes
   * @param {number} transactionId - ID of the edited transaction
   * @param {Object} originalValues - Original transaction values
   * @param {Object} newValues - New transaction values
   * @param {Date} timestamp - Modification timestamp
   */
  async logEdit(transactionId, originalValues, newValues, timestamp = new Date()) {
    try {
      const changes = this.detectChanges(originalValues, newValues);
      
      if (changes.length === 0) {
        console.log('No changes detected, skipping audit log');
        return;
      }

      // Insert audit entries for each changed field
      const insertPromises = changes.map(change => {
        return this.db.insert(
          `INSERT INTO transaction_audit 
           (transaction_id, modified_at, field_name, old_value, new_value) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            transactionId,
            timestamp.toISOString(),
            change.field,
            JSON.stringify(change.oldValue),
            JSON.stringify(change.newValue)
          ]
        );
      });

      await Promise.all(insertPromises);
      
      console.log(`Logged ${changes.length} field changes for transaction ${transactionId}`);
      return changes.length;
    } catch (error) {
      console.error('Failed to log transaction edit:', error);
      throw error;
    }
  }

  /**
   * Detect changes between original and new values
   * @param {Object} original - Original values
   * @param {Object} newValues - New values
   * @returns {Array} Array of change objects
   */
  detectChanges(original, newValues) {
    const changes = [];
    const fieldsToTrack = [
      'transaction_date',
      'stock_id',
      'transaction_type',
      'quantity',
      'price',
      'charges',
      'notes'
    ];

    for (const field of fieldsToTrack) {
      const oldValue = original[field];
      const newValue = newValues[field];

      // Compare values (handle dates, numbers, strings)
      if (!this.valuesEqual(oldValue, newValue)) {
        changes.push({
          field,
          oldValue,
          newValue
        });
      }
    }

    return changes;
  }

  /**
   * Compare two values for equality
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if values are equal
   */
  valuesEqual(a, b) {
    // Handle null/undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date || b instanceof Date) {
      return new Date(a).getTime() === new Date(b).getTime();
    }

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 0.0001; // Handle floating point precision
    }

    // Handle strings and other types
    return String(a) === String(b);
  }

  /**
   * Retrieve edit history for a transaction
   * @param {number} transactionId - Transaction ID
   * @returns {Array} Array of audit entries in chronological order
   */
  async getEditHistory(transactionId) {
    try {
      const history = this.db.getAll(
        `SELECT id, transaction_id, modified_at, field_name, old_value, new_value
         FROM transaction_audit
         WHERE transaction_id = ?
         ORDER BY modified_at ASC, id ASC`,
        [transactionId]
      );

      // Parse JSON values
      return history.map(entry => ({
        ...entry,
        old_value: this.parseValue(entry.old_value),
        new_value: this.parseValue(entry.new_value),
        modified_at: new Date(entry.modified_at)
      }));
    } catch (error) {
      console.error('Failed to retrieve edit history:', error);
      throw error;
    }
  }

  /**
   * Parse JSON value safely
   * @param {string} value - JSON string
   * @returns {*} Parsed value
   */
  parseValue(value) {
    if (value == null) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      return value; // Return as-is if not valid JSON
    }
  }

  /**
   * Get summary of edits for a transaction
   * @param {number} transactionId - Transaction ID
   * @returns {Object} Edit summary
   */
  async getEditSummary(transactionId) {
    try {
      const history = await this.getEditHistory(transactionId);
      
      if (history.length === 0) {
        return {
          hasBeenEdited: false,
          editCount: 0,
          lastModified: null,
          fieldsChanged: []
        };
      }

      // Group by modification timestamp to count distinct edits
      const editTimestamps = new Set(
        history.map(entry => entry.modified_at.toISOString())
      );

      // Get unique fields that have been changed
      const fieldsChanged = [...new Set(history.map(entry => entry.field_name))];

      return {
        hasBeenEdited: true,
        editCount: editTimestamps.size,
        lastModified: history[history.length - 1].modified_at,
        fieldsChanged,
        totalChanges: history.length
      };
    } catch (error) {
      console.error('Failed to get edit summary:', error);
      throw error;
    }
  }

  /**
   * Delete audit history for a transaction (when transaction is deleted)
   * @param {number} transactionId - Transaction ID
   */
  async deleteHistory(transactionId) {
    try {
      const deleted = await this.db.delete(
        'DELETE FROM transaction_audit WHERE transaction_id = ?',
        [transactionId]
      );
      
      console.log(`Deleted ${deleted} audit entries for transaction ${transactionId}`);
      return deleted;
    } catch (error) {
      console.error('Failed to delete audit history:', error);
      throw error;
    }
  }
}

module.exports = AuditLogger;
