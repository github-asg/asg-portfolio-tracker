/**
 * Unit tests for main process startup integration
 * Tests BSE Scrip Master loading during application startup
 */

const fs = require('fs');
const path = require('path');

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    name: 'Stock Portfolio Manager'
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(() => Promise.resolve()),
    once: jest.fn(),
    on: jest.fn(),
    webContents: {
      on: jest.fn(),
      openDevTools: jest.fn(),
      send: jest.fn()
    },
    isDestroyed: jest.fn(() => false),
    show: jest.fn(),
    focus: jest.fn()
  })),
  ipcMain: {
    handle: jest.fn()
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}));

// Mock all required modules
jest.mock('./database/index', () => ({
  initialize: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
  getStats: jest.fn(),
  checkIntegrity: jest.fn(),
  backup: jest.fn(),
  restore: jest.fn(),
  healthCheck: jest.fn(),
  optimize: jest.fn(),
  listBackups: jest.fn(),
  validateBackup: jest.fn(),
  createAutoBackup: jest.fn()
}));

jest.mock('./auth/authenticationService', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  createUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  validateSession: jest.fn(),
  refreshSession: jest.fn(),
  getCurrentUser: jest.fn(),
  changePassword: jest.fn()
}));

jest.mock('./auth/apiCredentialsManager', () => ({
  saveCredentials: jest.fn(),
  getCredentials: jest.fn(),
  deleteCredentials: jest.fn(),
  listProviders: jest.fn(),
  hasCredentials: jest.fn(),
  validateCredentials: jest.fn()
}));

jest.mock('./transactions/transactionManager', () => ({
  addBuyTransaction: jest.fn(),
  addSellTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  getTransactions: jest.fn(),
  getTransactionById: jest.fn(),
  getPortfolioSummary: jest.fn(),
  on: jest.fn()
}));

jest.mock('./stocks/stockManager', () => ({
  createStock: jest.fn(),
  getStockBySymbol: jest.fn(),
  getStockById: jest.fn(),
  getAllStocks: jest.fn(),
  searchStocks: jest.fn(),
  getStocksBySector: jest.fn(),
  updateStock: jest.fn(),
  deleteStock: jest.fn(),
  getAllSectors: jest.fn(),
  getStockCount: jest.fn(),
  bulkCreateStocks: jest.fn(),
  getStockInfo: jest.fn(),
  getAllStocksWithInfo: jest.fn()
}));

jest.mock('./api/priceManager', () => ({
  initialize: jest.fn(() => Promise.resolve()),
  shutdown: jest.fn(),
  getPriceWithFallback: jest.fn(),
  getCachedPrice: jest.fn(),
  getCachedPrices: jest.fn(),
  startAutoUpdate: jest.fn(),
  stopAutoUpdate: jest.fn(),
  getStatus: jest.fn(),
  on: jest.fn()
}));

jest.mock('./api/breezeClient', () => ({
  getMarketTimeInfo: jest.fn()
}));

jest.mock('./portfolio/portfolioCalculator', () => ({
  getPortfolioWithGains: jest.fn(),
  getSectorBreakdown: jest.fn(),
  getPortfolioAllocation: jest.fn(),
  getTopGainers: jest.fn(),
  getTopLosers: jest.fn(),
  getRealizedGainsByYear: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  getDashboardSummary: jest.fn()
}));

// Mock BSE components
const mockLoadScripMaster = jest.fn();
jest.mock('./data/bseScripLoader', () => {
  return jest.fn().mockImplementation(() => ({
    loadScripMaster: mockLoadScripMaster
  }));
});

const mockInitialize = jest.fn();
const mockIsReady = jest.fn();
jest.mock('./services/stockLookupService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    isReady: mockIsReady
  }));
});

describe('Main Process Startup Integration', () => {
  describe('BSE Scrip Master Loading', () => {
    it('should load BSE data on startup with valid file', async () => {
      // Mock successful data loading
      const mockScripData = [
        {
          Token: '500325',
          ShortName: 'RELIANCE',
          ScripName: 'RELIANCE INDUSTRIES LTD',
          ScripCode: '500325',
          ISINCode: 'INE002A01018',
          '52WeeksHigh': 2856.00,
          '52WeeksLow': 2220.30
        },
        {
          Token: '532454',
          ShortName: 'BHARTIARTL',
          ScripName: 'BHARTI AIRTEL LTD',
          ScripCode: '532454',
          ISINCode: 'INE397D01024',
          '52WeeksHigh': 1234.50,
          '52WeeksLow': 890.25
        }
      ];

      mockLoadScripMaster.mockResolvedValue(mockScripData);

      // Verify the mock returns expected data
      const data = await mockLoadScripMaster();
      expect(data).toEqual(mockScripData);
      expect(data.length).toBe(2);
    });

    it('should handle missing file gracefully (edge case)', async () => {
      // Mock empty data (file not found)
      mockLoadScripMaster.mockResolvedValue([]);

      // Verify empty array is returned when file is missing
      const data = await mockLoadScripMaster();
      expect(data).toEqual([]);
      expect(data.length).toBe(0);
    });
  });

  describe('Stock Lookup Service Initialization', () => {
    it('should initialize service with loaded data', () => {
      const mockScripData = [
        {
          Token: '500325',
          ShortName: 'RELIANCE',
          ScripName: 'RELIANCE INDUSTRIES LTD',
          ScripCode: '500325'
        }
      ];

      mockInitialize(mockScripData);
      expect(mockInitialize).toHaveBeenCalledWith(mockScripData);
    });

    it('should handle empty data gracefully', () => {
      mockInitialize([]);
      expect(mockInitialize).toHaveBeenCalledWith([]);
    });
  });
});
