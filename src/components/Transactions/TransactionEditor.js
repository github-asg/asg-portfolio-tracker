import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import transactionEditingAPI from '../../utils/api/transactionEditingAPI';
import LoadingSpinner from '../Common/LoadingSpinner';
import './TransactionEditor.css';

/**
 * TransactionEditor Component
 * Edit existing transactions with validation
 */
const TransactionEditor = ({ transactionId, onSave, onCancel }) => {
  const { sessionToken } = useSession();
  const [originalTransaction, setOriginalTransaction] = useState(null);
  const [editedTransaction, setEditedTransaction] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const transaction = await transactionEditingAPI.getTransaction(sessionToken, transactionId);
      setOriginalTransaction(transaction);
      setEditedTransaction({
        transaction_date: transaction.transaction_date,
        stock_id: transaction.stock_id,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        price: transaction.price,
        charges: transaction.charges || 0,
        notes: transaction.notes || ''
      });
    } catch (err) {
      console.error('Failed to load transaction:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedTransaction(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const validateChanges = async () => {
    try {
      setIsValidating(true);
      const validation = await transactionEditingAPI.validateEdit(
        sessionToken,
        transactionId,
        editedTransaction
      );
      
      setValidationErrors(validation.errors || []);
      return validation.isValid;
    } catch (err) {
      console.error('Validation failed:', err);
      setError(err.message);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    // Validate first
    const isValid = await validateChanges();
    if (!isValid) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Calculate impact
      const impact = await transactionEditingAPI.calculateImpact(
        sessionToken,
        transactionId,
        editedTransaction
      );

      // Show confirmation (simplified for MVP)
      const confirmed = window.confirm(
        `Save changes to this transaction?\n\n` +
        `This will affect ${impact.affectedTransactionCount} transaction(s) and recalculate FIFO matches.`
      );

      if (!confirmed) {
        setIsSaving(false);
        return;
      }

      // Commit edit
      await transactionEditingAPI.commitEdit(
        sessionToken,
        transactionId,
        editedTransaction
      );

      setHasUnsavedChanges(false);
      onSave();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Discard unsaved changes?');
      if (!confirmed) return;
    }
    onCancel();
  };

  const isFieldChanged = (field) => {
    return originalTransaction && editedTransaction[field] !== originalTransaction[field];
  };

  const getFieldError = (field) => {
    return validationErrors.find(e => e.field === field);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading transaction..." />;
  }

  if (error && !originalTransaction) {
    return (
      <div className="transaction-editor error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={loadTransaction} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-editor">
      <div className="editor-header">
        <h3>Edit Transaction</h3>
        <button className="close-btn" onClick={handleCancel} title="Close">
          ✕
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="editor-body">
        {/* Stock Info (read-only for MVP) */}
        <div className="form-group">
          <label>Stock</label>
          <div className="readonly-field">
            <strong>{originalTransaction.symbol}</strong> - {originalTransaction.company_name}
          </div>
        </div>

        {/* Transaction Date */}
        <div className={`form-group ${isFieldChanged('transaction_date') ? 'changed' : ''}`}>
          <label htmlFor="transaction_date">
            Transaction Date
            {isFieldChanged('transaction_date') && <span className="changed-indicator">*</span>}
          </label>
          <input
            type="date"
            id="transaction_date"
            value={editedTransaction.transaction_date || ''}
            onChange={(e) => handleFieldChange('transaction_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          {getFieldError('transaction_date') && (
            <div className="field-error">{getFieldError('transaction_date').message}</div>
          )}
        </div>

        {/* Transaction Type (read-only for MVP to avoid complexity) */}
        <div className="form-group">
          <label>Type</label>
          <div className="readonly-field">
            <span className={`type-badge ${originalTransaction.transaction_type}`}>
              {originalTransaction.transaction_type}
            </span>
          </div>
        </div>

        {/* Quantity */}
        <div className={`form-group ${isFieldChanged('quantity') ? 'changed' : ''}`}>
          <label htmlFor="quantity">
            Quantity
            {isFieldChanged('quantity') && <span className="changed-indicator">*</span>}
          </label>
          <input
            type="number"
            id="quantity"
            value={editedTransaction.quantity || ''}
            onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
            min="1"
            step="1"
          />
          {getFieldError('quantity') && (
            <div className="field-error">{getFieldError('quantity').message}</div>
          )}
        </div>

        {/* Price */}
        <div className={`form-group ${isFieldChanged('price') ? 'changed' : ''}`}>
          <label htmlFor="price">
            Price per Share (₹)
            {isFieldChanged('price') && <span className="changed-indicator">*</span>}
          </label>
          <input
            type="number"
            id="price"
            value={editedTransaction.price || ''}
            onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
            min="0.01"
            step="0.01"
          />
          {getFieldError('price') && (
            <div className="field-error">{getFieldError('price').message}</div>
          )}
        </div>

        {/* Total Amount (calculated) */}
        <div className="form-group">
          <label>Total Amount</label>
          <div className="readonly-field calculated">
            ₹{((editedTransaction.quantity || 0) * (editedTransaction.price || 0)).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
        </div>

        {/* Charges */}
        <div className={`form-group ${isFieldChanged('charges') ? 'changed' : ''}`}>
          <label htmlFor="charges">
            Charges (₹)
            {isFieldChanged('charges') && <span className="changed-indicator">*</span>}
          </label>
          <input
            type="number"
            id="charges"
            value={editedTransaction.charges || 0}
            onChange={(e) => handleFieldChange('charges', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
          />
        </div>

        {/* Notes */}
        <div className={`form-group ${isFieldChanged('notes') ? 'changed' : ''}`}>
          <label htmlFor="notes">
            Notes
            {isFieldChanged('notes') && <span className="changed-indicator">*</span>}
          </label>
          <textarea
            id="notes"
            value={editedTransaction.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            rows="3"
            placeholder="Optional notes about this transaction"
          />
        </div>

        {/* Edit History */}
        {originalTransaction.editSummary?.hasBeenEdited && (
          <div className="edit-history-info">
            <span className="history-icon">📝</span>
            <span>
              This transaction has been edited {originalTransaction.editSummary.editCount} time(s).
              Last modified: {new Date(originalTransaction.editSummary.lastModified).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="editor-footer">
        <button
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={isSaving || isValidating}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving || isValidating || validationErrors.length > 0}
        >
          {isSaving ? 'Saving...' : isValidating ? 'Validating...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default TransactionEditor;
