// Mutual Fund Service for managing mutual fund records and allocations
const databaseManager = require('../database/index');

class MutualFundService {
  /**
   * Add a new mutual fund with stock allocations
   * @param {Object} mutualFund - { schemeName, currentValue, investmentDate }
   * @param {Array} allocations - [{ stockSymbol, stockName, allocationPercent }]
   * @returns {Promise<number>} - Mutual fund ID
   */
  async addMutualFund(mutualFund, allocations) {
    // Validate inputs
    if (!mutualFund.schemeName || !mutualFund.currentValue || !mutualFund.investmentDate) {
      throw new Error('Missing required mutual fund fields');
    }

    if (mutualFund.currentValue <= 0) {
      throw new Error('Current value must be greater than zero');
    }

    const investmentDate = new Date(mutualFund.investmentDate);
    const now = new Date();
    if (investmentDate > now) {
      throw new Error('Investment date cannot be in the future');
    }

    if (!allocations || allocations.length === 0) {
      throw new Error('At least one stock allocation is required');
    }

    try {
      const mutualFundId = await databaseManager.withTransaction(async (tx) => {
        // Insert mutual fund record
        const mfId = tx.insert(
          `INSERT INTO mutual_funds (scheme_name, current_value, investment_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            mutualFund.schemeName,
            mutualFund.currentValue,
            mutualFund.investmentDate,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );

        // Insert allocation records
        for (const allocation of allocations) {
          tx.insert(
            `INSERT INTO mutual_fund_allocations (mutual_fund_id, stock_symbol, stock_name, allocation_percent, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              mfId,
              allocation.stockSymbol,
              allocation.stockName,
              allocation.allocationPercent,
              new Date().toISOString()
            ]
          );
        }

        return mfId;
      });

      console.log(`Mutual fund added successfully: ID ${mutualFundId}`);
      return mutualFundId;
    } catch (error) {
      console.error('Failed to add mutual fund:', error);
      throw error;
    }
  }

  /**
   * Get all mutual funds with their allocations
   * @returns {Promise<Array>} - Array of mutual fund objects
   */
  async getAllMutualFunds() {
    try {
      // Get all mutual funds sorted by investment date
      const mutualFunds = databaseManager.getAll(
        `SELECT id, scheme_name, current_value, investment_date, created_at, updated_at
         FROM mutual_funds
         ORDER BY investment_date ASC`
      );

      // Get allocations for each mutual fund
      for (const mf of mutualFunds) {
        const allocations = databaseManager.getAll(
          `SELECT stock_symbol, stock_name, allocation_percent
           FROM mutual_fund_allocations
           WHERE mutual_fund_id = ?
           ORDER BY allocation_percent DESC`,
          [mf.id]
        );

        mf.allocations = allocations;
      }

      return mutualFunds;
    } catch (error) {
      console.error('Failed to get mutual funds:', error);
      throw error;
    }
  }

  /**
   * Get single mutual fund by ID
   * @param {number} id - Mutual fund ID
   * @returns {Promise<Object>} - Mutual fund object with allocations
   */
  async getMutualFundById(id) {
    try {
      const mutualFund = databaseManager.getOne(
        `SELECT id, scheme_name, current_value, investment_date, created_at, updated_at
         FROM mutual_funds
         WHERE id = ?`,
        [id]
      );

      if (!mutualFund) {
        return null;
      }

      // Get allocations
      const allocations = databaseManager.getAll(
        `SELECT stock_symbol, stock_name, allocation_percent
         FROM mutual_fund_allocations
         WHERE mutual_fund_id = ?
         ORDER BY allocation_percent DESC`,
        [id]
      );

      mutualFund.allocations = allocations;

      return mutualFund;
    } catch (error) {
      console.error(`Failed to get mutual fund ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update mutual fund details
   * @param {number} id - Mutual fund ID
   * @param {Object} updates - { schemeName?, currentValue?, investmentDate? }
   * @returns {Promise<void>}
   */
  async updateMutualFund(id, updates) {
    // Validate updates
    if (updates.currentValue !== undefined && updates.currentValue <= 0) {
      throw new Error('Current value must be greater than zero');
    }

    if (updates.investmentDate) {
      const investmentDate = new Date(updates.investmentDate);
      const now = new Date();
      if (investmentDate > now) {
        throw new Error('Investment date cannot be in the future');
      }
    }

    try {
      const updateFields = [];
      const updateValues = [];

      if (updates.schemeName !== undefined) {
        updateFields.push('scheme_name = ?');
        updateValues.push(updates.schemeName);
      }

      if (updates.currentValue !== undefined) {
        updateFields.push('current_value = ?');
        updateValues.push(updates.currentValue);
      }

      if (updates.investmentDate !== undefined) {
        updateFields.push('investment_date = ?');
        updateValues.push(updates.investmentDate);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());

      updateValues.push(id);

      const changes = await databaseManager.update(
        `UPDATE mutual_funds SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      if (changes === 0) {
        throw new Error(`Mutual fund with ID ${id} not found`);
      }

      console.log(`Mutual fund ${id} updated successfully`);
    } catch (error) {
      console.error(`Failed to update mutual fund ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete mutual fund and cascade delete allocations
   * @param {number} id - Mutual fund ID
   * @returns {Promise<void>}
   */
  async deleteMutualFund(id) {
    try {
      const changes = await databaseManager.delete(
        'DELETE FROM mutual_funds WHERE id = ?',
        [id]
      );

      if (changes === 0) {
        throw new Error(`Mutual fund with ID ${id} not found`);
      }

      console.log(`Mutual fund ${id} deleted successfully (cascade deleted allocations)`);
    } catch (error) {
      console.error(`Failed to delete mutual fund ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new MutualFundService();
