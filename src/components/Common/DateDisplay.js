import React from 'react';
import { format } from 'date-fns';

/**
 * DateDisplay Component
 * Displays dates in DD-MMM-YYYY format
 */
const DateDisplay = ({
  date,
  format: dateFormat = 'dd-MMM-yyyy',
  className = '',
  title = null,
  showTime = false
}) => {
  if (!date) {
    return <span className={`date-display ${className}`}>-</span>;
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return <span className={`date-display ${className}`}>Invalid Date</span>;
    }

    const formatStr = showTime ? `${dateFormat} HH:mm` : dateFormat;
    const displayValue = format(dateObj, formatStr);

    return (
      <span
        className={`date-display ${className}`}
        title={title || displayValue}
      >
        {displayValue}
      </span>
    );
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span className={`date-display ${className}`}>Invalid Date</span>;
  }
};

export default DateDisplay;
