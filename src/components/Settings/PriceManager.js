import React, { useState, useEffect } from 'react';
import './PriceManager.css';

/**
 * PriceManager Component
 * Manages live price updates and displays price manager status
 */
const PriceManager = ({ sessionToken }) => {
  const [status, setStatus] = useState(null);
  const [marketInfo, setMarketInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [symbols, setSymbols] = useState('');
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    loadStatus();
    loadMarketInfo();
    
    // Set up event listeners for price updates
    const handlePriceUpdate = (quote) => {
      setRecentUpdates(prev => [
        {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9) // Keep only last 10 updates
      ]);
    };

    const handleUpdateSuccess = (data) => {
      setMessage(`✓ Successfully updated ${data.count} prices`);
      setTimeout(() => setMessage(null), 3000);
    };

    const handleUpdateError = (error) => {
      setError(`✗ Price update failed: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    };

    // Add event listeners
    window.electronAPI.onPriceUpdate(handlePriceUpdate);
    window.electronAPI.onPriceUpdateSuccess(handleUpdateSuccess);
    window.electronAPI.onPriceUpdateError(handleUpdateError);

    // Refresh status every 30 seconds
    const statusInterval = setInterval(loadStatus, 30000);

    return () => {
      clearInterval(statusInterval);
      // Remove event listeners
      window.electronAPI.removeAllListeners('price-update');
      window.electronAPI.removeAllListeners('price-update-success');
      window.electronAPI.removeAllListeners('price-update-error');
    };
  }, [sessionToken]);

  const loadStatus = async () => {
    try {
      const statusData = await window.electronAPI.getPriceManagerStatus(sessionToken);
      setStatus(statusData);
    } catch (err) {
      console.error('Failed to load price manager status:', err);
    }
  };

  const loadMarketInfo = async () => {
    try {
      const marketData = await window.electronAPI.getMarketHours(sessionToken);
      setMarketInfo(marketData);
    } catch (err) {
      console.error('Failed to load market info:', err);
    }
  };

  const handleStartAutoUpdate = async () => {
    if (!symbols.trim()) {
      setError('Please enter at least one stock symbol');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      
      if (symbolList.length === 0) {
        setError('Please enter valid stock symbols');
        return;
      }

      await window.electronAPI.startPriceAutoUpdate(sessionToken, symbolList);
      setMessage(`✓ Started price updates for ${symbolList.length} symbols`);
      
      // Refresh status
      setTimeout(loadStatus, 1000);
    } catch (err) {
      setError(err.message || 'Failed to start price updates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAutoUpdate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      await window.electronAPI.stopPriceAutoUpdate(sessionToken);
      setMessage('✓ Stopped price updates');
      
      // Refresh status
      setTimeout(loadStatus, 1000);
    } catch (err) {
      setError(err.message || 'Failed to stop price updates');
    } finally {
      setIsLoading(false);
    }
  };

  const formatInterval = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusColor = (isRunning) => {
    return isRunning ? '#10b981' : '#6b7280';
  };

  const getMarketStatusColor = (marketStatus) => {
    switch (marketStatus) {
      case 'open': return '#10b981';
      case 'pre-market': return '#f59e0b';
      case 'post-market': return '#f59e0b';
      case 'closed': return '#ef4444';
      case 'weekend': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="price-manager">
      <div className="manager-section">
        <h2>Live Price Updates</h2>
        <p className="section-description">
          Configure automatic price updates for your portfolio stocks. 
          Prices are updated based on market hours and cached locally.
        </p>

        {/* Status Cards */}
        <div className="status-cards">
          <div className="status-card">
            <div className="status-header">
              <span className="status-label">Price Manager</span>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(status?.isRunning) }}
              />
            </div>
            <div className="status-value">
              {status?.isRunning ? 'Running' : 'Stopped'}
            </div>
            {status?.failureCount > 0 && (
              <div className="status-detail error">
                {status.failureCount} failures (max: {status.maxFailures})
              </div>
            )}
          </div>

          <div className="status-card">
            <div className="status-header">
              <span className="status-label">Market Status</span>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getMarketStatusColor(marketInfo?.status) }}
              />
            </div>
            <div className="status-value">
              {marketInfo?.status || 'Unknown'}
            </div>
            {marketInfo?.nextChange && (
              <div className="status-detail">
                Next: {marketInfo.nextChange}
              </div>
            )}
          </div>

          <div className="status-card">
            <div className="status-header">
              <span className="status-label">Update Interval</span>
            </div>
            <div className="status-value">
              {status?.isRunning ? (
                marketInfo?.isOpen ? 
                  formatInterval(status.marketHoursInterval) : 
                  formatInterval(status.offHoursInterval)
              ) : 'N/A'}
            </div>
            <div className="status-detail">
              Market: {status ? formatInterval(status.marketHoursInterval) : 'N/A'} | 
              Off-hours: {status ? formatInterval(status.offHoursInterval) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="manager-controls">
          <div className="control-group">
            <label htmlFor="symbols">Stock Symbols</label>
            <input
              type="text"
              id="symbols"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="Enter symbols separated by commas (e.g., RELIANCE, TCS, INFY)"
              disabled={isLoading}
            />
            <small>Enter NSE stock symbols separated by commas</small>
          </div>

          <div className="control-actions">
            <button
              className="btn btn-primary"
              onClick={handleStartAutoUpdate}
              disabled={isLoading || status?.isRunning}
            >
              {isLoading ? 'Starting...' : 'Start Auto Updates'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleStopAutoUpdate}
              disabled={isLoading || !status?.isRunning}
            >
              {isLoading ? 'Stopping...' : 'Stop Auto Updates'}
            </button>
            <button
              className="btn btn-outline"
              onClick={loadStatus}
              disabled={isLoading}
            >
              Refresh Status
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <div className="recent-updates">
            <h3>Recent Price Updates</h3>
            <div className="updates-list">
              {recentUpdates.map((update, index) => (
                <div key={index} className="update-item">
                  <div className="update-symbol">{update.symbol}</div>
                  <div className="update-price">₹{update.price?.toFixed(2)}</div>
                  <div className={`update-change ${update.change >= 0 ? 'positive' : 'negative'}`}>
                    {update.change >= 0 ? '+' : ''}{update.change?.toFixed(2)} 
                    ({update.changePercent >= 0 ? '+' : ''}{update.changePercent?.toFixed(2)}%)
                  </div>
                  <div className="update-time">{update.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Hours Info */}
        {marketInfo && (
          <div className="market-info">
            <h3>Market Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Current Status:</span>
                <span className="info-value" style={{ color: getMarketStatusColor(marketInfo.status) }}>
                  {marketInfo.status}
                </span>
              </div>
              {marketInfo.isOpen !== undefined && (
                <div className="info-item">
                  <span className="info-label">Market Open:</span>
                  <span className="info-value">{marketInfo.isOpen ? 'Yes' : 'No'}</span>
                </div>
              )}
              {marketInfo.nextChange && (
                <div className="info-item">
                  <span className="info-label">Next Change:</span>
                  <span className="info-value">{marketInfo.nextChange}</span>
                </div>
              )}
              {marketInfo.timeToNext && (
                <div className="info-item">
                  <span className="info-label">Time to Next:</span>
                  <span className="info-value">{marketInfo.timeToNext}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Status */}
        {status?.apiStatus && (
          <div className="api-status">
            <h3>API Connection Status</h3>
            <div className="status-details">
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value ${status.apiStatus.connected ? 'success' : 'error'}`}>
                  {status.apiStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {status.apiStatus.lastError && (
                <div className="detail-item">
                  <span className="detail-label">Last Error:</span>
                  <span className="detail-value error">{status.apiStatus.lastError}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceManager;