// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Electron APIs for testing
global.electronAPI = {
  login: jest.fn(),
  logout: jest.fn(),
  createUser: jest.fn(),
  getPortfolioSummary: jest.fn(),
  getHoldings: jest.fn(),
  refreshPrices: jest.fn(),
  addTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  getAllTransactions: jest.fn(),
  generateCapitalGainsReport: jest.fn(),
  generatePortfolioReport: jest.fn(),
  getAPIConfig: jest.fn(),
  saveAPIConfig: jest.fn(),
  addStock: jest.fn(),
  getAllStocks: jest.fn(),
  updateStock: jest.fn(),
  backupDatabase: jest.fn(),
  restoreDatabase: jest.fn(),
  onPriceUpdate: jest.fn(),
  onPortfolioUpdate: jest.fn(),
  removeAllListeners: jest.fn()
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock window.confirm for logout tests
global.confirm = jest.fn(() => true);