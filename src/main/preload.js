const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: (sessionToken) => ipcRenderer.invoke('auth:logout', sessionToken),
  createUser: (username, password) => ipcRenderer.invoke('auth:create-user', username, password),
  validateSession: (sessionToken) => ipcRenderer.invoke('auth:validate-session', sessionToken),
  refreshSession: (sessionToken) => ipcRenderer.invoke('auth:refresh-session', sessionToken),
  getCurrentUser: (sessionToken) => ipcRenderer.invoke('auth:get-current-user', sessionToken),
  changePassword: (sessionToken, currentPassword, newPassword) => 
    ipcRenderer.invoke('auth:change-password', sessionToken, currentPassword, newPassword),
  
  // API Credentials
  saveCredentials: (sessionToken, apiProvider, credentials, masterPassword) =>
    ipcRenderer.invoke('credentials:save', sessionToken, apiProvider, credentials, masterPassword),
  getCredentials: (sessionToken, apiProvider, masterPassword) =>
    ipcRenderer.invoke('credentials:get', sessionToken, apiProvider, masterPassword),
  deleteCredentials: (sessionToken, apiProvider) =>
    ipcRenderer.invoke('credentials:delete', sessionToken, apiProvider),
  listCredentials: (sessionToken) =>
    ipcRenderer.invoke('credentials:list', sessionToken),
  hasCredentials: (sessionToken, apiProvider) =>
    ipcRenderer.invoke('credentials:has', sessionToken, apiProvider),
  validateCredentials: (apiProvider, credentials) =>
    ipcRenderer.invoke('credentials:validate', apiProvider, credentials),
  initializeBreezeClient: (sessionToken, masterPassword) =>
    ipcRenderer.invoke('credentials:initialize-breeze', sessionToken, masterPassword),
  
  // Portfolio
  getPortfolioSummary: (sessionToken) => ipcRenderer.invoke('transactions:get-portfolio-summary', sessionToken),
  getPortfolioWithGains: (sessionToken) => ipcRenderer.invoke('portfolio:get-with-gains', sessionToken),
  getSectorBreakdown: (sessionToken) => ipcRenderer.invoke('portfolio:get-sector-breakdown', sessionToken),
  getPortfolioAllocation: (sessionToken) => ipcRenderer.invoke('portfolio:get-allocation', sessionToken),
  getTopGainers: (sessionToken, limit) => ipcRenderer.invoke('portfolio:get-top-gainers', sessionToken, limit),
  getTopLosers: (sessionToken, limit) => ipcRenderer.invoke('portfolio:get-top-losers', sessionToken, limit),
  getRealizedGains: (sessionToken, financialYear) => ipcRenderer.invoke('portfolio:get-realized-gains', sessionToken, financialYear),
  getPerformanceMetrics: (sessionToken) => ipcRenderer.invoke('portfolio:get-performance-metrics', sessionToken),
  getDashboardSummary: (sessionToken) => ipcRenderer.invoke('portfolio:get-dashboard-summary', sessionToken),
  getHoldings: () => ipcRenderer.invoke('portfolio:get-holdings'),
  refreshPrices: () => ipcRenderer.invoke('portfolio:refresh-prices'),
  
  // Transactions
  addTransaction: (sessionToken, transaction) => ipcRenderer.invoke('transactions:add', sessionToken, transaction),
  updateTransaction: (sessionToken, id, transaction) => ipcRenderer.invoke('transactions:update', sessionToken, id, transaction),
  deleteTransaction: (sessionToken, id) => ipcRenderer.invoke('transactions:delete', sessionToken, id),
  getAllTransactions: (sessionToken, filters) => ipcRenderer.invoke('transactions:get-all', sessionToken, filters),
  getTransactionById: (sessionToken, id) => ipcRenderer.invoke('transactions:get-by-id', sessionToken, id),
  
  // Stocks
  createStock: (sessionToken, stock) => ipcRenderer.invoke('stocks:create', sessionToken, stock),
  getStockBySymbol: (sessionToken, symbol, exchange) => ipcRenderer.invoke('stocks:get-by-symbol', sessionToken, symbol, exchange),
  getStockById: (sessionToken, stockId) => ipcRenderer.invoke('stocks:get-by-id', sessionToken, stockId),
  getAllStocks: (sessionToken, exchange) => ipcRenderer.invoke('stocks:get-all', sessionToken, exchange),
  searchStocks: (sessionToken, searchTerm, exchange) => ipcRenderer.invoke('stocks:search', sessionToken, searchTerm, exchange),
  getStocksBySector: (sessionToken, sector, exchange) => ipcRenderer.invoke('stocks:get-by-sector', sessionToken, sector, exchange),
  updateStock: (sessionToken, stockId, updates) => ipcRenderer.invoke('stocks:update', sessionToken, stockId, updates),
  deleteStock: (sessionToken, stockId) => ipcRenderer.invoke('stocks:delete', sessionToken, stockId),
  getAllSectors: (sessionToken, exchange) => ipcRenderer.invoke('stocks:get-all-sectors', sessionToken, exchange),
  getStockCount: (sessionToken, exchange) => ipcRenderer.invoke('stocks:get-count', sessionToken, exchange),
  bulkCreateStocks: (sessionToken, stocks) => ipcRenderer.invoke('stocks:bulk-create', sessionToken, stocks),
  getStockInfo: (sessionToken, stockId) => ipcRenderer.invoke('stocks:get-info', sessionToken, stockId),
  getAllStocksWithInfo: (sessionToken, exchange) => ipcRenderer.invoke('stocks:get-all-with-info', sessionToken, exchange),
  
  // Stock Lookup (BSE Scrip Master)
  lookupStockByCode: (scripCode) => ipcRenderer.invoke('stock:lookup-by-code', scripCode),
  lookupStockByShortName: (shortName) => ipcRenderer.invoke('stock:lookup-by-shortname', shortName),
  searchStocksByName: (searchTerm, maxResults) => ipcRenderer.invoke('stock:search-by-name', searchTerm, maxResults),
  getUnmappedStocks: () => ipcRenderer.invoke('stock:get-unmapped'),
  getBseStatus: () => ipcRenderer.invoke('bse:get-status'),
  
  // Prices
  getPrice: (sessionToken, symbol, exchange) => ipcRenderer.invoke('prices:get-price', sessionToken, symbol, exchange),
  getCachedPrice: (sessionToken, symbol, exchange) => ipcRenderer.invoke('prices:get-cached-price', sessionToken, symbol, exchange),
  getCachedPrices: (sessionToken, symbols, exchange) => ipcRenderer.invoke('prices:get-cached-prices', sessionToken, symbols, exchange),
  startPriceAutoUpdate: (sessionToken, symbols) => ipcRenderer.invoke('prices:start-auto-update', sessionToken, symbols),
  stopPriceAutoUpdate: (sessionToken) => ipcRenderer.invoke('prices:stop-auto-update', sessionToken),
  getPriceManagerStatus: (sessionToken) => ipcRenderer.invoke('prices:get-status', sessionToken),
  getMarketHours: (sessionToken) => ipcRenderer.invoke('prices:get-market-hours', sessionToken),
  
  // Reports (to be implemented)
  generateCapitalGainsReport: (sessionToken, financialYear, format) => 
    ipcRenderer.invoke('reports:generate-capital-gains', sessionToken, financialYear, format),
  generatePortfolioReport: (sessionToken, asOfDate, format) => 
    ipcRenderer.invoke('reports:generate-portfolio', sessionToken, asOfDate, format),
  
  // File Dialogs
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  showMessageDialog: (options) => ipcRenderer.invoke('dialog:show-message', options),
  
  // Settings (to be implemented)
  getAPIConfig: (sessionToken) => ipcRenderer.invoke('settings:get-api-config', sessionToken),
  saveAPIConfig: (sessionToken, config) => ipcRenderer.invoke('settings:save-api-config', sessionToken, config),
  
  // Database
  getDatabaseStats: () => ipcRenderer.invoke('database:get-stats'),
  checkDatabaseIntegrity: () => ipcRenderer.invoke('database:check-integrity'),
  backupDatabase: (filePath) => ipcRenderer.invoke('database:backup', filePath),
  restoreDatabase: (filePath) => ipcRenderer.invoke('database:restore', filePath),
  healthCheckDatabase: () => ipcRenderer.invoke('database:health-check'),
  optimizeDatabase: () => ipcRenderer.invoke('database:optimize'),
  listBackups: (backupDirectory) => ipcRenderer.invoke('database:list-backups', backupDirectory),
  validateBackup: (backupPath) => ipcRenderer.invoke('database:validate-backup', backupPath),
  createAutoBackup: (backupDirectory) => ipcRenderer.invoke('database:create-auto-backup', backupDirectory),
  
  // Event listeners for real-time updates
  onPriceUpdate: (callback) => ipcRenderer.on('price-update', (event, data) => callback(data)),
  onPriceUpdateSuccess: (callback) => ipcRenderer.on('price-update-success', (event, data) => callback(data)),
  onPriceUpdateError: (callback) => ipcRenderer.on('price-update-error', (event, data) => callback(data)),
  onPortfolioUpdate: (callback) => ipcRenderer.on('portfolio-update', (event, data) => callback(data)),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

console.log('Stock Portfolio Manager - Preload script loaded');