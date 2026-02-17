const fs = require('fs');
const path = require('path');

/**
 * BSE Scrip Loader
 * Loads and parses the BSEScripMaster.txt file containing BSE stock information
 */
class BseScripLoader {
  constructor() {
    this.filePath = path.join(process.cwd(), 'BSEScripMaster.txt');
  }

  /**
   * Load and parse the BSE Scrip Master file
   * @returns {Promise<Array>} Array of parsed stock records
   */
  async loadScripMaster() {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        console.warn(`BSE Scrip Master file not found at: ${this.filePath}`);
        return [];
      }

      // Read file content
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const lines = content.split('\n');

      // Skip header line and parse data
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        try {
          const record = this.parseLine(line);
          
          // Validate and add record
          if (this.validateRecord(record)) {
            records.push(record);
          } else {
            console.warn(`Skipping invalid record at line ${i + 1}: Missing required fields`);
          }
        } catch (error) {
          console.warn(`Skipping malformed line ${i + 1}: ${error.message}`);
        }
      }

      console.log(`Successfully loaded ${records.length} BSE scrip records`);
      return records;

    } catch (error) {
      console.error(`Error loading BSE Scrip Master file: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse a single pipe-delimited line with quoted fields
   * @param {string} line - The line to parse
   * @returns {Object} Parsed record object
   */
  parseLine(line) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField);

    // Map fields to object structure
    return {
      Token: fields[0] || null,
      ShortName: fields[1] || null,
      Series: fields[2] || null,
      CompanyName: fields[3] || null,
      TickSize: this.parseNumeric(fields[4]),
      LotSize: this.parseNumeric(fields[5]),
      ScripCode: fields[6] || null,
      MarketLot: this.parseNumeric(fields[7]),
      BCastFlag: this.parseNumeric(fields[8]),
      AVMBuyMargin: this.parseNumeric(fields[9]),
      AVMSellMargin: this.parseNumeric(fields[10]),
      ScripID: fields[11] || null,
      ScripName: fields[12] || null,
      GroupName: fields[13] || null,
      NdFlag: fields[14] || null,
      NDSDate: fields[15] || null,
      NDEDate: fields[16] || null,
      SuspStatus: fields[17] || null,
      avmflag: fields[18] || null,
      SuspensionReason: fields[19] || null,
      Suspensiondate: fields[20] || null,
      DateOfListing: fields[21] || null,
      DateOfDeListing: fields[22] || null,
      IssuePrice: this.parseNumeric(fields[23]),
      FaceValue: this.parseNumeric(fields[24]),
      ISINCode: fields[25] || null,
      '52WeeksHigh': this.parseNumeric(fields[26]),
      '52WeeksLow': this.parseNumeric(fields[27]),
      LifeTimeHigh: this.parseNumeric(fields[28]),
      LifeTimeLow: this.parseNumeric(fields[29]),
      HighDate: fields[30] || null,
      LowDate: fields[31] || null,
      MarginPercentage: fields[32] || null,
      ExchangeCode: fields[33] || null
    };
  }

  /**
   * Parse numeric value, return null if invalid
   * @param {string} value - The value to parse
   * @returns {number|null} Parsed number or null
   */
  parseNumeric(value) {
    if (!value || value.trim() === '') {
      return null;
    }
    
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Validate that a record has all required fields
   * @param {Object} record - The record to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateRecord(record) {
    // Required fields: Token, ShortName, ScripName
    if (!record.Token || !record.ShortName || !record.ScripName) {
      return false;
    }

    // Validate ISIN code format if present (should be 12 characters)
    if (record.ISINCode && record.ISINCode.length !== 12) {
      console.warn(`Invalid ISIN code format for ${record.ShortName}: ${record.ISINCode}`);
      // Still return true - we store it as-is but log the warning
    }

    return true;
  }
}

module.exports = BseScripLoader;
