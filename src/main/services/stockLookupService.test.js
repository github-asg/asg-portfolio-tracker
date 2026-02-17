const StockLookupService = require('./stockLookupService');

describe('StockLookupService', () => {
  let service;
  let sampleData;

  beforeEach(() => {
    service = new StockLookupService();
    
    // Sample BSE scrip data
    sampleData = [
      {
        Token: '500325',
        ShortName: 'RELIANCE',
        ScripCode: '500325',
        ScripName: 'RELIANCE INDUSTRIES LTD',
        CompanyName: 'RELIANCE INDUSTRIES LIMITED',
        ISINCode: 'INE002A01018',
        '52WeeksHigh': 2856.50,
        '52WeeksLow': 2220.30
      },
      {
        Token: '532454',
        ShortName: 'BHARTIARTL',
        ScripCode: '532454',
        ScripName: 'BHARTI AIRTEL LTD',
        CompanyName: 'BHARTI AIRTEL LIMITED',
        ISINCode: 'INE397D01024',
        '52WeeksHigh': 1234.50,
        '52WeeksLow': 789.20
      },
      {
        Token: '500180',
        ShortName: 'HDFCBANK',
        ScripCode: '500180',
        ScripName: 'HDFC BANK LTD',
        CompanyName: 'HDFC BANK LIMITED',
        ISINCode: 'INE040A01034',
        '52WeeksHigh': 1756.80,
        '52WeeksLow': 1450.90
      }
    ];
  });

  describe('initialize', () => {
    test('should initialize with valid data', () => {
      service.initialize(sampleData);
      
      expect(service.isReady()).toBe(true);
      expect(service.scripCodeIndex.size).toBe(3);
      expect(service.shortNameIndex.size).toBe(3);
    });

    test('should handle empty array', () => {
      service.initialize([]);
      
      expect(service.isReady()).toBe(true);
      expect(service.scripCodeIndex.size).toBe(0);
    });

    test('should handle invalid input gracefully', () => {
      service.initialize(null);
      
      expect(service.isReady()).toBe(false);
    });

    test('should clear existing indexes on re-initialization', () => {
      service.initialize(sampleData);
      expect(service.scripCodeIndex.size).toBe(3);
      
      service.initialize([sampleData[0]]);
      expect(service.scripCodeIndex.size).toBe(1);
    });
  });

  describe('lookupByScripCode', () => {
    beforeEach(() => {
      service.initialize(sampleData);
    });

    test('should find stock by scrip code', () => {
      const result = service.lookupByScripCode('500325');
      
      expect(result).not.toBeNull();
      expect(result.ShortName).toBe('RELIANCE');
      expect(result.ScripName).toBe('RELIANCE INDUSTRIES LTD');
    });

    test('should be case-insensitive', () => {
      const result = service.lookupByScripCode('500325');
      
      expect(result).not.toBeNull();
      expect(result.ShortName).toBe('RELIANCE');
    });

    test('should trim whitespace', () => {
      const result = service.lookupByScripCode('  500325  ');
      
      expect(result).not.toBeNull();
      expect(result.ShortName).toBe('RELIANCE');
    });

    test('should return null for non-existent code', () => {
      const result = service.lookupByScripCode('999999');
      
      expect(result).toBeNull();
    });

    test('should track unmapped codes', () => {
      service.lookupByScripCode('999999');
      
      const unmapped = service.getUnmappedCodes();
      expect(unmapped).toContain('999999');
    });

    test('should return null for empty input', () => {
      const result = service.lookupByScripCode('');
      
      expect(result).toBeNull();
    });

    test('should return null for null input', () => {
      const result = service.lookupByScripCode(null);
      
      expect(result).toBeNull();
    });
  });

  describe('lookupByShortName', () => {
    beforeEach(() => {
      service.initialize(sampleData);
    });

    test('should find stock by short name', () => {
      const result = service.lookupByShortName('RELIANCE');
      
      expect(result).not.toBeNull();
      expect(result.ScripCode).toBe('500325');
      expect(result.ScripName).toBe('RELIANCE INDUSTRIES LTD');
    });

    test('should be case-insensitive', () => {
      const result = service.lookupByShortName('reliance');
      
      expect(result).not.toBeNull();
      expect(result.ScripCode).toBe('500325');
    });

    test('should trim whitespace', () => {
      const result = service.lookupByShortName('  BHARTIARTL  ');
      
      expect(result).not.toBeNull();
      expect(result.ScripCode).toBe('532454');
    });

    test('should return null for non-existent name', () => {
      const result = service.lookupByShortName('NONEXISTENT');
      
      expect(result).toBeNull();
    });

    test('should track unmapped codes', () => {
      service.lookupByShortName('NONEXISTENT');
      
      const unmapped = service.getUnmappedCodes();
      expect(unmapped).toContain('NONEXISTENT');
    });
  });

  describe('searchByCompanyName', () => {
    beforeEach(() => {
      service.initialize(sampleData);
    });

    test('should find stocks by partial company name', () => {
      const results = service.searchByCompanyName('RELIANCE');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].CompanyName).toContain('RELIANCE');
    });

    test('should be case-insensitive', () => {
      const results = service.searchByCompanyName('reliance');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].CompanyName).toContain('RELIANCE');
    });

    test('should find multiple matches', () => {
      const results = service.searchByCompanyName('LIMITED');
      
      expect(results.length).toBe(3);
    });

    test('should limit results to maxResults', () => {
      const results = service.searchByCompanyName('LIMITED', 2);
      
      expect(results.length).toBe(2);
    });

    test('should return empty array for non-existent name', () => {
      const results = service.searchByCompanyName('NONEXISTENT');
      
      expect(results).toEqual([]);
    });

    test('should return empty array for empty search term', () => {
      const results = service.searchByCompanyName('');
      
      expect(results).toEqual([]);
    });

    test('should return empty array for null search term', () => {
      const results = service.searchByCompanyName(null);
      
      expect(results).toEqual([]);
    });

    test('should trim whitespace from search term', () => {
      const results = service.searchByCompanyName('  HDFC  ');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].CompanyName).toContain('HDFC');
    });
  });

  describe('getUnmappedCodes', () => {
    beforeEach(() => {
      service.initialize(sampleData);
    });

    test('should return empty array initially', () => {
      const unmapped = service.getUnmappedCodes();
      
      expect(unmapped).toEqual([]);
    });

    test('should track failed lookups', () => {
      service.lookupByScripCode('999999');
      service.lookupByShortName('INVALID');
      
      const unmapped = service.getUnmappedCodes();
      expect(unmapped).toContain('999999');
      expect(unmapped).toContain('INVALID');
    });

    test('should not duplicate unmapped codes', () => {
      service.lookupByScripCode('999999');
      service.lookupByScripCode('999999');
      
      const unmapped = service.getUnmappedCodes();
      expect(unmapped.filter(code => code === '999999').length).toBe(1);
    });
  });

  describe('isReady', () => {
    test('should return false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    test('should return true after initialization', () => {
      service.initialize(sampleData);
      
      expect(service.isReady()).toBe(true);
    });

    test('should return false after failed initialization', () => {
      service.initialize(null);
      
      expect(service.isReady()).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('should trim whitespace', () => {
      const result = service.sanitizeInput('  TEST  ');
      
      expect(result).toBe('TEST');
    });

    test('should convert to uppercase', () => {
      const result = service.sanitizeInput('test');
      
      expect(result).toBe('TEST');
    });

    test('should handle non-string input', () => {
      const result = service.sanitizeInput(123);
      
      expect(result).toBe('');
    });

    test('should handle null input', () => {
      const result = service.sanitizeInput(null);
      
      expect(result).toBe('');
    });
  });

  describe('formatRecord', () => {
    test('should return only required fields', () => {
      const fullRecord = {
        Token: '500325',
        ShortName: 'RELIANCE',
        ScripCode: '500325',
        ScripName: 'RELIANCE INDUSTRIES LTD',
        CompanyName: 'RELIANCE INDUSTRIES LIMITED',
        ISINCode: 'INE002A01018',
        '52WeeksHigh': 2856.50,
        '52WeeksLow': 2220.30,
        ExtraField: 'should not be included'
      };

      const formatted = service.formatRecord(fullRecord);

      expect(formatted).toHaveProperty('Token');
      expect(formatted).toHaveProperty('ShortName');
      expect(formatted).toHaveProperty('ScripName');
      expect(formatted).toHaveProperty('ISINCode');
      expect(formatted).toHaveProperty('52WeeksHigh');
      expect(formatted).toHaveProperty('52WeeksLow');
      expect(formatted).not.toHaveProperty('ExtraField');
    });
  });

  describe('service not ready', () => {
    test('should not reload during runtime', () => {
      service.initialize(sampleData);
      const firstSize = service.scripCodeIndex.size;
      
      // Service should not automatically reload
      expect(service.scripCodeIndex.size).toBe(firstSize);
    });
  });
});
