import React from 'react';
import PortfolioSummary from '../Portfolio/PortfolioSummary';
import PortfolioAnalysis from '../Portfolio/PortfolioAnalysis';
import './Dashboard.css';

/**
 * Dashboard Component
 * Main dashboard page showing portfolio overview and key metrics
 */
const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Portfolio Dashboard</h1>
        <p>Real-time portfolio overview and performance metrics</p>
      </div>

      <div className="dashboard-content">
        <PortfolioSummary />
        <PortfolioAnalysis />
      </div>
    </div>
  );
};

export default Dashboard;
