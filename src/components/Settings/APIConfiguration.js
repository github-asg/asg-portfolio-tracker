import React, { useState, useEffect } from 'react';
import './APIConfiguration.css';

/**
 * APIConfiguration Component
 * Manages ICICI Breeze API credential configuration
 */
const APIConfiguration = ({ sessionToken }) => {
  const [credentials, setCredentials] = useState({
    appKey: '',
    secretKey: '',
    apiSession: ''
  });
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAndLoadCredentials = async () => {
      try {
        const hasCredentials = await window.electronAPI.hasCredentials(sessionToken, 'breeze');
        setHasCredentials(hasCredentials);
        
        // If credentials exist, load them (but don't show sensitive data)
        if (hasCredentials) {
          // Don't load actual credentials for security, just show that they exist
          setCredentials({
            appKey: '••••••••••••••••',
            secretKey: '••••••••••••••••',
            apiSession: '••••••••••••••••'
          });
        }
      } catch (err) {
        // Failed to check credentials
      }
    };
    
    checkAndLoadCredentials();
  }, [sessionToken]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!credentials.appKey.trim()) {
      setError('App Key is required');
      return false;
    }
    if (!credentials.secretKey.trim()) {
      setError('Secret Key is required');
      return false;
    }
    if (!credentials.apiSession.trim()) {
      setError('API Session is required');
      return false;
    }
    if (!masterPassword.trim()) {
      setError('Master Password is required');
      return false;
    }
    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (masterPassword.length < 6) {
      setError('Master Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Save credentials
      await window.electronAPI.saveCredentials(
        sessionToken,
        'breeze',
        {
          appKey: credentials.appKey.trim(),
          secretKey: credentials.secretKey.trim(),
          apiSession: credentials.apiSession.trim()
        },
        masterPassword
      );

      // Initialize Breeze client with the saved credentials
      try {
        await window.electronAPI.initializeBreezeClient(sessionToken, masterPassword);
        setMessage('API credentials saved and Breeze client initialized successfully');
      } catch (initError) {
        console.warn('Credentials saved but failed to initialize Breeze client:', initError);
        setMessage('API credentials saved successfully (client will initialize on first use)');
      }

      setCredentials({ appKey: '', secretKey: '', apiSession: '' });
      setMasterPassword('');
      setConfirmPassword('');
      setHasCredentials(true);
    } catch (err) {
      setError(err.message || 'Failed to save credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.appKey.trim() || !credentials.secretKey.trim() || !credentials.apiSession.trim()) {
      setError('Please enter all required credentials first');
      return;
    }

    try {
      setIsTesting(true);
      setError(null);
      setMessage(null);

      const result = await window.electronAPI.validateCredentials('breeze', {
        appKey: credentials.appKey.trim(),
        secretKey: credentials.secretKey.trim(),
        apiSession: credentials.apiSession.trim()
      });

      if (result.success) {
        setMessage('✓ Connection successful! API credentials are valid. Breeze client is now initialized and ready.');
        if (result.userDetails) {
          setMessage(prev => prev + ` Welcome, ${result.userDetails.userName}!`);
        }
      } else {
        setError('✗ Connection failed: ' + (result.message || 'Invalid credentials'));
      }
    } catch (err) {
      setError('✗ Connection failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteCredentials = async () => {
    if (!window.confirm('Are you sure you want to delete the saved API credentials? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      await window.electronAPI.deleteCredentials(sessionToken, 'breeze');
      setMessage('API credentials deleted successfully');
      setHasCredentials(false);
      setCredentials({ appKey: '', secretKey: '', apiSession: '' });
    } catch (err) {
      setError(err.message || 'Failed to delete credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="api-configuration">
      <div className="config-section">
        <h2>ICICI Breeze API Configuration</h2>
        <p className="section-description">
          Configure your ICICI Breeze API credentials to enable real-time stock price updates.
          Your credentials are encrypted and stored securely on your device.
        </p>

        {hasCredentials && (
          <div className="status-badge success">
            ✓ API credentials are configured and saved
            <br />
            <small>Your credentials are encrypted and stored securely. You can update them below if needed.</small>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="config-form">
          <div className="credential-group">
            <label htmlFor="appKey">App Key *</label>
            <input
              type="text"
              id="appKey"
              name="appKey"
              value={credentials.appKey}
              onChange={handleInputChange}
              placeholder="Enter your ICICI Breeze App Key"
              required
            />
            <small>App Key received during Breeze API registration</small>
          </div>

          <div className="credential-group">
            <label htmlFor="secretKey">Secret Key *</label>
            <input
              type="password"
              id="secretKey"
              name="secretKey"
              value={credentials.secretKey}
              onChange={handleInputChange}
              placeholder="Enter your Secret Key"
              required
            />
            <small>Secret Key received during Breeze API registration</small>
          </div>

          <div className="credential-group">
            <label htmlFor="apiSession">API Session *</label>
            <input
              type="text"
              id="apiSession"
              name="apiSession"
              value={credentials.apiSession}
              onChange={handleInputChange}
              placeholder="Enter API Session from login URL"
              required
            />
            <small>API Session obtained after logging into Breeze API portal</small>
          </div>

          <div className="form-divider">
            <span>Master Password</span>
          </div>

          <div className="form-group">
            <label htmlFor="master-password">Master Password</label>
            <input
              id="master-password"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Create a master password to encrypt your credentials"
              disabled={isLoading}
            />
            <small>Minimum 6 characters. You&apos;ll need this to access your credentials.</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Master Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your master password"
              disabled={isLoading}
            />
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

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Credentials'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={isTesting || isLoading}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            {hasCredentials && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteCredentials}
                disabled={isLoading}
              >
                Delete Credentials
              </button>
            )}
          </div>
        </form>

        <div className="api-instructions">
          <h4>📋 How to get ICICI Breeze API credentials:</h4>
          <ol>
            <li>
              <strong>Register for Breeze API:</strong>
              <br />Visit the ICICI Breeze API portal and register your application
              <br />You&apos;ll receive <strong>App Key</strong> and <strong>Secret Key</strong>
            </li>
            <li>
              <strong>Get API Session:</strong>
              <br />Navigate to: <code>https://api.icicidirect.com/apiuser/login?api_key=YOUR_APP_KEY</code>
              <br />Replace YOUR_APP_KEY with your actual App Key
              <br />Login with your ICICI Direct credentials
              <br />Copy the <strong>API_Session</strong> value from the address bar after login
            </li>
            <li>
              <strong>Enter credentials above and test connection</strong>
            </li>
          </ol>
          
          <div className="api-note">
            <strong>Note:</strong> API Session expires periodically. You&apos;ll need to refresh it by logging in again.
          </div>
        </div>
      </div>

      <div className="security-section">
        <h3>🔒 Security Information</h3>
        <ul>
          <li>Your API credentials are encrypted using AES-256 encryption</li>
          <li>The master password is never stored; only a hash is kept</li>
          <li>All data is stored locally on your device</li>
          <li>Your credentials are never sent to any external server</li>
          <li>Never share your API credentials with anyone</li>
        </ul>
      </div>
    </div>
  );
};

export default APIConfiguration;
