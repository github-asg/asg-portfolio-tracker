import React from 'react';

/**
 * PercentageDisplay Component
 * Displays percentage values with color coding (gain/loss)
 */
const PercentageDisplay = ({
  value,
  decimals = 2,
  showSign = true,
  className = '',
  title = null,
  showArrow = true
}) => {
  if (value === null || value === undefined) {
    return <span className={`percentage-display ${className}`}>-</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;

  const displayValue = Math.abs(value).toFixed(decimals);
  const sign = showSign && isPositive ? '+' : '';
  const arrow = showArrow ? (isPositive ? ' ↑' : isNegative ? ' ↓' : '') : '';

  const statusClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

  return (
    <span
      className={`percentage-display ${statusClass} ${className}`}
      title={title || `${sign}${displayValue}%`}
    >
      {sign}{displayValue}%{arrow}
    </span>
  );
};

export default PercentageDisplay;
