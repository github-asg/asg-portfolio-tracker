-- Stock Portfolio Manager Database Schema
-- SQLite database for storing all portfolio data locally

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Stocks master data table
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    isin TEXT,
    exchange TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
    sector TEXT,
    industry TEXT,
    stock_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for buy/sell records
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    charges DECIMAL(10,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id)
);

-- Realized gains table for FIFO calculation results
CREATE TABLE IF NOT EXISTS realized_gains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sell_transaction_id INTEGER NOT NULL,
    buy_transaction_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    buy_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    buy_date DATE NOT NULL,
    sell_date DATE NOT NULL,
    holding_period INTEGER NOT NULL,
    gain_amount DECIMAL(10,2) NOT NULL,
    gain_type TEXT NOT NULL CHECK (gain_type IN ('STCG', 'LTCG')),
    tax_rate DECIMAL(5,2) NOT NULL,
    financial_year TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sell_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (buy_transaction_id) REFERENCES transactions(id)
);

-- Price cache table for API data
CREATE TABLE IF NOT EXISTS price_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT 'NSE',
    price DECIMAL(10,2) NOT NULL,
    bid DECIMAL(10,2),
    ask DECIMAL(10,2),
    high DECIMAL(10,2),
    low DECIMAL(10,2),
    open DECIMAL(10,2),
    close DECIMAL(10,2),
    volume INTEGER,
    change DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API settings table for encrypted credentials
CREATE TABLE IF NOT EXISTS api_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_connected DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, provider)
);

-- App settings table for configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_realized_gains_user_id ON realized_gains(user_id);
CREATE INDEX IF NOT EXISTS idx_realized_gains_financial_year ON realized_gains(financial_year);
CREATE INDEX IF NOT EXISTS idx_realized_gains_symbol ON realized_gains(symbol);

CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_price_cache_exchange ON price_cache(exchange);
CREATE INDEX IF NOT EXISTS idx_price_cache_updated_at ON price_cache(updated_at);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES 
    ('db_version', '1.0.0'),
    ('app_initialized', 'false'),
    ('default_currency', 'INR'),
    ('date_format', 'DD-MMM-YYYY'),
    ('number_format', 'indian'),
    ('session_timeout', '1800000'),
    ('auto_refresh_interval', '300000'),
    ('market_hours_start', '09:15'),
    ('market_hours_end', '15:30'),
    ('financial_year_start_month', '4');

-- Insert default stock sectors for dropdown
INSERT OR IGNORE INTO app_settings (key, value) VALUES 
    ('stock_sectors', 'Banking & Financial Services,Technology & IT Services,Pharmaceuticals & Healthcare,Fast Moving Consumer Goods (FMCG),Automobiles & Auto Components,Energy & Power,Metals & Mining,Real Estate & Infrastructure,Telecommunications,Media & Entertainment,Consumer Durables,Chemicals,Others');

-- Insert sample stocks for testing (optional)
INSERT OR IGNORE INTO stocks (symbol, company_name, exchange, sector, industry) VALUES 
    ('RELIANCE', 'Reliance Industries Ltd', 'NSE', 'Energy & Power', 'Oil & Gas'),
    ('TCS', 'Tata Consultancy Services', 'NSE', 'Technology & IT Services', 'IT Services'),
    ('INFY', 'Infosys Limited', 'NSE', 'Technology & IT Services', 'IT Services'),
    ('HDFCBANK', 'HDFC Bank Ltd', 'NSE', 'Banking & Financial Services', 'Private Bank'),
    ('ICICIBANK', 'ICICI Bank Ltd', 'NSE', 'Banking & Financial Services', 'Private Bank'),
    ('HINDUNILVR', 'Hindustan Unilever Ltd', 'NSE', 'Fast Moving Consumer Goods (FMCG)', 'Consumer Goods'),
    ('ITC', 'ITC Ltd', 'NSE', 'Fast Moving Consumer Goods (FMCG)', 'Diversified'),
    ('SBIN', 'State Bank of India', 'NSE', 'Banking & Financial Services', 'Public Bank'),
    ('BHARTIARTL', 'Bharti Airtel Ltd', 'NSE', 'Telecommunications', 'Telecom Services'),
    ('KOTAKBANK', 'Kotak Mahindra Bank Ltd', 'NSE', 'Banking & Financial Services', 'Private Bank');