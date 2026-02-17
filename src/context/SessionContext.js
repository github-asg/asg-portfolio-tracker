import React, { createContext, useState, useCallback, useEffect } from 'react';

export const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [sessionToken, setSessionToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (!window.electronAPI) {
          console.error('Electron API not available');
          setIsLoading(false);
          return;
        }

        const storedToken = localStorage.getItem('sessionToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          // Validate session with backend
          const validation = await window.electronAPI.validateSession(storedToken);

          if (validation.valid) {
            setSessionToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Session expired, clear storage
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('user');
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      setError(null);
      setIsLoading(true);

      if (!window.electronAPI) {
        const errorMsg = 'Electron API not available';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const result = await window.electronAPI.login(username, password);

      if (result && result.sessionToken) {
        setSessionToken(result.sessionToken);
        setUser(result.user || {
          id: result.userId,
          username: result.username
        });

        // Store in localStorage
        localStorage.setItem('sessionToken', result.sessionToken);
        localStorage.setItem('user', JSON.stringify(result.user || {
          id: result.userId,
          username: result.username
        }));

        // Auto-initialize Breeze client if credentials exist
        try {
          const hasBreeze = await window.electronAPI.hasCredentials(result.sessionToken, 'breeze');
          if (hasBreeze) {
            console.log('Breeze credentials found, attempting auto-initialization...');
            // Try to initialize with login password as master password
            await window.electronAPI.initializeBreezeClient(result.sessionToken, password);
            console.log('✓ Breeze client auto-initialized successfully');
          }
        } catch (breezeError) {
          console.warn('Failed to auto-initialize Breeze client:', breezeError.message);
          // Don't fail login if Breeze initialization fails
        }

        return { success: true };
      } else {
        const errorMsg = result?.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || 'An error occurred during login';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      if (sessionToken) {
        await window.electronAPI.logout(sessionToken);
      }

      setSessionToken(null);
      setUser(null);
      setError(null);

      // Clear localStorage
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');

      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if logout fails
      setSessionToken(null);
      setUser(null);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const refreshSession = useCallback(async () => {
    try {
      if (!sessionToken) {
        return { success: false, error: 'No active session' };
      }

      const result = await window.electronAPI.refreshSession(sessionToken);

      if (result.success) {
        setSessionToken(result.sessionToken);
        localStorage.setItem('sessionToken', result.sessionToken);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      return { success: false, error: err.message };
    }
  }, [sessionToken]);

  const value = {
    sessionToken,
    user,
    isLoading,
    error,
    isAuthenticated: !!sessionToken,
    login,
    logout,
    refreshSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use session context
export const useSession = () => {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
