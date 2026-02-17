import React from 'react';
import { formatINR } from '../../utils/formatting/indian';

/**
 * CurrencyDisplay Component
 * Displays currency values with Indian formatting (₹1,23,456.78)
 */
const CurrencyDisplay = ({
  value,
  showSign = false,
  className = '',
  title = null,
  decimals = 2
}) => {
  if (value === null || value === undefined) {
    return <span className={`currency-display ${className}`}>-</span>;
  }

  const isNegative = value < 0;
  const displayValue = formatINR(Math.abs(value), decimals);
  const sign = showSign && isNegative ? '-' : '';

  return (
    <span
      className={`currency-display ${className} ${isNegative ? 'negative' : 'positive'}`}
      title={title || displayValue}
    >
      {sign}{displayValue}
    </span>
  );
};

export default CurrencyDisplay;
