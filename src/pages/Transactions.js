import React, { useState } from 'react';
import TransactionForm from '../components/Transactions/TransactionForm';
import TransactionList from '../components/Transactions/TransactionList';
import './Transactions.css';

/**
 * Transactions Page
 * Main page for transaction management
 */
const Transactions = () => {
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionSuccess = () => {
    setSuccessMessage('Transaction added successfully!');
    setShowForm(false);
    setRefreshKey(prev => prev + 1); // Trigger list refresh
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1>Transaction Management</h1>
        <p>Add, view, and manage your stock transactions</p>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {successMessage}
        </div>
      )}

      <div className="page-content">
        {!showForm ? (
          <div className="transactions-view">
            <button
              className="btn btn-primary add-transaction-btn"
              onClick={() => setShowForm(true)}
            >
              + Add Transaction
            </button>

            <TransactionList key={refreshKey} />
          </div>
        ) : (
          <div className="form-view">
            <TransactionForm
              onSuccess={handleTransactionSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
