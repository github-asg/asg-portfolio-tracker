import React from 'react';
import { formatLargeNumber } from '../../utils/formatting/indian';

/**
 * NumberDisplay Component
 * Displays large numbers with Indian formatting (lakhs/crores)
 */
const NumberDisplay = ({
  value,
  format = 'auto', // 'auto', 'lakhs', 'crores', 'plain'
  decimals = 2,
  className = '',
  title = null
}) => {
  if (value === null || value === undefined) {
    return <span className={`number-display ${className}`}>-</span>;
  }

  let displayValue;

  if (format === 'auto') {
    displayValue = formatLargeNumber(value, decimals);
  } else if (format === 'lakhs') {
    displayValue = (value / 100000).toFixed(decimals) + ' L';
  } else if (format === 'crores') {
    displayValue = (value / 10000000).toFixed(decimals) + ' Cr';
  } else {
    displayValue = value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  return (
    <span
      className={`number-display ${className}`}
      title={title || displayValue}
    >
      {displayValue}
    </span>
  );
};

export default NumberDisplay;
