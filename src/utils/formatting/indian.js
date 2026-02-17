// Indian formatting utilities for currency, numbers, and dates

/**
 * Format currency in Indian Rupees with Indian numbering system
 * Example: 1234567.89 -> ₹12,34,567.89
 */
function formatCurrency(amount, options = {}) {
  try {
    if (amount === null || amount === undefined) {
      return '₹0.00';
    }

    const {
      decimals = 2,
      showSymbol = true,
      showSign = false
    } = options;

    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Format with Indian numbering system
    const formatted = formatIndianNumber(absoluteAmount, decimals);

    let result = formatted;

    if (showSymbol) {
      result = `₹${result}`;
    }

    if (showSign && isNegative) {
      result = `-${result}`;
    }

    return result;
  } catch (error) {
    console.error('Currency formatting failed:', error);
    return '₹0.00';
  }
}

/**
 * Format number with Indian numbering system (lakhs, crores)
 * Example: 1234567 -> 12,34,567
 */
function formatIndianNumber(number, decimals = 2) {
  try {
    if (number === null || number === undefined) {
      return '0';
    }

    const isNegative = number < 0;
    const absoluteNumber = Math.abs(number);

    // Split into integer and decimal parts
    const parts = absoluteNumber.toFixed(decimals).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Apply Indian numbering system
    // First group: last 3 digits
    // Subsequent groups: 2 digits each
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);

    let formatted;
    if (remaining === '') {
      formatted = lastThree;
    } else {
      // Split remaining into groups of 2 from right to left
      const groups = [];
      let temp = remaining;
      while (temp.length > 0) {
        if (temp.length <= 2) {
          groups.unshift(temp);
          break;
        } else {
          groups.unshift(temp.slice(-2));
          temp = temp.slice(0, -2);
        }
      }
      formatted = groups.join(',') + ',' + lastThree;
    }

    // Add decimal part if needed
    if (decimals > 0 && decimalPart) {
      formatted = formatted + '.' + decimalPart;
    }

    // Add negative sign if needed
    if (isNegative) {
      formatted = '-' + formatted;
    }

    return formatted;
  } catch (error) {
    console.error('Indian number formatting failed:', error);
    return number.toString();
  }
}

/**
 * Format large numbers as lakhs/crores
 * Example: 1234567 -> 12.35 Lakhs
 */
function formatLargeNumber(number, options = {}) {
  try {
    if (number === null || number === undefined) {
      return '0';
    }

    const {
      decimals = 2,
      showUnit = true
    } = options;

    const absoluteNumber = Math.abs(number);
    const isNegative = number < 0;

    let formatted;
    let unit = '';

    if (absoluteNumber >= 10000000) {
      // Crores (1 Crore = 10 Million)
      formatted = (absoluteNumber / 10000000).toFixed(decimals);
      unit = 'Cr';
    } else if (absoluteNumber >= 100000) {
      // Lakhs (1 Lakh = 100,000)
      formatted = (absoluteNumber / 100000).toFixed(decimals);
      unit = 'L';
    } else {
      formatted = absoluteNumber.toFixed(decimals);
      unit = '';
    }

    // Remove trailing zeros after decimal
    formatted = parseFloat(formatted).toString();

    if (isNegative) {
      formatted = '-' + formatted;
    }

    if (showUnit && unit) {
      formatted = formatted + ' ' + unit;
    }

    return formatted;
  } catch (error) {
    console.error('Large number formatting failed:', error);
    return number.toString();
  }
}

/**
 * Format date as DD-MMM-YYYY
 * Example: 2024-01-15 -> 15-Jan-2024
 */
function formatDate(date, format = 'DD-MMM-YYYY') {
  try {
    if (!date) {
      return '';
    }

    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthName = getMonthName(d.getMonth());
    const year = d.getFullYear();

    switch (format) {
      case 'DD-MMM-YYYY':
        return `${day}-${monthName}-${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      default:
        return `${day}-${monthName}-${year}`;
    }
  } catch (error) {
    console.error('Date formatting failed:', error);
    return '';
  }
}

/**
 * Format date and time
 */
function formatDateTime(date, format = 'DD-MMM-YYYY HH:mm') {
  try {
    if (!date) {
      return '';
    }

    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const monthName = getMonthName(d.getMonth());
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    if (format === 'DD-MMM-YYYY HH:mm') {
      return `${day}-${monthName}-${year} ${hours}:${minutes}`;
    } else if (format === 'DD-MMM-YYYY HH:mm:ss') {
      return `${day}-${monthName}-${year} ${hours}:${minutes}:${seconds}`;
    }

    return `${day}-${monthName}-${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('DateTime formatting failed:', error);
    return '';
  }
}

/**
 * Format percentage
 */
function formatPercentage(value, decimals = 2) {
  try {
    if (value === null || value === undefined) {
      return '0.00%';
    }

    const formatted = parseFloat(value).toFixed(decimals);
    return `${formatted}%`;
  } catch (error) {
    console.error('Percentage formatting failed:', error);
    return '0.00%';
  }
}

/**
 * Get month name from month index
 */
function getMonthName(monthIndex) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return months[monthIndex] || '';
}

/**
 * Parse Indian formatted currency to number
 */
function parseCurrency(currencyString) {
  try {
    if (!currencyString) {
      return 0;
    }

    // Remove currency symbol and spaces
    let cleaned = currencyString.replace(/₹/g, '').trim();

    // Remove commas
    cleaned = cleaned.replace(/,/g, '');

    // Convert to number
    const number = parseFloat(cleaned);

    return isNaN(number) ? 0 : number;
  } catch (error) {
    console.error('Currency parsing failed:', error);
    return 0;
  }
}

/**
 * Parse Indian formatted number to number
 */
function parseIndianNumber(numberString) {
  try {
    if (!numberString) {
      return 0;
    }

    // Remove commas
    const cleaned = numberString.replace(/,/g, '');

    // Convert to number
    const number = parseFloat(cleaned);

    return isNaN(number) ? 0 : number;
  } catch (error) {
    console.error('Number parsing failed:', error);
    return 0;
  }
}

module.exports = {
  formatCurrency,
  formatINR: formatCurrency, // Alias for backward compatibility
  formatIndianNumber,
  formatLargeNumber,
  formatDate,
  formatDateTime,
  formatPercentage,
  parseCurrency,
  parseIndianNumber,
  getMonthName
};
