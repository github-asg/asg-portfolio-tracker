/**
 * Stock Lookup Service
 * Provides fast lookup and search functionality for BSE stock data
 * Maintains in-memory indexes for efficient queries
 */
class StockLookupService {
  constructor() {
    this.scripCodeIndex = new Map();
    this.shortNameIndex = new Map();
    this.companyNameIndex = new Map();
    this.unmappedCodes = new Set();
    this.ready = false;
  }

  /**
   * Initialize the service with BSE scrip data
   * Builds indexes for fast lookups
   * @param {Array} scripData - Array of BSE scrip records
   */
  initialize(scripData) {
    if (!Array.isArray(scripData)) {
      console.error('Invalid scrip data provided to StockLookupService');
      return;
    }

    // Clear existing indexes
    this.scripCodeIndex.clear();
    this.shortNameIndex.clear();
    this.companyNameIndex.clear();
    this.unmappedCodes.clear();

    // Build indexes
    for (const record of scripData) {
      // Index by ScripCode
      if (record.ScripCode) {
        this.scripCodeIndex.set(record.ScripCode.toUpperCase(), record);
      }

      // Index by ShortName
      if (record.ShortName) {
        this.shortNameIndex.set(record.ShortName.toUpperCase(), record);
      }

      // Index by CompanyName (for search)
      if (record.CompanyName) {
        const normalizedName = record.CompanyName.toUpperCase();
        if (!this.companyNameIndex.has(normalizedName)) {
          this.companyNameIndex.set(normalizedName, []);
        }
        this.companyNameIndex.get(normalizedName).push(record);
      }
    }

    this.ready = true;
    console.log(`Stock Lookup Service initialized with ${scripData.length} records`);
    console.log(`Indexes: ${this.scripCodeIndex.size} scrip codes, ${this.shortNameIndex.size} short names`);
  }

  /**
   * Lookup stock by ScripCode
   * @param {string} scripCode - The BSE scrip code
   * @returns {Object|null} Stock record or null if not found
   */
  lookupByScripCode(scripCode) {
    if (!scripCode) {
      return null;
    }

    const sanitized = this.sanitizeInput(scripCode);
    const record = this.scripCodeIndex.get(sanitized);

    if (!record) {
      this.unmappedCodes.add(scripCode);
      return null;
    }

    return this.formatRecord(record);
  }

  /**
   * Lookup stock by ShortName
   * @param {string} shortName - The BSE short name
   * @returns {Object|null} Stock record or null if not found
   */
  lookupByShortName(shortName) {
    if (!shortName) {
      return null;
    }

    const sanitized = this.sanitizeInput(shortName);
    const record = this.shortNameIndex.get(sanitized);

    if (!record) {
      this.unmappedCodes.add(shortName);
      return null;
    }

    return this.formatRecord(record);
  }

  /**
   * Search stocks by company name (case-insensitive partial match)
   * @param {string} searchTerm - The search term
   * @param {number} maxResults - Maximum number of results (default 20)
   * @returns {Array} Array of matching stock records
   */
  searchByCompanyName(searchTerm, maxResults = 20) {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return [];
    }

    const sanitized = searchTerm.trim().toUpperCase();
    if (sanitized.length === 0) {
      return [];
    }

    const results = [];

    // Search through company names for partial matches
    for (const [companyName, records] of this.companyNameIndex.entries()) {
      if (companyName.includes(sanitized)) {
        for (const record of records) {
          results.push(this.formatRecord(record));
          if (results.length >= maxResults) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Get list of unmapped stock codes that failed lookups
   * @returns {Array} Array of unmapped codes
   */
  getUnmappedCodes() {
    return Array.from(this.unmappedCodes);
  }

  /**
   * Check if the service is ready for lookups
   * @returns {boolean} True if initialized, false otherwise
   */
  isReady() {
    return this.ready;
  }

  /**
   * Sanitize input parameter
   * @param {string} input - The input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }

    // Trim whitespace and convert to uppercase
    return input.trim().toUpperCase();
  }

  /**
   * Format record for return
   * Returns only the fields needed by consumers
   * @param {Object} record - The full record
   * @returns {Object} Formatted record
   */
  formatRecord(record) {
    return {
      Token: record.Token,
      ShortName: record.ShortName,
      ScripName: record.ScripName,
      ScripCode: record.ScripCode,
      ISINCode: record.ISINCode,
      '52WeeksHigh': record['52WeeksHigh'],
      '52WeeksLow': record['52WeeksLow'],
      CompanyName: record.CompanyName
    };
  }
}

module.exports = StockLookupService;
