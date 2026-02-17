import React from 'react';
import CurrencyDisplay from './CurrencyDisplay';
import PercentageDisplay from './PercentageDisplay';
import './GainLossIndicator.css';

/**
 * GainLossIndicator Component
 * Displays gain/loss with color coding and visual indicators
 */
const GainLossIndicator = ({
  gainLoss,
  gainLossPercent,
  showPercent = true,
  showCurrency = true,
  size = 'medium', // 'small', 'medium', 'large'
  className = '',
  title = null
}) => {
  if (gainLoss === null || gainLoss === undefined) {
    return <span className={`gain-loss-indicator ${className}`}>-</span>;
  }

  const isGain = gainLoss > 0;
  const isLoss = gainLoss < 0;
  const isBreakeven = gainLoss === 0;

  const statusClass = isGain ? 'gain' : isLoss ? 'loss' : 'breakeven';
  const icon = isGain ? '📈' : isLoss ? '📉' : '➡️';

  return (
    <div
      className={`gain-loss-indicator ${statusClass} ${size} ${className}`}
      title={title}
    >
      <span className="indicator-icon">{icon}</span>
      <div className="indicator-values">
        {showCurrency && (
          <CurrencyDisplay
            value={gainLoss}
            showSign={true}
            className="indicator-currency"
          />
        )}
        {showPercent && gainLossPercent !== null && gainLossPercent !== undefined && (
          <PercentageDisplay
            value={gainLossPercent}
            decimals={2}
            showSign={true}
            className="indicator-percent"
            showArrow={false}
          />
        )}
      </div>
    </div>
  );
};

export default GainLossIndicator;
