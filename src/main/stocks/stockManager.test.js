// Unit tests for Stock Manager BSE integration
const databaseManager = require('../database/index');

// Mock dependencies before requiring stockManager
jest.mock('../database/index');

// Import after mocking
const stockManager = require('./stockManager');

describe('StockManager - BSE Integration', () => {
  let mockStockLookupService;

  beforeEach(() => {
    // Reset the stock lookup service
    stockManager.stockLookupService = null;
    
    // Mock stock lookup service
    mockStockLookupService = {
      isReady: jest.fn().mockReturnValue(true),
      lookupByScripCode: jest.fn(),
      lookupByShortName: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createStock with BSE data', () => {
    test('should populate BSE fields when lookup succeeds', async () => {
      // Arrange
      const symbol = 'RELIANCE';
      const name = 'Reliance Industries';
      const mockBseData = {
        Token: '500325',
        ShortName: 'RELIANCE',
        ScripName: 'RELIANCE INDUSTRIES LTD',
        ScripCode: '500325',
        ISINCode: 'INE002A01018',
        '52WeeksHigh': 2855.50,
        '52WeeksLow': 2220.30
      };

      mockStockLookupService.lookupByScripCode.mockReturnValue(mockBseData);
      databaseManager.getOne.mockReturnValue(null); // No existing stock
      databaseManager.insert.mockResolvedValue(1); // Return stock ID

      stockManager.setStockLookupService(mockStockLookupService);

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(mockStockLookupService.lookupByScripCode).toHaveBeenCalledWith(symbol);
      expect(databaseManager.insert).toHaveBeenCalledWith(
        expect.stringContaining('bse_short_name'),
        expect.arrayContaining([
          'RELIANCE',
          'Reliance Industries',
          'NSE',
          null,
          null,
          'RELIANCE',
          'RELIANCE INDUSTRIES LTD',
          'INE002A01018',
          2855.50,
          2220.30,
          expect.any(String),
          expect.any(String)
        ])
      );
      expect(result.scripName).toBe('RELIANCE INDUSTRIES LTD');
      expect(result.bseShortName).toBe('RELIANCE');
      expect(result.isinCode).toBe('INE002A01018');
    });

    test('should insert without BSE data when lookup fails', async () => {
      // Arrange
      const symbol = 'UNKNOWN';
      const name = 'Unknown Stock';

      mockStockLookupService.lookupByScripCode.mockReturnValue(null);
      mockStockLookupService.lookupByShortName.mockReturnValue(null);
      databaseManager.getOne.mockReturnValue(null);
      databaseManager.insert.mockResolvedValue(2);

      stockManager.setStockLookupService(mockStockLookupService);

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(mockStockLookupService.lookupByScripCode).toHaveBeenCalledWith(symbol);
      expect(mockStockLookupService.lookupByShortName).toHaveBeenCalledWith(symbol);
      expect(databaseManager.insert).toHaveBeenCalledWith(
        expect.stringContaining('bse_short_name'),
        expect.arrayContaining([
          'UNKNOWN',
          'Unknown Stock',
          'NSE',
          null,
          null,
          null, // bse_short_name
          null, // scrip_name
          null, // isin_code
          null, // week_52_high
          null, // week_52_low
          expect.any(String),
          expect.any(String)
        ])
      );
      expect(result.scripName).toBeNull();
      expect(result.bseShortName).toBeNull();
    });

    test('should work without stock lookup service', async () => {
      // Arrange
      const symbol = 'TCS';
      const name = 'Tata Consultancy Services';

      databaseManager.getOne.mockReturnValue(null);
      databaseManager.insert.mockResolvedValue(3);

      // Don't set stock lookup service (it's null from beforeEach)

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(databaseManager.insert).toHaveBeenCalledWith(
        expect.stringContaining('bse_short_name'),
        expect.arrayContaining([
          'TCS',
          'Tata Consultancy Services',
          'NSE',
          null,
          null,
          null, // All BSE fields should be null
          null,
          null,
          null,
          null,
          expect.any(String),
          expect.any(String)
        ])
      );
      expect(result.scripName).toBeNull();
    });

    test('should try ShortName lookup if ScripCode lookup fails', async () => {
      // Arrange
      const symbol = 'INFY';
      const name = 'Infosys';
      const mockBseData = {
        Token: '500209',
        ShortName: 'INFY',
        ScripName: 'INFOSYS LTD',
        ScripCode: '500209',
        ISINCode: 'INE009A01021',
        '52WeeksHigh': 1650.00,
        '52WeeksLow': 1350.00
      };

      mockStockLookupService.lookupByScripCode.mockReturnValue(null);
      mockStockLookupService.lookupByShortName.mockReturnValue(mockBseData);
      databaseManager.getOne.mockReturnValue(null);
      databaseManager.insert.mockResolvedValue(4);

      stockManager.setStockLookupService(mockStockLookupService);

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(mockStockLookupService.lookupByScripCode).toHaveBeenCalledWith(symbol);
      expect(mockStockLookupService.lookupByShortName).toHaveBeenCalledWith(symbol);
      expect(result.scripName).toBe('INFOSYS LTD');
      expect(result.week52High).toBe(1650.00);
    });

    test('should handle stock lookup service not ready', async () => {
      // Arrange
      const symbol = 'HDFC';
      const name = 'HDFC Bank';

      mockStockLookupService.isReady.mockReturnValue(false);
      databaseManager.getOne.mockReturnValue(null);
      databaseManager.insert.mockResolvedValue(5);

      stockManager.setStockLookupService(mockStockLookupService);

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(mockStockLookupService.lookupByScripCode).not.toHaveBeenCalled();
      expect(result.scripName).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('should handle BSE data with null 52-week values', async () => {
      // Arrange
      const symbol = 'NEWSTOCK';
      const name = 'New Stock';
      const mockBseData = {
        Token: '999999',
        ShortName: 'NEWSTOCK',
        ScripName: 'NEW STOCK LTD',
        ScripCode: '999999',
        ISINCode: 'INE999A01999',
        '52WeeksHigh': null,
        '52WeeksLow': null
      };

      mockStockLookupService.lookupByScripCode.mockReturnValue(mockBseData);
      databaseManager.getOne.mockReturnValue(null);
      databaseManager.insert.mockResolvedValue(6);

      stockManager.setStockLookupService(mockStockLookupService);

      // Act
      const result = await stockManager.createStock(symbol, name);

      // Assert
      expect(result.week52High).toBeNull();
      expect(result.week52Low).toBeNull();
      expect(result.scripName).toBe('NEW STOCK LTD');
    });

    test('should still throw error for duplicate stock', async () => {
      // Arrange
      const symbol = 'DUPLICATE';
      const name = 'Duplicate Stock';

      databaseManager.getOne.mockReturnValue({ id: 1 }); // Existing stock

      stockManager.setStockLookupService(mockStockLookupService);

      // Act & Assert
      await expect(stockManager.createStock(symbol, name))
        .rejects.toThrow('Stock DUPLICATE already exists on NSE');
    });
  });
});
