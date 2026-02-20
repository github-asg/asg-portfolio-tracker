import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useSession } from '../../context/SessionContext';
import { getStockAgeDistribution, getPortfolioAgeDistribution } from '../../utils/api/stockAgeHistogramAPI';
import './StockAgeHistogram.css';

// Color constants for tax classification
const STCG_COLOR = '#FF6B6B'; // Red/Orange for Short Term Capital Gains (< 12 months)
const LTCG_COLOR = '#51CF66'; // Green for Long Term Capital Gains (>= 12 months)

// Bucket to color mapping
const BUCKET_COLORS = {
  '0-6 months': STCG_COLOR,
  '6-12 months': STCG_COLOR,
  '1-2 years': LTCG_COLOR,
  '2-5 years': LTCG_COLOR,
  '5+ years': LTCG_COLOR
};

/**
 * StockAgeHistogram Component
 * Displays age distribution of stock holdings as a histogram
 * Supports both individual stock view and portfolio-wide view
 */
const StockAgeHistogram = ({ stockSymbol = null, viewMode = 'portfolio' }) => {
  const { sessionToken } = useSession();
  const [distributionData, setDistributionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDistributionData();
  }, [stockSymbol, viewMode, sessionToken]);

  const loadDistributionData = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      if (viewMode === 'stock' && stockSymbol) {
        data = await getStockAgeDistribution(sessionToken, stockSymbol);
      } else {
        data = await getPortfolioAgeDistribution(sessionToken);
      }

      setDistributionData(data);
    } catch (err) {
      console.error('Failed to load distribution data:', err);
      setError(err.message || 'Failed to load age distribution');
    } finally {
      setLoading(false);
    }
  };

  const formatIndianNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="histogram-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-quantity">Quantity: {formatIndianNumber(data.quantity)}</p>
          <p className="tooltip-percentage">Percentage: {data.percentage.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="histogram-container">
        <div className="histogram-loading">
          <div className="loading-spinner"></div>
          <p>Loading age distribution...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="histogram-container">
        <div className="histogram-error">
          <p className="error-icon">⚠️</p>
          <p className="error-message">{error}</p>
          <button onClick={loadDistributionData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!distributionData || distributionData.totalQuantity === 0) {
    const emptyMessage = viewMode === 'stock' 
      ? 'No current holdings for this stock'
      : 'No stocks in portfolio';
    
    return (
      <div className="histogram-container">
        <div className="histogram-empty">
          <p className="empty-icon">📊</p>
          <p className="empty-message">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = distributionData.buckets.map(bucket => ({
    name: bucket.name,
    quantity: bucket.quantity,
    percentage: bucket.percentage
  }));

  return (
    <div className="histogram-container">
      {/* Summary Section */}
      <div className="histogram-summary">
        {viewMode === 'portfolio' && (
          <>
            <div className="summary-item">
              <span className="summary-label">Total Stocks:</span>
              <span className="summary-value">{distributionData.totalStocks}</span>
            </div>
            <div className="summary-divider">|</div>
          </>
        )}
        <div className="summary-item">
          <span className="summary-label">Total Quantity:</span>
          <span className="summary-value">{formatIndianNumber(distributionData.totalQuantity)}</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="histogram-chart">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
              tickFormatter={formatIndianNumber}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              content={() => (
                <div className="histogram-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: STCG_COLOR }}></span>
                    <span className="legend-text">STCG (&lt; 12 months)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: LTCG_COLOR }}></span>
                    <span className="legend-text">LTCG (≥ 12 months)</span>
                  </div>
                </div>
              )}
            />
            <Bar dataKey="quantity" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockAgeHistogram;
