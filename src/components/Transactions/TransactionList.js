import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import CurrencyDisplay from '../Common/CurrencyDisplay';
import DateDisplay from '../Common/DateDisplay';
import LoadingSpinner from '../Common/LoadingSpinner';
import TransactionEditor from './TransactionEditor';
import './TransactionList.css';

/**
 * TransactionList Component
 * Displays, filters, and manages transactions
 */
const TransactionList = () => {
  const { sessionToken } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'buy', 'sell'
    sortBy: 'date-desc' // 'date-asc', 'date-desc', 'symbol', 'amount'
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTransactions();
  }, [sessionToken]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filterObj = filters.type !== 'all' ? { type: filters.type } : {};
      const data = await window.electronAPI.getAllTransactions(sessionToken, filterObj);
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleDelete = async (transactionId) => {
    try {
      await window.electronAPI.deleteTransaction(sessionToken, transactionId);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setError(err.message || 'Failed to delete transaction');
    }
  };

  const handleEdit = (transactionId) => {
    setEditingTransactionId(transactionId);
  };

  const handleEditSave = () => {
    setEditingTransactionId(null);
    fetchTransactions(); // Refresh the list
  };

  const handleEditCancel = () => {
    setEditingTransactionId(null);
  };

  const getSortedTransactions = () => {
    const sorted = [...transactions];

    switch (filters.sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
      case 'symbol':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'amount':
        return sorted.sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
      default:
        return sorted;
    }
  };

  const sortedTransactions = getSortedTransactions();

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  if (error) {
    return (
      <div className="transaction-list error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      {/* Filters */}
      <div className="list-filters">
        <div className="filter-group">
          <label htmlFor="type-filter">Type:</label>
          <select
            id="type-filter"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="all">All Transactions</option>
            <option value="buy">Buy Only</option>
            <option value="sell">Sell Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-filter">Sort By:</label>
          <select
            id="sort-filter"
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="symbol">Symbol (A-Z)</option>
            <option value="amount">Amount (High to Low)</option>
          </select>
        </div>

        <div className="filter-info">
          {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </div>
      </div>

      {/* Empty State */}
      {sortedTransactions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No transactions found</h3>
          <p>
            {filters.type !== 'all'
              ? 'No transactions match your filters'
              : 'Start by adding your first transaction'}
          </p>
        </div>
      ) : (
        <>
          {/* Transactions Table */}
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map(transaction => (
                  <tr key={transaction.id} className={`transaction-row ${transaction.type}`}>
                    <td className="date">
                      <DateDisplay date={transaction.transaction_date} />
                    </td>
                    <td className="type">
                      <span className={`type-badge ${transaction.type}`}>
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="symbol">
                      <strong>{transaction.symbol}</strong>
                    </td>
                    <td className="quantity">
                      {transaction.quantity}
                    </td>
                    <td className="price">
                      <CurrencyDisplay value={transaction.price} decimals={2} />
                    </td>
                    <td className="amount">
                      <CurrencyDisplay value={transaction.quantity * transaction.price} />
                    </td>
                    <td className="notes">
                      {transaction.notes ? (
                        <span title={transaction.notes} className="notes-text">
                          {transaction.notes.substring(0, 30)}
                          {transaction.notes.length > 30 ? '...' : ''}
                        </span>
                      ) : (
                        <span className="no-notes">-</span>
                      )}
                    </td>
                    <td className="actions">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(transaction.id)}
                        title="Edit transaction"
                        disabled={editingTransactionId !== null}
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => setDeleteConfirm(transaction.id)}
                        title="Delete transaction"
                        disabled={editingTransactionId !== null}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Transaction Editor Modal */}
      {editingTransactionId && (
        <div className="modal-overlay">
          <div className="modal-large">
            <TransactionEditor
              transactionId={editingTransactionId}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Transaction?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
