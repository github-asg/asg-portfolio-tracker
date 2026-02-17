import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import CurrencyDisplay from '../Common/CurrencyDisplay';
import PercentageDisplay from '../Common/PercentageDisplay';
import GainLossIndicator from '../Common/GainLossIndicator';
import LoadingSpinner from '../Common/LoadingSpinner';
import './PortfolioSummary.css';

/**
 * PortfolioSummary Component
 * Displays portfolio overview with total investment, current value, and gains
 */
const PortfolioSummary = ({ refreshTrigger }) => {
  const { sessionToken } = useSession();
  const [portfolio, setPortfolio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bseDataCache, setBseDataCache] = useState({});

  useEffect(() => {
    fetchPortfolioData();

    // Set up price update listener
    const handlePriceUpdate = () => {
      fetchPortfolioData();
    };

    window.electronAPI.onPriceUpdate(handlePriceUpdate);

    return () => {
      window.electronAPI.removeAllListeners('price-update');
    };
  }, [sessionToken, refreshTrigger]);

  const fetchPortfolioData = async () => {
    try {
      setError(null);
      const data = await window.electronAPI.getPortfolioWithGains(sessionToken);
      setPortfolio(data);
      
      // Fetch BSE data for all stocks
      if (data && data.holdings && data.holdings.length > 0) {
        await fetchBseDataForHoldings(data.holdings);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBseDataForHoldings = async (holdings) => {
    const newBseCache = {};
    
    for (const holding of holdings) {
      const symbol = holding.symbol;
      
      // Skip if already cached
      if (bseDataCache[symbol]) {
        newBseCache[symbol] = bseDataCache[symbol];
        continue;
      }
      
      try {
        // Try lookup by code first
        const result = await window.electronAPI.lookupStockByCode(symbol);
        
        if (result.success && result.data) {
          newBseCache[symbol] = result.data;
        } else {
          // Try lookup by short name
          const shortNameResult = await window.electronAPI.lookupStockByShortName(symbol);
          
          if (shortNameResult.success && shortNameResult.data) {
            newBseCache[symbol] = shortNameResult.data;
          } else {
            // Mark as unmapped
            newBseCache[symbol] = null;
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch BSE data for ${symbol}:`, err);
        newBseCache[symbol] = null;
      }
    }
    
    setBseDataCache(newBseCache);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading portfolio..." />;
  }

  if (error) {
    return (
      <div className="portfolio-summary error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchPortfolioData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="portfolio-summary empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h3>No Portfolio Data</h3>
          <p>Start by adding your first transaction</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-summary">
      <div className="summary-grid">
        {/* Total Investment */}
        <div className="summary-card">
          <div className="card-header">
            <h3>Total Investment</h3>
            <span className="card-icon">💰</span>
          </div>
          <div className="card-value">
            <CurrencyDisplay value={portfolio.totalInvestment} />
          </div>
          <div className="card-meta">
            {portfolio.holdingCount} holdings
          </div>
        </div>

        {/* Current Value */}
        <div className="summary-card">
          <div className="card-header">
            <h3>Current Value</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">
            <CurrencyDisplay value={portfolio.currentValue} />
          </div>
          <div className="card-meta">
            {portfolio.pricesAsOf ? (
              <>Prices as of: {new Date(portfolio.pricesAsOf).toLocaleDateString()}</>
            ) : (
              <>Last updated: {new Date(portfolio.lastUpdated).toLocaleTimeString()}</>
            )}
          </div>
        </div>

        {/* Total Gain/Loss */}
        <div className="summary-card">
          <div className="card-header">
            <h3>Total Gain/Loss</h3>
            <span className="card-icon">
              {portfolio.totalGainLoss >= 0 ? '📊' : '📉'}
            </span>
          </div>
          <div className="card-value">
            <GainLossIndicator
              gainLoss={portfolio.totalGainLoss}
              gainLossPercent={portfolio.totalGainLossPercent}
              size="large"
            />
          </div>
          <div className="card-meta">
            <PercentageDisplay
              value={portfolio.totalGainLossPercent}
              decimals={2}
              showSign={true}
            />
          </div>
        </div>

        {/* Gain/Loss Breakdown */}
        <div className="summary-card">
          <div className="card-header">
            <h3>Holdings Status</h3>
            <span className="card-icon">📋</span>
          </div>
          <div className="card-breakdown">
            <div className="breakdown-item gain">
              <span className="breakdown-label">Gains</span>
              <span className="breakdown-count">{portfolio.gainCount}</span>
            </div>
            <div className="breakdown-item loss">
              <span className="breakdown-label">Losses</span>
              <span className="breakdown-count">{portfolio.lossCount}</span>
            </div>
            <div className="breakdown-item breakeven">
              <span className="breakdown-label">Breakeven</span>
              <span className="breakdown-count">{portfolio.breakevenCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      {portfolio.holdings && portfolio.holdings.length > 0 && (
        <div className="holdings-section">
          <h2>Holdings</h2>
          <div className="holdings-table-wrapper">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Current Price</th>
                  <th>Total Cost</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                  <th>Return %</th>
                  <th>52W Range</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((holding, idx) => {
                  const bseData = bseDataCache[holding.symbol];
                  const hasValidBseData = bseData && bseData.ScripName;
                  
                  return (
                    <tr key={idx} className="holding-row">
                      <td className="symbol">
                        {hasValidBseData ? (
                          <>
                            <strong>{bseData.ScripName}</strong>
                            <br />
                            <small className="bse-shortname">{bseData.ShortName}</small>
                            {bseData.ISINCode && (
                              <>
                                <br />
                                <small className="isin-code">ISIN: {bseData.ISINCode}</small>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>{holding.symbol}</strong>
                            <br />
                            <small className="unmapped-indicator">(unmapped)</small>
                          </>
                        )}
                      </td>
                      <td className="quantity">{holding.quantity}</td>
                      <td className="price">
                        <CurrencyDisplay value={holding.avgCost} decimals={2} />
                      </td>
                      <td className="price">
                        <CurrencyDisplay value={holding.currentPrice} decimals={2} />
                      </td>
                      <td className="currency">
                        <CurrencyDisplay value={holding.totalCost} />
                      </td>
                      <td className="currency">
                        <CurrencyDisplay value={holding.currentValue} />
                      </td>
                      <td className="gain-loss">
                        <GainLossIndicator
                          gainLoss={holding.gainLoss}
                          gainLossPercent={holding.gainLossPercent}
                          size="small"
                          showPercent={false}
                        />
                      </td>
                      <td className="percent">
                        <PercentageDisplay
                          value={holding.gainLossPercent}
                          decimals={2}
                          showSign={true}
                          showArrow={true}
                        />
                      </td>
                      <td className="week-52-range">
                        {hasValidBseData && (bseData['52WeeksHigh'] || bseData['52WeeksLow']) ? (
                          <div className="range-container">
                            {bseData['52WeeksHigh'] && (
                              <div className="range-high">
                                <span className="range-label">H:</span>
                                <CurrencyDisplay value={bseData['52WeeksHigh']} decimals={2} />
                              </div>
                            )}
                            {bseData['52WeeksLow'] && (
                              <div className="range-low">
                                <span className="range-label">L:</span>
                                <CurrencyDisplay value={bseData['52WeeksLow']} decimals={2} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSummary;
