const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if we're in development mode
const buildPath = path.join(__dirname, '../../build/index.html');
const isDev = process.env.ELECTRON_IS_DEV === '1' || 
              process.env.NODE_ENV === 'development' || 
              !fs.existsSync(buildPath) ||
              process.argv.includes('--dev');

console.log('=== ELECTRON STARTUP DEBUG ===');
console.log('Build path:', buildPath);
console.log('Build exists:', fs.existsSync(buildPath));
console.log('ELECTRON_IS_DEV:', process.env.ELECTRON_IS_DEV);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDev:', isDev);
console.log('==============================');

// Import database manager
const databaseManager = require('./database/index');
const authenticationService = require('./auth/authenticationService');
const apiCredentialsManager = require('./auth/apiCredentialsManager');
const transactionManager = require('./transactions/transactionManager');
const stockManager = require('./stocks/stockManager');
const stockImporter = require('./stocks/stockImporter');
const priceManager = require('./api/priceManager');
const breezeClient = require('./api/breezeClient');
const portfolioCalculator = require('./portfolio/portfolioCalculator');

// Import BSE Scrip Master components
const BseScripLoader = require('./data/bseScripLoader');
const StockLookupService = require('./services/stockLookupService');
const { registerStockLookupHandlers } = require('./ipc/stockLookupHandler');

// Import transaction editing components
const { registerTransactionEditingHandlers } = require('./ipc/transactionEditingHandler');

// Import stock age histogram components
const { registerStockAgeHistogramHandlers } = require('./ipc/stockAgeHistogramHandler');

// Import mutual fund components (disabled for v1.0.0)
// const { registerMutualFundHandlers } = require('./ipc/mutualFundHandler');

// Initialize Stock Lookup Service (singleton)
const stockLookupService = new StockLookupService();

let mainWindow;

async function createWindow() {
  // Initialize database first
  try {
    await databaseManager.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Show error dialog and exit
    const { dialog } = require('electron');
    dialog.showErrorBox('Database Error', 'Failed to initialize database. The application will exit.');
    app.quit();
    return;
  }

  // Initialize authentication service
  try {
    authenticationService.initialize();
    console.log('Authentication service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize authentication service:', error);
  }

  // Initialize price manager
  try {
    await priceManager.initialize();
    console.log('Price manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize price manager:', error);
  }

  // Load BSE Scrip Master data
  try {
    console.log('Loading BSE Scrip Master data...');
    const bseScripLoader = new BseScripLoader();
    const scripData = await bseScripLoader.loadScripMaster();
    
    if (scripData.length === 0) {
      console.warn('BSE Scrip Master file not found or empty - continuing with degraded functionality');
      console.warn('Stock lookup and BSE API integration will not be available');
    } else {
      stockLookupService.initialize(scripData);
      console.log(`✓ BSE Scrip Master loaded successfully: ${scripData.length} records`);
      
      // Inject stock lookup service into price manager
      priceManager.setStockLookupService(stockLookupService);
      console.log('✓ Stock lookup service injected into price manager');

      // Inject stock lookup service into stock manager
      stockManager.setStockLookupService(stockLookupService);
      console.log('✓ Stock lookup service injected into stock manager');

      // Inject stock lookup service into stock importer
      stockImporter.setStockLookupService(stockLookupService);
      console.log('✓ Stock lookup service injected into stock importer');

      // Run BSE database migration to add fields and populate data
      try {
        await databaseManager.runBseMigration(stockLookupService);
        console.log('✓ BSE database migration completed');
      } catch (error) {
        console.error('BSE database migration failed:', error);
        console.error('Application startup aborted due to migration failure');
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to load BSE Scrip Master data:', error);
    console.warn('Continuing with degraded functionality - stock lookup will not be available');
  }

  // Register stock lookup IPC handlers
  registerStockLookupHandlers(stockLookupService);

  // Register transaction editing IPC handlers
  registerTransactionEditingHandlers();

  // Register stock age histogram IPC handlers
  registerStockAgeHistogramHandlers();

  // Register mutual fund IPC handlers
  // TODO: Uncomment when mutual fund UI is ready
  // registerMutualFundHandlers();

  // Load and initialize Breeze API credentials if available
  try {
    console.log('Checking for saved Breeze API credentials...');
    // Get the demo user ID (or first user)
    const users = databaseManager.getAll('SELECT id FROM users LIMIT 1');
    if (users && users.length > 0) {
      const userId = users[0].id;
      
      // Check if Breeze credentials exist
      const hasBreeze = apiCredentialsManager.hasCredentials(userId, 'breeze');
      if (hasBreeze) {
        console.log('Found saved Breeze credentials, attempting to load...');
        // Note: We need the master password to decrypt, so we'll load on first API call
        // For now, just log that credentials exist
        console.log('✓ Breeze API credentials are saved (will be loaded on first use)');
      } else {
        console.log('No Breeze API credentials found - API features will be unavailable');
      }
    }
  } catch (error) {
    console.error('Failed to check Breeze credentials:', error);
    console.warn('Continuing without Breeze API integration');
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1000,
    minHeight: 600,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  console.log('✓ Window created');

  // Load the app with retry logic
  if (isDev) {
    const startUrl = 'http://localhost:3000';
    console.log(`Loading URL: ${startUrl}`);
    
    const loadWithRetry = async (retries = 5) => {
      for (let i = 0; i < retries; i++) {
        try {
          await mainWindow.loadURL(startUrl);
          console.log('✓ URL loaded successfully');
          return;
        } catch (error) {
          console.log(`✗ Load attempt ${i + 1} failed:`, error.message);
          if (i < retries - 1) {
            console.log('Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      console.error('All load attempts failed');
    };
    
    await loadWithRetry();
  } else {
    // In production, use loadFile for better compatibility
    const indexPath = path.join(__dirname, '../../build/index.html');
    console.log(`Loading file: ${indexPath}`);
    console.log(`__dirname: ${__dirname}`);
    console.log(`File exists: ${fs.existsSync(indexPath)}`);
    
    try {
      await mainWindow.loadFile(indexPath);
      console.log('✓ File loaded successfully');
    } catch (error) {
      console.error('✗ Failed to load file:', error);
      throw error;
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('✓ Window ready, showing now');
    
    // Maximize window in production, show normally in dev
    if (!isDev) {
      mainWindow.maximize();
    }
    
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle load failures with immediate retry
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`✗ Load failed: ${errorDescription} (${errorCode})`);
    if (isDev && validatedURL.includes('localhost:3000')) {
      console.log('Retrying React dev server...');
      setTimeout(() => {
        mainWindow.loadURL(startUrl);
      }, 2000);
    }
  });

  // Log successful loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✓ Page loaded successfully');
  });

  // Open DevTools only in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createApplicationMenu();
}

// Create application menu
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Stock Portfolio Manager',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Stock Portfolio Manager',
              message: 'Stock Portfolio Manager',
              detail: 'Version 1.0.0\n\nA desktop application for managing stock portfolios with real-time price updates and capital gains calculations.'
            });
          }
        }
      ]
    }
  ];

  // Add macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', async () => {
  // Close database connection
  await databaseManager.close();
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});

// Handle app before quit
app.on('before-quit', async () => {
  // Shutdown price manager
  priceManager.shutdown();
  
  // Shutdown authentication service
  authenticationService.shutdown();
  
  // Close database connection gracefully
  await databaseManager.close();
});

// Basic IPC handlers for database operations (will be expanded later)
ipcMain.handle('database:get-stats', async () => {
  try {
    return databaseManager.getStats();
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
});

ipcMain.handle('database:check-integrity', async () => {
  try {
    return databaseManager.checkIntegrity();
  } catch (error) {
    console.error('Failed to check database integrity:', error);
    throw error;
  }
});

ipcMain.handle('database:backup', async (event, backupPath) => {
  try {
    return await databaseManager.backup(backupPath);
  } catch (error) {
    console.error('Failed to backup database:', error);
    throw error;
  }
});

ipcMain.handle('database:restore', async (event, backupPath) => {
  try {
    return await databaseManager.restore(backupPath);
  } catch (error) {
    console.error('Failed to restore database:', error);
    throw error;
  }
});

ipcMain.handle('database:health-check', async () => {
  try {
    return await databaseManager.healthCheck();
  } catch (error) {
    console.error('Failed to perform database health check:', error);
    throw error;
  }
});

ipcMain.handle('database:optimize', async () => {
  try {
    return await databaseManager.optimize();
  } catch (error) {
    console.error('Failed to optimize database:', error);
    throw error;
  }
});

ipcMain.handle('database:list-backups', async (event, backupDirectory) => {
  try {
    return databaseManager.listBackups(backupDirectory);
  } catch (error) {
    console.error('Failed to list backups:', error);
    throw error;
  }
});

ipcMain.handle('database:validate-backup', async (event, backupPath) => {
  try {
    return await databaseManager.validateBackup(backupPath);
  } catch (error) {
    console.error('Failed to validate backup:', error);
    throw error;
  }
});

ipcMain.handle('database:create-auto-backup', async (event, backupDirectory) => {
  try {
    return await databaseManager.createAutoBackup(backupDirectory);
  } catch (error) {
    console.error('Failed to create auto backup:', error);
    throw error;
  }
});

// Authentication IPC handlers
ipcMain.handle('auth:create-user', async (event, username, password) => {
  try {
    return await authenticationService.createUser(username, password);
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
});

ipcMain.handle('auth:login', async (event, username, password) => {
  try {
    return await authenticationService.login(username, password);
  } catch (error) {
    console.error('Failed to login:', error);
    throw error;
  }
});

ipcMain.handle('auth:logout', async (event, sessionToken) => {
  try {
    return authenticationService.logout(sessionToken);
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
});

ipcMain.handle('auth:validate-session', async (event, sessionToken) => {
  try {
    return authenticationService.validateSession(sessionToken);
  } catch (error) {
    console.error('Failed to validate session:', error);
    throw error;
  }
});

ipcMain.handle('auth:refresh-session', async (event, sessionToken) => {
  try {
    return authenticationService.refreshSession(sessionToken);
  } catch (error) {
    console.error('Failed to refresh session:', error);
    throw error;
  }
});

ipcMain.handle('auth:get-current-user', async (event, sessionToken) => {
  try {
    return authenticationService.getCurrentUser(sessionToken);
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
});

ipcMain.handle('auth:change-password', async (event, sessionToken, currentPassword, newPassword) => {
  try {
    return await authenticationService.changePassword(sessionToken, currentPassword, newPassword);
  } catch (error) {
    console.error('Failed to change password:', error);
    throw error;
  }
});

// API Credentials IPC handlers
ipcMain.handle('credentials:save', async (event, sessionToken, apiProvider, credentials, masterPassword) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await apiCredentialsManager.saveCredentials(
      validation.userId,
      apiProvider,
      credentials,
      masterPassword
    );
  } catch (error) {
    console.error('Failed to save credentials:', error);
    throw error;
  }
});

ipcMain.handle('credentials:get', async (event, sessionToken, apiProvider, masterPassword) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return apiCredentialsManager.getCredentials(
      validation.userId,
      apiProvider,
      masterPassword
    );
  } catch (error) {
    console.error('Failed to get credentials:', error);
    throw error;
  }
});

ipcMain.handle('credentials:delete', async (event, sessionToken, apiProvider) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await apiCredentialsManager.deleteCredentials(validation.userId, apiProvider);
  } catch (error) {
    console.error('Failed to delete credentials:', error);
    throw error;
  }
});

ipcMain.handle('credentials:list', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return apiCredentialsManager.listProviders(validation.userId);
  } catch (error) {
    console.error('Failed to list credentials:', error);
    throw error;
  }
});

ipcMain.handle('credentials:has', async (event, sessionToken, apiProvider) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return apiCredentialsManager.hasCredentials(validation.userId, apiProvider);
  } catch (error) {
    console.error('Failed to check credentials:', error);
    throw error;
  }
});

ipcMain.handle('credentials:validate', async (event, apiProvider, credentials) => {
  try {
    const result = await apiCredentialsManager.validateCredentials(apiProvider, credentials);
    
    // If validation successful, the Breeze client is now initialized and ready to use
    if (result.success) {
      console.log('✓ Breeze client initialized and ready for API calls');
    }
    
    return result;
  } catch (error) {
    console.error('Failed to validate credentials:', error);
    throw error;
  }
});

// Initialize Breeze client with saved credentials
ipcMain.handle('credentials:initialize-breeze', async (event, sessionToken, masterPassword) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    await apiCredentialsManager.initializeBreezeClient(validation.userId, masterPassword);
    console.log('✓ Breeze client initialized from saved credentials');
    
    return { success: true, message: 'Breeze client initialized successfully' };
  } catch (error) {
    console.error('Failed to initialize Breeze client:', error);
    throw error;
  }
});

// Transaction IPC handlers
ipcMain.handle('transactions:add', async (event, sessionToken, transaction) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    if (transaction.type === 'buy') {
      return await transactionManager.addBuyTransaction(
        validation.userId,
        transaction.stockId,
        transaction.quantity,
        transaction.price,
        transaction.transactionDate,
        transaction.notes
      );
    } else if (transaction.type === 'sell') {
      return await transactionManager.addSellTransaction(
        validation.userId,
        transaction.stockId,
        transaction.quantity,
        transaction.price,
        transaction.transactionDate,
        transaction.notes
      );
    } else {
      throw new Error('Invalid transaction type');
    }
  } catch (error) {
    console.error('Failed to add transaction:', error);
    throw error;
  }
});

ipcMain.handle('transactions:update', async (event, sessionToken, transactionId, updates) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await transactionManager.updateTransaction(transactionId, updates);
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw error;
  }
});

ipcMain.handle('transactions:delete', async (event, sessionToken, transactionId) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await transactionManager.deleteTransaction(transactionId);
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
});

ipcMain.handle('transactions:get-all', async (event, sessionToken, filters) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return transactionManager.getTransactions(validation.userId, filters);
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
});

ipcMain.handle('transactions:get-by-id', async (event, sessionToken, transactionId) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return transactionManager.getTransactionById(transactionId);
  } catch (error) {
    console.error('Failed to get transaction:', error);
    throw error;
  }
});

ipcMain.handle('transactions:get-portfolio-summary', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return transactionManager.getPortfolioSummary(validation.userId);
  } catch (error) {
    console.error('Failed to get portfolio summary:', error);
    throw error;
  }
});

// Stock IPC handlers
ipcMain.handle('stocks:create', async (event, sessionToken, stock) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await stockManager.createStock(
      stock.symbol,
      stock.name,
      stock.exchange || 'BSE',
      stock.sector,
      stock.isin
    );
  } catch (error) {
    console.error('Failed to create stock:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-by-symbol', async (event, sessionToken, symbol, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getStockBySymbol(symbol, exchange || 'BSE');
  } catch (error) {
    console.error('Failed to get stock:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-by-id', async (event, sessionToken, stockId) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getStockById(stockId);
  } catch (error) {
    console.error('Failed to get stock:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-all', async (event, sessionToken, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getAllStocks(exchange);
  } catch (error) {
    console.error('Failed to get all stocks:', error);
    throw error;
  }
});

ipcMain.handle('stocks:search', async (event, sessionToken, searchTerm, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.searchStocks(searchTerm, exchange);
  } catch (error) {
    console.error('Failed to search stocks:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-by-sector', async (event, sessionToken, sector, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getStocksBySector(sector, exchange);
  } catch (error) {
    console.error('Failed to get stocks by sector:', error);
    throw error;
  }
});

ipcMain.handle('stocks:update', async (event, sessionToken, stockId, updates) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await stockManager.updateStock(stockId, updates);
  } catch (error) {
    console.error('Failed to update stock:', error);
    throw error;
  }
});

ipcMain.handle('stocks:delete', async (event, sessionToken, stockId) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await stockManager.deleteStock(stockId);
  } catch (error) {
    console.error('Failed to delete stock:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-all-sectors', async (event, sessionToken, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getAllSectors(exchange);
  } catch (error) {
    console.error('Failed to get sectors:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-count', async (event, sessionToken, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getStockCount(exchange);
  } catch (error) {
    console.error('Failed to get stock count:', error);
    throw error;
  }
});

ipcMain.handle('stocks:bulk-create', async (event, sessionToken, stocks) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await stockManager.bulkCreateStocks(stocks);
  } catch (error) {
    console.error('Failed to bulk create stocks:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-info', async (event, sessionToken, stockId) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getStockInfo(stockId);
  } catch (error) {
    console.error('Failed to get stock info:', error);
    throw error;
  }
});

ipcMain.handle('stocks:get-all-with-info', async (event, sessionToken, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return stockManager.getAllStocksWithInfo(exchange);
  } catch (error) {
    console.error('Failed to get all stocks with info:', error);
    throw error;
  }
});

// Price/API IPC handlers
ipcMain.handle('prices:get-price', async (event, sessionToken, symbol, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return await priceManager.getPriceWithFallback(symbol, exchange || 'BSE');
  } catch (error) {
    console.error('Failed to get price:', error);
    throw error;
  }
});

ipcMain.handle('prices:get-cached-price', async (event, sessionToken, symbol, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return priceManager.getCachedPrice(symbol, exchange || 'BSE');
  } catch (error) {
    console.error('Failed to get cached price:', error);
    throw error;
  }
});

ipcMain.handle('prices:get-cached-prices', async (event, sessionToken, symbols, exchange) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return priceManager.getCachedPrices(symbols, exchange || 'BSE');
  } catch (error) {
    console.error('Failed to get cached prices:', error);
    throw error;
  }
});

ipcMain.handle('prices:start-auto-update', async (event, sessionToken, symbols) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    priceManager.startAutoUpdate(symbols);
    return { success: true, message: 'Price auto-update started' };
  } catch (error) {
    console.error('Failed to start auto-update:', error);
    throw error;
  }
});

ipcMain.handle('prices:stop-auto-update', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    priceManager.stopAutoUpdate();
    return { success: true, message: 'Price auto-update stopped' };
  } catch (error) {
    console.error('Failed to stop auto-update:', error);
    throw error;
  }
});

ipcMain.handle('prices:get-status', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return priceManager.getStatus();
  } catch (error) {
    console.error('Failed to get price manager status:', error);
    throw error;
  }
});

ipcMain.handle('prices:get-market-hours', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return breezeClient.getMarketTimeInfo();
  } catch (error) {
    console.error('Failed to get market hours info:', error);
    throw error;
  }
});

// Portfolio IPC handlers
ipcMain.handle('portfolio:get-with-gains', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getPortfolioWithGains(validation.userId);
  } catch (error) {
    console.error('Failed to get portfolio with gains:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-sector-breakdown', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getSectorBreakdown(validation.userId);
  } catch (error) {
    console.error('Failed to get sector breakdown:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-allocation', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getPortfolioAllocation(validation.userId);
  } catch (error) {
    console.error('Failed to get portfolio allocation:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-top-gainers', async (event, sessionToken, limit) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getTopGainers(validation.userId, limit || 5);
  } catch (error) {
    console.error('Failed to get top gainers:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-top-losers', async (event, sessionToken, limit) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getTopLosers(validation.userId, limit || 5);
  } catch (error) {
    console.error('Failed to get top losers:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-realized-gains', async (event, sessionToken, financialYear) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getRealizedGainsByYear(validation.userId, financialYear);
  } catch (error) {
    console.error('Failed to get realized gains:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-performance-metrics', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getPerformanceMetrics(validation.userId);
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    throw error;
  }
});

ipcMain.handle('portfolio:get-dashboard-summary', async (event, sessionToken) => {
  try {
    const validation = authenticationService.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error('Invalid session');
    }

    return portfolioCalculator.getDashboardSummary(validation.userId);
  } catch (error) {
    console.error('Failed to get dashboard summary:', error);
    throw error;
  }
});

// File Dialog IPC handlers
ipcMain.handle('dialog:open-file', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Failed to open file dialog:', error);
    throw error;
  }
});

ipcMain.handle('dialog:save-file', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Failed to open save dialog:', error);
    throw error;
  }
});

ipcMain.handle('dialog:show-message', async (event, options) => {
  try {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Failed to show message dialog:', error);
    throw error;
  }
});

// Price update event broadcasting
priceManager.on('priceUpdate', (quote) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('price-update', quote);
  }
});

priceManager.on('updateSuccess', (data) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('price-update-success', data);
  }
});

priceManager.on('updateError', (error) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('price-update-error', { message: error.message });
  }
});

// Portfolio update event broadcasting
transactionManager.on('portfolioUpdate', (data) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('portfolio-update', data);
  }
});

// BSE Data Status IPC handler
ipcMain.handle('bse:get-status', async (event) => {
  try {
    const isReady = stockLookupService.isReady();
    const unmappedCodes = stockLookupService.getUnmappedCodes();
    
    return {
      loaded: isReady,
      totalRecords: isReady ? stockLookupService.scripCodeIndex.size : 0,
      unmappedCount: unmappedCodes.length,
      unmappedCodes: unmappedCodes
    };
  } catch (error) {
    console.error('Failed to get BSE status:', error);
    throw error;
  }
});

// Export stock lookup service for use by other modules
module.exports = {
  stockLookupService
};

console.log('Stock Portfolio Manager - Main process started');