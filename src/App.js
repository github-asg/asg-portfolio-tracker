import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Login from './components/Auth/Login';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { SessionProvider, useSession } from './context/SessionContext';

// Import pages
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Main app content component
function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useSession();

  // Only show loading spinner during initial load, not during logout
  if (isLoading && isAuthenticated) {
    return <LoadingSpinner message="Initializing Stock Portfolio Manager..." />;
  }

  return (
    <div className="App">
      <ErrorBoundary>
        <Router>
          <Routes>
            {!isAuthenticated ? (
              <Route 
                path="*" 
                element={<Login />} 
              />
            ) : (
              <Route 
                path="/*" 
                element={
                  <Layout user={user} onLogout={logout}>
                    <Routes>
                      <Route path="/" element={<Portfolio />} />
                      <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="/dashboard" element={<Navigate to="/portfolio" replace />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      {/* Additional routes will be added as we implement features */}
                      <Route path="*" element={<Navigate to="/portfolio" replace />} />
                    </Routes>
                  </Layout>
                } 
              />
            )}
          </Routes>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

// Main App component with SessionProvider
function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;