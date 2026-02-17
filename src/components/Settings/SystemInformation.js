import React, { useState, useEffect } from 'react';
import './SystemInformation.css';

/**
 * SystemInformation Component
 * Displays system information and diagnostics
 */
const SystemInformation = ({ sessionToken }) => {
  const [dbStats, setDbStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [bseStatus, setBseStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUnmappedStocks, setShowUnmappedStocks] = useState(false);

  useEffect(() => {
    loadSystemInfo();
  }, [sessionToken]);

  const loadSystemInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get database stats
      const stats = await window.electronAPI.getDatabaseStats();
      setDbStats(stats);

      // Get health check
      const health = await window.electronAPI.healthCheckDatabase();
      setHealthStatus(health);

      // Get BSE data status
      const bse = await window.electronAPI.getBseStatus();
      setBseStatus(bse);
    } catch (err) {
      console.error('Failed to load system info:', err);
      setError(err.message || 'Failed to load system information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await window.electronAPI.optimizeDatabase();
      await loadSystemInfo();
    } catch (err) {
      console.error('Failed to optimize database:', err);
      setError(err.message || 'Failed to optimize database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIntegrity = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electronAPI.checkDatabaseIntegrity();
      if (result.valid) {
        alert('✓ Database integrity check passed');
      } else {
        alert('✗ Database integrity issues found: ' + result.message);
      }
    } catch (err) {
      console.error('Failed to check integrity:', err);
      setError(err.message || 'Failed to check database integrity');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !dbStats) {
    return (
      <div className="system-information">
        <div className="loading">Loading system information...</div>
      </div>
    );
  }

  return (
    <div className="system-information">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Application Info */}
      <div className="info-card">
        <h2>Application Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Application Name</span>
            <span className="value">Stock Portfolio Manager</span>
          </div>
          <div className="info-item">
            <span className="label">Version</span>
            <span className="value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="label">Platform</span>
            <span className="value">{process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'}</span>
          </div>
          <div className="info-item">
            <span className="label">Node Version</span>
            <span className="value">{process.version}</span>
          </div>
        </div>
      </div>

      {/* Database Information */}
      {dbStats && (
        <div className="info-card">
          <h2>Database Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Database Size</span>
              <span className="value">{(dbStats.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="info-item">
              <span className="label">Total Tables</span>
              <span className="value">{dbStats.tableCount || 0}</span>
            </div>
            <div className="info-item">
              <span className="label">Total Records</span>
              <span className="value">{dbStats.recordCount || 0}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Backup</span>
              <span className="value">{dbStats.lastBackup ? new Date(dbStats.lastBackup).toLocaleString() : 'Never'}</span>
            </div>
          </div>

          <div className="table-info">
            <h3>Table Details</h3>
            <div className="table-wrapper">
              <table className="info-table">
                <thead>
                  <tr>
                    <th>Table Name</th>
                    <th>Records</th>
                    <th>Size</th>
                  </tr>
                </thead>
                <tbody>
                  {dbStats.tables && dbStats.tables.map((table, idx) => (
                    <tr key={idx}>
                      <td>{table.name}</td>
                      <td>{table.count}</td>
                      <td>{(table.size / 1024).toFixed(2)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BSE Scrip Master Status */}
      {bseStatus && (
        <div className="info-card">
          <h2>BSE Scrip Master Data</h2>
          <div className={`health-status ${bseStatus.loaded ? 'healthy' : 'unhealthy'}`}>
            <span className="status-icon">{bseStatus.loaded ? '✓' : '✗'}</span>
            <div className="status-info">
              <h3>{bseStatus.loaded ? 'BSE Data Loaded' : 'BSE Data Not Loaded'}</h3>
              <p>{bseStatus.loaded ? 'Stock lookup and BSE API integration available' : 'BSE Scrip Master file not found or failed to load'}</p>
            </div>
          </div>

          {bseStatus.loaded && (
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Total Records</span>
                <span className="value">{bseStatus.totalRecords.toLocaleString('en-IN')}</span>
              </div>
              <div className="info-item">
                <span className="label">Unmapped Stocks</span>
                <span className="value">{bseStatus.unmappedCount}</span>
              </div>
            </div>
          )}

          {bseStatus.loaded && bseStatus.unmappedCount > 0 && (
            <div className="diagnostics-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowUnmappedStocks(!showUnmappedStocks)}
              >
                {showUnmappedStocks ? '🔼 Hide' : '🔽 View'} Unmapped Stocks
              </button>
            </div>
          )}

          {showUnmappedStocks && bseStatus.unmappedCodes && bseStatus.unmappedCodes.length > 0 && (
            <div className="unmapped-stocks-list">
              <h3>Unmapped Stock Codes</h3>
              <p className="info-text">
                These stock codes were not found in the BSE Scrip Master file. 
                They may be delisted, incorrectly entered, or from a different exchange.
              </p>
              <div className="unmapped-codes">
                {bseStatus.unmappedCodes.map((code, idx) => (
                  <span key={idx} className="unmapped-code">{code}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health Status */}
      {healthStatus && (
        <div className="info-card">
          <h2>Database Health</h2>
          <div className={`health-status ${healthStatus.healthy ? 'healthy' : 'unhealthy'}`}>
            <span className="status-icon">{healthStatus.healthy ? '✓' : '✗'}</span>
            <div className="status-info">
              <h3>{healthStatus.healthy ? 'Database is Healthy' : 'Database Issues Detected'}</h3>
              <p>{healthStatus.message}</p>
            </div>
          </div>

          {healthStatus.details && (
            <div className="health-details">
              <h3>Details</h3>
              <ul>
                {Object.entries(healthStatus.details).map(([key, value]) => (
                  <li key={key}>
                    <span className="detail-key">{key}:</span>
                    <span className="detail-value">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Diagnostics */}
      <div className="info-card">
        <h2>Diagnostics & Maintenance</h2>
        <div className="diagnostics-actions">
          <button
            className="btn btn-secondary"
            onClick={handleCheckIntegrity}
            disabled={isLoading}
          >
            🔍 Check Database Integrity
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleOptimizeDatabase}
            disabled={isLoading}
          >
            ⚡ Optimize Database
          </button>
        </div>

        <div className="diagnostics-info">
          <h3>Maintenance Information</h3>
          <ul>
            <li><strong>Integrity Check:</strong> Verifies database structure and data consistency</li>
            <li><strong>Optimize:</strong> Rebuilds indexes and reclaims unused space</li>
            <li>Run these tools periodically to maintain database performance</li>
            <li>Optimization may take a few seconds depending on database size</li>
          </ul>
        </div>
      </div>

      {/* Storage Information */}
      <div className="info-card">
        <h2>Storage Information</h2>
        <div className="storage-info">
          <p>
            <strong>Database Location:</strong><br />
            <code>{process.env.APPDATA || process.env.HOME}/StockPortfolioManager/data.db</code>
          </p>
          <p>
            <strong>Data Storage:</strong><br />
            All your portfolio data is stored locally on your device. No data is sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemInformation;
