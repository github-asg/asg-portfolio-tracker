/**
 * Unit tests for Stock Lookup IPC Handlers
 */

const { ipcMain } = require('electron');
const { registerStockLookupHandlers } = require('./stockLookupHandler');

// Mock electron ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  }
}));

describe('Stock Lookup IPC Handlers', () => {
  let mockStockLookupService;
  let handlers;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    handlers = {};

    // Mock stock lookup service
    mockStockLookupService = {
      isReady: jest.fn().mockReturnValue(true),
      lookupByScripCode: jest.fn(),
      lookupByShortName: jest.fn(),
      searchByCompanyName: jest.fn(),
      getUnmappedCodes: jest.fn()
    };

    // Capture handlers when they're registered
    ipcMain.handle.mockImplementation((channel, handler) => {
      handlers[channel] = handler;
    });

    // Register handlers
    registerStockLookupHandlers(mockStockLookupService);
  });

  describe('registerStockLookupHandlers', () => {
    it('should register all four IPC handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledTimes(4);
      expect(handlers['stock:lookup-by-code']).toBeDefined();
      expect(handlers['stock:lookup-by-shortname']).toBeDefined();
      expect(handlers['stock:search-by-name']).toBeDefined();
      expect(handlers['stock:get-unmapped']).toBeDefined();
    });

    it('should handle null service gracefully', () => {
      jest.clearAllMocks();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      registerStockLookupHandlers(null);
      
      expect(consoleSpy).toHaveBeenCalledWith('Stock Lookup Service not provided to IPC handlers');
      expect(ipcMain.handle).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('stock:lookup-by-code handler', () => {
    it('should return success when stock is found', async () => {
      const mockStock = {
        Token: '123',
        ShortName: 'RELIANCE',
        ScripName: 'RELIANCE INDUSTRIES LTD',
        ISINCode: 'INE002A01018'
      };
      mockStockLookupService.lookupByScripCode.mockReturnValue(mockStock);

      const result = await handlers['stock:lookup-by-code']({}, '500325');

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockStock
      });
      expect(mockStockLookupService.lookupByScripCode).toHaveBeenCalledWith('500325');
    });

    it('should return error when stock is not found', async () => {
      mockStockLookupService.lookupByScripCode.mockReturnValue(null);

      const result = await handlers['stock:lookup-by-code']({}, '999999');

      expect(result).toEqual({
        success: false,
        error: 'Stock not found',
        data: null
      });
    });

    it('should validate input parameter', async () => {
      const result = await handlers['stock:lookup-by-code']({}, null);

      expect(result).toEqual({
        success: false,
        error: 'Invalid scrip code provided',
        data: null
      });
      expect(mockStockLookupService.lookupByScripCode).not.toHaveBeenCalled();
    });

    it('should check if service is ready', async () => {
      mockStockLookupService.isReady.mockReturnValue(false);

      const result = await handlers['stock:lookup-by-code']({}, '500325');

      expect(result).toEqual({
        success: false,
        error: 'Stock lookup service not initialized',
        data: null
      });
      expect(mockStockLookupService.lookupByScripCode).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockStockLookupService.lookupByScripCode.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await handlers['stock:lookup-by-code']({}, '500325');

      expect(result).toEqual({
        success: false,
        error: 'Database error',
        data: null
      });
    });
  });

  describe('stock:lookup-by-shortname handler', () => {
    it('should return success when stock is found', async () => {
      const mockStock = {
        Token: '123',
        ShortName: 'RELIANCE',
        ScripName: 'RELIANCE INDUSTRIES LTD'
      };
      mockStockLookupService.lookupByShortName.mockReturnValue(mockStock);

      const result = await handlers['stock:lookup-by-shortname']({}, 'RELIANCE');

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockStock
      });
      expect(mockStockLookupService.lookupByShortName).toHaveBeenCalledWith('RELIANCE');
    });

    it('should return error when stock is not found', async () => {
      mockStockLookupService.lookupByShortName.mockReturnValue(null);

      const result = await handlers['stock:lookup-by-shortname']({}, 'INVALID');

      expect(result).toEqual({
        success: false,
        error: 'Stock not found',
        data: null
      });
    });

    it('should validate input parameter', async () => {
      const result = await handlers['stock:lookup-by-shortname']({}, '');

      expect(result).toEqual({
        success: false,
        error: 'Invalid short name provided',
        data: null
      });
    });
  });

  describe('stock:search-by-name handler', () => {
    it('should return search results', async () => {
      const mockResults = [
        { ShortName: 'RELIANCE', ScripName: 'RELIANCE INDUSTRIES LTD' },
        { ShortName: 'RELIANCECOM', ScripName: 'RELIANCE COMMUNICATIONS LTD' }
      ];
      mockStockLookupService.searchByCompanyName.mockReturnValue(mockResults);

      const result = await handlers['stock:search-by-name']({}, 'RELIANCE');

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockResults
      });
      expect(mockStockLookupService.searchByCompanyName).toHaveBeenCalledWith('RELIANCE', undefined);
    });

    it('should pass maxResults parameter', async () => {
      mockStockLookupService.searchByCompanyName.mockReturnValue([]);

      await handlers['stock:search-by-name']({}, 'RELIANCE', 10);

      expect(mockStockLookupService.searchByCompanyName).toHaveBeenCalledWith('RELIANCE', 10);
    });

    it('should validate search term', async () => {
      const result = await handlers['stock:search-by-name']({}, null);

      expect(result).toEqual({
        success: false,
        error: 'Invalid search term provided',
        data: []
      });
    });

    it('should validate maxResults parameter', async () => {
      const result = await handlers['stock:search-by-name']({}, 'RELIANCE', -5);

      expect(result).toEqual({
        success: false,
        error: 'Invalid maxResults parameter',
        data: []
      });
    });

    it('should return empty array when no results found', async () => {
      mockStockLookupService.searchByCompanyName.mockReturnValue([]);

      const result = await handlers['stock:search-by-name']({}, 'NONEXISTENT');

      expect(result).toEqual({
        success: true,
        error: null,
        data: []
      });
    });
  });

  describe('stock:get-unmapped handler', () => {
    it('should return unmapped codes', async () => {
      const mockUnmapped = ['INVALID1', 'INVALID2', 'INVALID3'];
      mockStockLookupService.getUnmappedCodes.mockReturnValue(mockUnmapped);

      const result = await handlers['stock:get-unmapped']({});

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockUnmapped
      });
      expect(mockStockLookupService.getUnmappedCodes).toHaveBeenCalled();
    });

    it('should return empty array when no unmapped codes', async () => {
      mockStockLookupService.getUnmappedCodes.mockReturnValue([]);

      const result = await handlers['stock:get-unmapped']({});

      expect(result).toEqual({
        success: true,
        error: null,
        data: []
      });
    });

    it('should check if service is ready', async () => {
      mockStockLookupService.isReady.mockReturnValue(false);

      const result = await handlers['stock:get-unmapped']({});

      expect(result).toEqual({
        success: false,
        error: 'Stock lookup service not initialized',
        data: []
      });
    });

    it('should handle service errors gracefully', async () => {
      mockStockLookupService.getUnmappedCodes.mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await handlers['stock:get-unmapped']({});

      expect(result).toEqual({
        success: false,
        error: 'Service error',
        data: []
      });
    });
  });
});
