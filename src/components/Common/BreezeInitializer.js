import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import './BreezeInitializer.css';

/**
 * BreezeInitializer Component
 * Automatically checks if Breeze credentials exist and prompts for master password
 * to initialize the Breeze API client on app startup
 */
const BreezeInitializer = () => {
  const { sessionToken } = useSession();
  const [showPrompt, setShowPrompt] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkBreezeCredentials = async () => {
      if (!sessionToken || hasChecked) return;

      try {
        // Check if Breeze credentials exist
        const hasCredentials = await window.electronAPI.hasCredentials(sessionToken, 'breeze');
        
        if (hasCredentials) {
          // Check if Breeze client is already initialized
          const status = await window.electronAPI.getPriceManagerStatus(sessionToken);
          
          if (!status.apiStatus.connected) {
            // Credentials exist but Breeze is not initialized - show prompt
            setShowPrompt(true);
          }
        }
        
        setHasChecked(true);
      } catch (err) {
        console.error('Failed to check Breeze credentials:', err);
        setHasChecked(true);
      }
    };

    checkBreezeCredentials();
  }, [sessionToken, hasChecked]);

  const handleInitialize = async (e) => {
    e.preventDefault();
    setError(null);

    if (!masterPassword.trim()) {
      setError('Master password is required');
      return;
    }

    try {
      setIsInitializing(true);
      
      await window.electronAPI.initializeBreezeClient(sessionToken, masterPassword);
      
      // Success - close the prompt
      setShowPrompt(false);
      setMasterPassword('');
    } catch (err) {
      setError(err.message || 'Failed to initialize Breeze API. Please check your master password.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSkip = () => {
    setShowPrompt(false);
    setMasterPassword('');
    setError(null);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="breeze-initializer-overlay">
      <div className="breeze-initializer-modal">
        <div className="breeze-initializer-header">
          <h3>🔐 Initialize Breeze API</h3>
          <p>Enter your master password to enable live price updates</p>
        </div>

        <form onSubmit={handleInitialize} className="breeze-initializer-form">
          <div className="form-group">
            <label htmlFor="master-password">Master Password</label>
            <input
              type="password"
              id="master-password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Enter your master password"
              disabled={isInitializing}
              autoFocus
            />
            <small>This is the password you used to encrypt your Breeze API credentials</small>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="breeze-initializer-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Initialize'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSkip}
              disabled={isInitializing}
            >
              Skip for Now
            </button>
          </div>
        </form>

        <div className="breeze-initializer-info">
          <p>💡 You can initialize Breeze API later from Settings → API Configuration</p>
        </div>
      </div>
    </div>
  );
};

export default BreezeInitializer;
