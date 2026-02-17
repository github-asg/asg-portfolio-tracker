import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import CurrencyDisplay from '../Common/CurrencyDisplay';
import './TransactionForm.css';

/**
 * TransactionForm Component
 * Form for adding buy/sell transactions with validation
 */
const TransactionForm = ({ onSuccess, onCancel }) => {
  const { sessionToken } = useSession();
  const [transactionType, setTransactionType] = useState('buy');
  const [formData, setFormData] = useState({
    stockId: '',
    quantity: '',
    price: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [bseSearchResults, setBseSearchResults] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // Search BSE Scrip Master when search term changes (with debounce)
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchBseStocks(searchTerm);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    } else {
      setBseSearchResults([]);
      setStocksLoading(false);
    }
  }, [searchTerm]);

  // Fetch available quantity for sell transactions
  useEffect(() => {
    if (transactionType === 'sell' && formData.stockId) {
      fetchAvailableQuantity();
    }
  }, [transactionType, formData.stockId, sessionToken]);

  const searchBseStocks = async (term) => {
    try {
      setStocksLoading(true);
      const result = await window.electronAPI.searchStocksByName(term, 20);
      if (result.success) {
        setBseSearchResults(result.data || []);
      } else {
        console.error('BSE search failed:', result.error);
        setBseSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to search BSE stocks:', error);
      setBseSearchResults([]);
    } finally {
      setStocksLoading(false);
    }
  };

  const fetchAvailableQuantity = async () => {
    try {
      const portfolio = await window.electronAPI.getPortfolioSummary(sessionToken);
      const holding = portfolio.holdings.find(h => h.id === parseInt(formData.stockId));
      setAvailableQuantity(holding ? holding.quantity : 0);
    } catch (error) {
      console.error('Failed to fetch available quantity:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.stockId) {
      newErrors.stockId = 'Please select a stock';
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (transactionType === 'sell' && parseFloat(formData.quantity) > availableQuantity) {
      newErrors.quantity = `Cannot sell more than ${availableQuantity} shares`;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required';
    }

    const txDate = new Date(formData.transactionDate);
    if (txDate > new Date()) {
      newErrors.transactionDate = 'Transaction date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleStockSelect = async (bseStock) => {
    try {
      // First, check if this stock already exists in the database
      let dbStock = null;
      
      try {
        dbStock = await window.electronAPI.getStockBySymbol(sessionToken, bseStock.ShortName, 'BSE');
      } catch (error) {
        // Stock not found in database - this is expected for new stocks
        console.log('Stock not in database, will create:', bseStock.ShortName);
      }
      
      // If not found, create it
      if (!dbStock) {
        // Call createStock with individual parameters, not an object
        const createResult = await window.electronAPI.createStock(
          sessionToken,
          {
            symbol: bseStock.ShortName,
            name: bseStock.ScripName,
            exchange: 'BSE',
            sector: bseStock.Group || 'Others',
            isin: bseStock.ISINCode || null
          }
        );
        
        if (createResult.id) {
          dbStock = {
            id: createResult.id,
            symbol: createResult.symbol,
            company_name: createResult.name,
            exchange: createResult.exchange
          };
        } else {
          throw new Error('Failed to create stock in database');
        }
      }
      
      // Set the selected stock with database ID
      setSelectedStock({
        id: dbStock.id,
        symbol: dbStock.symbol || bseStock.ShortName,
        name: dbStock.company_name || bseStock.ScripName,
        isin: bseStock.ISINCode
      });
      
      setFormData(prev => ({
        ...prev,
        stockId: dbStock.id.toString()
      }));
      
      setShowStockDropdown(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error selecting stock:', error);
      setGeneralError('Failed to select stock: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const transaction = {
        type: transactionType,
        stockId: parseInt(formData.stockId),
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        transactionDate: formData.transactionDate,
        notes: formData.notes || null
      };

      const result = await window.electronAPI.addTransaction(sessionToken, transaction);

      if (result.success || result.id) {
        // Reset form
        setFormData({
          stockId: '',
          quantity: '',
          price: '',
          transactionDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setSelectedStock(null);
        setErrors({});

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        setGeneralError(result.error || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      setGeneralError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = formData.quantity && formData.price
    ? parseFloat(formData.quantity) * parseFloat(formData.price)
    : 0;

  return (
    <div className="transaction-form-container">
      <div className="form-header">
        <h2>Add Transaction</h2>
        <div className="transaction-type-toggle">
          <button
            className={`type-btn ${transactionType === 'buy' ? 'active' : ''}`}
            onClick={() => {
              setTransactionType('buy');
              setFormData(prev => ({ ...prev, quantity: '', price: '' }));
            }}
          >
            Buy
          </button>
          <button
            className={`type-btn ${transactionType === 'sell' ? 'active' : ''}`}
            onClick={() => {
              setTransactionType('sell');
              setFormData(prev => ({ ...prev, quantity: '', price: '' }));
            }}
          >
            Sell
          </button>
        </div>
      </div>

      {generalError && (
        <div className="alert alert-error">
          <span className="alert-icon">✕</span>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="transaction-form">
        {/* Stock Selection */}
        <div className="form-group">
          <label htmlFor="stock">Stock *</label>
          <div className="stock-selector">
            <div className="stock-input-wrapper">
              {!selectedStock ? (
                <input
                  type="text"
                  placeholder="Search stock by symbol or name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowStockDropdown(true);
                  }}
                  onFocus={() => setShowStockDropdown(true)}
                  disabled={isLoading}
                  className={errors.stockId ? 'input-error' : ''}
                />
              ) : (
                <div className="selected-stock-display">
                  <div className="selected-stock-info">
                    <strong>{selectedStock.symbol}</strong> - {selectedStock.name}
                  </div>
                  <button
                    type="button"
                    className="clear-stock-btn"
                    onClick={() => {
                      setSelectedStock(null);
                      setFormData(prev => ({ ...prev, stockId: '' }));
                      setSearchTerm('');
                    }}
                    disabled={isLoading}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {showStockDropdown && !selectedStock && searchTerm.length >= 2 && (
              <div className="stock-dropdown">
                {stocksLoading ? (
                  <div className="dropdown-item loading">Searching BSE Scrip Master...</div>
                ) : bseSearchResults.length === 0 ? (
                  <div className="dropdown-item empty">
                    No stocks found. Try searching by company name or symbol.
                  </div>
                ) : (
                  bseSearchResults.map((stock, index) => (
                    <div
                      key={`${stock.ScripCode}-${index}`}
                      className="dropdown-item"
                      onClick={() => handleStockSelect(stock)}
                    >
                      <div className="stock-info">
                        <strong>{stock.ShortName}</strong>
                        <span className="stock-name">{stock.ScripName}</span>
                      </div>
                      <div className="stock-details">
                        {stock.ISINCode && (
                          <span className="stock-isin">ISIN: {stock.ISINCode}</span>
                        )}
                        {stock.Group && (
                          <span className="stock-sector">{stock.Group}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {showStockDropdown && !selectedStock && searchTerm.length > 0 && searchTerm.length < 2 && (
              <div className="stock-dropdown">
                <div className="dropdown-item empty">
                  Type at least 2 characters to search...
                </div>
              </div>
            )}
          </div>
          {errors.stockId && (
            <span className="field-error">{errors.stockId}</span>
          )}
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label htmlFor="quantity">
            Quantity *
            {transactionType === 'sell' && availableQuantity > 0 && (
              <span className="available-qty">
                Available: {availableQuantity}
              </span>
            )}
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleInputChange}
            placeholder="Enter quantity"
            step="0.01"
            min="0"
            disabled={isLoading}
            className={errors.quantity ? 'input-error' : ''}
          />
          {errors.quantity && (
            <span className="field-error">{errors.quantity}</span>
          )}
        </div>

        {/* Price */}
        <div className="form-group">
          <label htmlFor="price">Price per Share (₹) *</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            placeholder="Enter price"
            step="0.01"
            min="0"
            disabled={isLoading}
            className={errors.price ? 'input-error' : ''}
          />
          {errors.price && (
            <span className="field-error">{errors.price}</span>
          )}
        </div>

        {/* Transaction Date */}
        <div className="form-group">
          <label htmlFor="transactionDate">Transaction Date *</label>
          <input
            type="date"
            id="transactionDate"
            name="transactionDate"
            value={formData.transactionDate}
            onChange={handleInputChange}
            disabled={isLoading}
            className={errors.transactionDate ? 'input-error' : ''}
          />
          {errors.transactionDate && (
            <span className="field-error">{errors.transactionDate}</span>
          )}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Add any notes about this transaction..."
            rows="3"
            disabled={isLoading}
          />
        </div>

        {/* Summary */}
        {formData.quantity && formData.price && (
          <div className="transaction-summary">
            <div className="summary-row">
              <span>Total Amount:</span>
              <strong>
                <CurrencyDisplay value={totalAmount} />
              </strong>
            </div>
            {transactionType === 'sell' && (
              <div className="summary-row">
                <span>Remaining Quantity:</span>
                <strong>{Math.max(0, availableQuantity - parseFloat(formData.quantity))}</strong>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Adding...
              </>
            ) : (
              `Add ${transactionType === 'buy' ? 'Buy' : 'Sell'} Transaction`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
