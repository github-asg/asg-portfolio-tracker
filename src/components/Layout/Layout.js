import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ user, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await onLogout();
    }
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className="app-title">📈 Stock Portfolio Manager</h1>
        </div>
        <div className="header-right">
          <span className="user-info">
            {user && <span className="username">{user.username}</span>}
          </span>
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="layout-container">
        {/* Sidebar Navigation */}
        <aside className={`layout-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <Link 
              to="/portfolio" 
              className={`nav-item ${isActive('/portfolio') || isActive('/') || isActive('/dashboard') ? 'active' : ''}`}
            >
              <span className="nav-icon">💼</span>
              <span className="nav-label">Portfolio</span>
            </Link>

            <Link 
              to="/transactions" 
              className={`nav-item ${isActive('/transactions') ? 'active' : ''}`}
            >
              <span className="nav-icon">💱</span>
              <span className="nav-label">Transactions</span>
            </Link>

            <Link 
              to="/reports" 
              className={`nav-item ${isActive('/reports') ? 'active' : ''}`}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-label">Reports</span>
            </Link>

            <Link 
              to="/settings" 
              className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="layout-main">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="layout-footer">
        <p>&copy; 2024 Stock Portfolio Manager. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
