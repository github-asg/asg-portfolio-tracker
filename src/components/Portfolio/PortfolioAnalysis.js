import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import CurrencyDisplay from '../Common/CurrencyDisplay';
import PercentageDisplay from '../Common/PercentageDisplay';
import GainLossIndicator from '../Common/GainLossIndicator';
import LoadingSpinner from '../Common/LoadingSpinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './PortfolioAnalysis.css';

/**
 * PortfolioAnalysis Component
 * Displays sector breakdown and portfolio analysis
 */
const PortfolioAnalysis = ({ refreshTrigger }) => {
  const { sessionToken } = useSession();
  const [sectorData, setSectorData] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];

  useEffect(() => {
    fetchAnalysisData();

    // Set up price update listener
    const handlePriceUpdate = () => {
      fetchAnalysisData();
    };

    window.electronAPI.onPriceUpdate(handlePriceUpdate);

    return () => {
      window.electronAPI.removeAllListeners('price-update');
    };
  }, [sessionToken, refreshTrigger]);

  const fetchAnalysisData = async () => {
    try {
      setError(null);
      const [sectorBreakdown, portfolioAllocation, gainers, losers] = await Promise.all([
        window.electronAPI.getSectorBreakdown(sessionToken),
        window.electronAPI.getPortfolioAllocation(sessionToken),
        window.electronAPI.getTopGainers(sessionToken, 5),
        window.electronAPI.getTopLosers(sessionToken, 5)
      ]);

      setSectorData(sectorBreakdown);
      setAllocation(portfolioAllocation);
      setTopGainers(gainers);
      setTopLosers(losers);
    } catch (err) {
      console.error('Failed to fetch analysis data:', err);
      setError(err.message || 'Failed to load portfolio analysis');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading portfolio analysis..." />;
  }

  if (error) {
    return (
      <div className="portfolio-analysis error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchAnalysisData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-analysis">
      {/* Sector Breakdown */}
      {sectorData && sectorData.sectors && sectorData.sectors.length > 0 && (
        <div className="analysis-section">
          <h2>Sector Breakdown</h2>
          <div className="sector-content">
            <div className="sector-chart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectorData.sectors}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorData.sectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => <CurrencyDisplay value={value} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sector-details">
              <table className="sector-table">
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>Value</th>
                    <th>Allocation</th>
                    <th>Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorData.sectors.map((sector, idx) => (
                    <tr key={idx}>
                      <td className="sector-name">
                        <span className="sector-color" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {sector.name}
                      </td>
                      <td className="currency">
                        <CurrencyDisplay value={sector.value} />
                      </td>
                      <td className="percent">
                        <PercentageDisplay value={sector.allocation} decimals={1} />
                      </td>
                      <td className="gain-loss">
                        <GainLossIndicator
                          gainLoss={sector.gainLoss}
                          gainLossPercent={sector.gainLossPercent}
                          size="small"
                          showPercent={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Gainers and Losers */}
      <div className="analysis-section">
        <div className="gainers-losers-grid">
          {/* Top Gainers */}
          {topGainers && topGainers.length > 0 && (
            <div className="gainers-card">
              <h3>Top Gainers</h3>
              <div className="gainers-list">
                {topGainers.filter(stock => stock.gainLoss > 0).map((stock, idx) => (
                  <div key={idx} className="gainer-item">
                    <div className="gainer-header">
                      <span className="gainer-symbol">{stock.symbol}</span>
                      <span className="gainer-return">
                        <PercentageDisplay
                          value={stock.gainLossPercent}
                          decimals={2}
                          showSign={true}
                          showArrow={true}
                        />
                      </span>
                    </div>
                    <div className="gainer-details">
                      <span className="gainer-value">
                        <CurrencyDisplay value={stock.gainLoss} />
                      </span>
                      <span className="gainer-qty">{stock.quantity} shares</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Losers */}
          {topLosers && topLosers.length > 0 && (
            <div className="losers-card">
              <h3>Top Losers</h3>
              <div className="losers-list">
                {topLosers.filter(stock => stock.gainLoss < 0).map((stock, idx) => (
                  <div key={idx} className="loser-item">
                    <div className="loser-header">
                      <span className="loser-symbol">{stock.symbol}</span>
                      <span className="loser-return">
                        <PercentageDisplay
                          value={stock.gainLossPercent}
                          decimals={2}
                          showSign={true}
                          showArrow={true}
                        />
                      </span>
                    </div>
                    <div className="loser-details">
                      <span className="loser-value">
                        <CurrencyDisplay value={stock.gainLoss} />
                      </span>
                      <span className="loser-qty">{stock.quantity} shares</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PortfolioAnalysis);
