import React, { useState } from 'react';
import './ApplicationSettings.css';

/**
 * ApplicationSettings Component
 * Manages application preferences and database operations
 */
const ApplicationSettings = () => {
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);
  const [theme, setTheme] = useState('light');
  const [showNotifications, setShowNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setIsLoading(true);
      // Save preferences to localStorage for now
      localStorage.setItem('appPreferences', JSON.stringify({
        autoRefreshInterval,
        theme,
        showNotifications
      }));
      setMessage('Preferences saved successfully');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      // In a real app, this would open a file dialog
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `portfolio_backup_${timestamp}.db`;
      
      await window.electronAPI.backupDatabase(backupPath);
      setMessage(`Database backed up successfully to ${backupPath}`);
    } catch (err) {
      console.error('Failed to backup database:', err);
      setError(err.message || 'Failed to backup database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDatabase = async () => {
    if (!window.confirm('Restoring from backup will replace your current database. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      // In a real app, this would open a file dialog to select backup
      // For now, we'll show a placeholder
      alert('Please select a backup file to restore from');
    } catch (err) {
      console.error('Failed to restore database:', err);
      setError(err.message || 'Failed to restore database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="application-settings">
      <div className="settings-section">
        <h2>Application Preferences</h2>

        <form onSubmit={handleSavePreferences} className="settings-form">
          <div className="form-group">
            <label htmlFor="refresh-interval">Auto-Refresh Interval (seconds)</label>
            <select
              id="refresh-interval"
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
              <option value={0}>Disabled</option>
            </select>
            <small>How often to refresh stock prices during market hours</small>
          </div>

          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={isLoading}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
            <small>Choose your preferred application theme</small>
          </div>

          <div className="form-group checkbox">
            <input
              id="notifications"
              type="checkbox"
              checked={showNotifications}
              onChange={(e) => setShowNotifications(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="notifications">Show notifications for price updates</label>
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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Database Management</h2>

        <div className="database-info">
          <p>Backup and restore your portfolio data to keep it safe.</p>
        </div>

        <div className="database-actions">
          <button
            className="btn btn-secondary"
            onClick={handleBackupDatabase}
            disabled={isLoading}
          >
            💾 Backup Database
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRestoreDatabase}
            disabled={isLoading}
          >
            📂 Restore from Backup
          </button>
        </div>

        <div className="backup-info">
          <h3>Backup Information</h3>
          <ul>
            <li>Backups include all your transactions, stocks, and settings</li>
            <li>Backups are stored as SQLite database files</li>
            <li>You can keep multiple backups for different time periods</li>
            <li>Restore will replace your current database completely</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;
