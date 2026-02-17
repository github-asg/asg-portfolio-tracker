import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import APIConfiguration from '../components/Settings/APIConfiguration';
import ApplicationSettings from '../components/Settings/ApplicationSettings';
import './Settings.css';

/**
 * Settings Page
 * Main page for application configuration and settings
 */
const Settings = () => {
  const { sessionToken } = useSession();
  const [activeTab, setActiveTab] = useState('api');

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your application and API credentials</p>
      </div>

      <div className="settings-container">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            <span className="tab-icon">🔑</span>
            <span className="tab-label">API Configuration</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
          >
            <span className="tab-icon">⚙️</span>
            <span className="tab-label">Application</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'api' && (
            <APIConfiguration sessionToken={sessionToken} />
          )}
          {activeTab === 'app' && (
            <ApplicationSettings sessionToken={sessionToken} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
