// CSV Import Validator for Mutual Fund Stock Allocations
const fs = require('fs');
const databaseManager = require('../database/index');

class CSVImportValidator {
  /**
   * Parse CSV content into structured data
   * @param {string} csvContent - Raw CSV content
   * @returns {Array} - Parsed allocation objects
   */
  parseCSVContent(csvContent) {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indexes
    const symbolIndex = header.findIndex(h => 
      h.includes('symbol') || h.includes('code') || h.includes('scrip')
    );
    const nameIndex = header.findIndex(h => 
      h.includes('name') && !h.includes('scheme')
    );
    const percentIndex = header.findIndex(h => 
      h.includes('percent') || h.includes('allocation') || h.includes('%')
    );
    
    if (symbolIndex === -1 || percentIndex === -1) {
      throw new Error('CSV must contain Stock Symbol and Allocation Percentage columns');
    }
    
    // Parse data rows
    const allocations = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',').map(v => v.trim());
      
      if (values.length < Math.max(symbolIndex, percentIndex) + 1) {
        continue; // Skip malformed rows
      }
      
      const stockSymbol = values[symbolIndex];
      const stockName = nameIndex !== -1 ? values[nameIndex] : '';
      const allocationPercent = parseFloat(values[percentIndex].replace('%', ''));
      
      if (stockSymbol && !isNaN(allocationPercent)) {
        allocations.push({
          stockSymbol: stockSymbol.toUpperCase(),
          stockName,
          allocationPercent,
          row: i + 1
        });
      }
    }
    
    return allocations;
  }

  /**
   * Validate stock symbol exists in BSE master
   * @param {string} symbol - BSE scrip code
   * @returns {Promise<boolean>}
   */
  async validateStockSymbol(symbol) {
    try {
      const stock = databaseManager.getOne(
        'SELECT scrip_cd FROM stocks WHERE scrip_cd = ? OR bse_short_name = ?',
        [symbol, symbol]
      );
      return !!stock;
    } catch (error) {
      console.error(`Error validating stock symbol ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Validate allocation percentages sum to ~100%
   * @param {Array} allocations - Array of allocation objects
   * @returns {Object} - { valid, sum, message? }
   */
  validateAllocationSum(allocations) {
    const sum = allocations.reduce((total, alloc) => total + alloc.allocationPercent, 0);
    
    if (sum < 95 || sum > 105) {
      return {
        valid: false,
        sum,
        message: `Allocations sum to ${sum.toFixed(2)}%, expected approximately 100%`
      };
    }
    
    return {
      valid: true,
      sum
    };
  }

  /**
   * Parse and validate CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} - { success, data?, errors?, warnings? }
   */
  async validateCSV(filePath) {
    const errors = [];
    const warnings = [];
    
    try {
      // Read CSV file
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      // Parse CSV
      let allocations;
      try {
        allocations = this.parseCSVContent(csvContent);
      } catch (parseError) {
        return {
          success: false,
          errors: [{ message: parseError.message }],
          warnings: []
        };
      }
      
      if (allocations.length === 0) {
        return {
          success: false,
          errors: [{ message: 'No valid data rows found in CSV' }],
          warnings: []
        };
      }
      
      if (allocations.length > 500) {
        return {
          success: false,
          errors: [{ message: 'CSV contains more than 500 stocks. Maximum allowed is 500.' }],
          warnings: []
        };
      }
      
      // Validate each allocation
      const validAllocations = [];
      let totalPercent = 0;
      
      for (const alloc of allocations) {
        // Validate allocation percent range
        if (alloc.allocationPercent < 0 || alloc.allocationPercent > 100) {
          errors.push({
            row: alloc.row,
            field: 'allocationPercent',
            message: `Row ${alloc.row}: Allocation percentage must be between 0 and 100. Got: ${alloc.allocationPercent}`
          });
          continue;
        }
        
        // Validate stock symbol exists
        const stockExists = await this.validateStockSymbol(alloc.stockSymbol);
        if (!stockExists) {
          errors.push({
            row: alloc.row,
            field: 'stockSymbol',
            message: `Row ${alloc.row}: Invalid stock symbol '${alloc.stockSymbol}'. Stock not found in BSE master data.`
          });
          continue;
        }
        
        totalPercent += alloc.allocationPercent;
        validAllocations.push({
          stockSymbol: alloc.stockSymbol,
          stockName: alloc.stockName,
          allocationPercent: alloc.allocationPercent
        });
      }
      
      // If there are errors, return them
      if (errors.length > 0) {
        return {
          success: false,
          errors,
          warnings
        };
      }
      
      // Validate total percentage
      if (totalPercent < 95 || totalPercent > 105) {
        warnings.push({
          type: 'allocation_sum',
          message: `Allocations sum to ${totalPercent.toFixed(2)}%, expected approximately 100%`
        });
      }
      
      return {
        success: true,
        data: validAllocations,
        errors: [],
        warnings
      };
      
    } catch (error) {
      console.error('CSV validation error:', error);
      return {
        success: false,
        errors: [{ message: `Failed to read CSV file: ${error.message}` }],
        warnings: []
      };
    }
  }
}

module.exports = CSVImportValidator;
