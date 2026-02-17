// Mock dependencies before requiring priceManager
jest.mock('../database/index', () => ({
  getOne: jest.fn(),
  getAll: jest.fn(),
  insert: jest.fn(),
  update: jest.fn()
}));

jest.mock('./breezeClient', () => ({
  getMultipleQuotes: jest.fn(),
  getStockQuote: jest.fn(),
  getStatus: jest.fn().mockReturnValue({ connected: true }),
  getMarketTimeInfo: jest.fn().mockReturnValue({ isOpen: false, status: 'closed' })
}));

const priceManager = require('./priceManager');
const databaseManager = require('../database/index');

describe('PriceManager - BSE Integration', () => {
  let mockStockLookupService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock stock lookup service
    mockStockLookupService = {
      isReady: jest.fn().mockReturnValue(true),
      lookupByScripCode: jest.fn(),
      lookupByShortName: jest.fn()
    };

    // Reset the stock lookup service in priceManager
    priceManager.stockLookupService = null;
  });

  describe('setStockLookupService', () => {
    it('should inject stock lookup service', () => {
      priceManager.setStockLookupService(mockStockLookupService);
      expect(priceManager.stockLookupService).toBe(mockStockLookupService);
    });
  });

  describe('mapStockCodes', () => {
    it('should map stock codes to BSE ShortNames', () => {
      priceManager.setStockLookupService(mockStockLookupService);

      // Mock lookup responses
      mockStockLookupService.lookupByScripCode
        .mockReturnValueOnce({ ShortName: 'RELIANCE', ScripCode: '500325' })
        .mockReturnValueOnce({ ShortName: 'TCS', ScripCode: '532540' });

      const result = priceManager.mapStockCodes(['500325', '532540']);

      expect(result.mapped).toHaveLength(2);
      expect(result.mapped[0]).toEqual({ userCode: '500325', bseShortName: 'RELIANCE' });
      expect(result.mapped[1]).toEqual({ userCode: '532540', bseShortName: 'TCS' });
      expect(result.unmapped).toHaveLength(0);
    });

    it('should handle unmapped stock codes', () => {
      priceManager.setStockLookupService(mockStockLookupService);

      // Mock lookup responses - first succeeds, second fails
      mockStockLookupService.lookupByScripCode
        .mockReturnValueOnce({ ShortName: 'RELIANCE', ScripCode: '500325' })
        .mockReturnValueOnce(null);
      
      mockStockLookupService.lookupByShortName.mockReturnValue(null);

      const result = priceManager.mapStockCodes(['500325', 'INVALID']);

      expect(result.mapped).toHaveLength(1);
      expect(result.mapped[0]).toEqual({ userCode: '500325', bseShortName: 'RELIANCE' });
      expect(result.unmapped).toHaveLength(1);
      expect(result.unmapped[0]).toBe('INVALID');
    });

    it('should try ShortName lookup if ScripCode lookup fails', () => {
      priceManager.setStockLookupService(mockStockLookupService);

      // Mock lookup responses - ScripCode fails, ShortName succeeds
      mockStockLookupService.lookupByScripCode.mockReturnValue(null);
      mockStockLookupService.lookupByShortName.mockReturnValue({ 
        ShortName: 'RELIANCE', 
        ScripCode: '500325' 
      });

      const result = priceManager.mapStockCodes(['RELIANCE']);

      expect(result.mapped).toHaveLength(1);
      expect(result.mapped[0]).toEqual({ userCode: 'RELIANCE', bseShortName: 'RELIANCE' });
      expect(result.unmapped).toHaveLength(0);
      expect(mockStockLookupService.lookupByScripCode).toHaveBeenCalledWith('RELIANCE');
      expect(mockStockLookupService.lookupByShortName).toHaveBeenCalledWith('RELIANCE');
    });

    it('should use stock codes as-is when service is not ready', () => {
      priceManager.setStockLookupService(mockStockLookupService);
      mockStockLookupService.isReady.mockReturnValue(false);

      const result = priceManager.mapStockCodes(['500325', '532540']);

      expect(result.mapped).toHaveLength(2);
      expect(result.mapped[0]).toEqual({ userCode: '500325', bseShortName: '500325' });
      expect(result.mapped[1]).toEqual({ userCode: '532540', bseShortName: '532540' });
      expect(result.unmapped).toHaveLength(0);
      expect(mockStockLookupService.lookupByScripCode).not.toHaveBeenCalled();
    });

    it('should use stock codes as-is when service is not set', () => {
      const result = priceManager.mapStockCodes(['500325', '532540']);

      expect(result.mapped).toHaveLength(2);
      expect(result.mapped[0]).toEqual({ userCode: '500325', bseShortName: '500325' });
      expect(result.mapped[1]).toEqual({ userCode: '532540', bseShortName: '532540' });
      expect(result.unmapped).toHaveLength(0);
    });

    it('should handle empty stock codes array', () => {
      priceManager.setStockLookupService(mockStockLookupService);

      const result = priceManager.mapStockCodes([]);

      expect(result.mapped).toHaveLength(0);
      expect(result.unmapped).toHaveLength(0);
    });
  });

  describe('getCachedPrice', () => {
    it('should default to BSE exchange', () => {
      const databaseManager = require('../database/index');
      jest.spyOn(databaseManager, 'getOne').mockReturnValue({
        symbol: 'RELIANCE',
        exchange: 'BSE',
        price: 2500.50
      });

      const result = priceManager.getCachedPrice('RELIANCE');

      expect(databaseManager.getOne).toHaveBeenCalledWith(
        'SELECT * FROM price_cache WHERE symbol = ? AND exchange = ?',
        ['RELIANCE', 'BSE']
      );
    });
  });

  describe('getCachedPrices', () => {
    it('should default to BSE exchange', () => {
      const databaseManager = require('../database/index');
      jest.spyOn(databaseManager, 'getAll').mockReturnValue([]);

      priceManager.getCachedPrices(['RELIANCE', 'TCS']);

      expect(databaseManager.getAll).toHaveBeenCalledWith(
        'SELECT * FROM price_cache WHERE symbol IN (?,?) AND exchange = ?',
        ['RELIANCE', 'TCS', 'BSE']
      );
    });
  });
});
