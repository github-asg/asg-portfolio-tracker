import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import PortfolioSummary from '../components/Portfolio/PortfolioSummary';
import PortfolioAnalysis from '../components/Portfolio/PortfolioAnalysis';
import './Portfolio.css';

/**
 * Portfolio Page
 * Main portfolio page showing portfolio overview and key metrics with live price refresh
 */
const Portfolio = () => {
  const { sessionToken } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshPrices = async () => {
    try {
      setIsRefreshing(true);
      setRefreshMessage('');

      // Get the current portfolio to extract symbols
      const portfolio = await window.electronAPI.getPortfolioWithGains(sessionToken);
      
      if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) {
        setRefreshMessage('No holdings found to refresh prices for');
        return;
      }

      // Extract unique symbols from holdings
      const symbols = [...new Set(portfolio.holdings.map(holding => holding.symbol))];
      
      if (symbols.length === 0) {
        setRefreshMessage('No symbols found to refresh');
        return;
      }

      // Get fresh prices for all symbols
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        setRefreshMessage(`Refreshing prices... ${i + 1}/${symbols.length}`);
        
        try {
          await window.electronAPI.getPrice(sessionToken, symbol, 'BSE');
          successCount++;
        } catch (error) {
          console.warn(`Failed to refresh price for ${symbol}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setRefreshMessage(`✓ Refreshed prices for ${successCount} stocks${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        // Trigger portfolio refresh
        setRefreshTrigger(prev => prev + 1);
      } else {
        setRefreshMessage(`✗ Failed to refresh prices for all ${symbols.length} stocks`);
      }

      // Clear message after 5 seconds
      setTimeout(() => setRefreshMessage(''), 5000);

    } catch (error) {
      console.error('Failed to refresh prices:', error);
      setRefreshMessage('✗ Failed to refresh prices: ' + error.message);
      setTimeout(() => setRefreshMessage(''), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div className="header-content">
          <h1>Portfolio</h1>
          <p>Real-time portfolio overview and performance metrics</p>
        </div>
        <div className="header-actions">
          <button
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            title="Refresh live prices for all holdings"
          >
            <span className="refresh-icon">🔄</span>
            <span className="refresh-text">
              {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
            </span>
          </button>
        </div>
      </div>

      {refreshMessage && (
        <div className={`refresh-message ${refreshMessage.startsWith('✓') ? 'success' : refreshMessage.startsWith('✗') ? 'error' : 'info'}`}>
          {isRefreshing && refreshMessage.includes('Refreshing') && (
            <span className="refresh-spinner">⏳</span>
          )}
          {refreshMessage}
        </div>
      )}

      <div className="portfolio-content">
        <PortfolioSummary refreshTrigger={refreshTrigger} />
        <PortfolioAnalysis refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default Portfolio;