// Financial Year utilities for Indian market
// Financial year in India: April 1 to March 31

/**
 * Get financial year for a given date
 * Returns format: "2024-25"
 */
function getFinancialYear(date) {
  try {
    if (!date) {
      return getCurrentFinancialYear();
    }

    const d = new Date(date);

    if (isNaN(d.getTime())) {
      throw new Error('Invalid date');
    }

    const month = d.getMonth();
    const year = d.getFullYear();

    // If month is April (3) or later, it's the current year's FY
    // Otherwise, it's the previous year's FY
    if (month >= 3) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  } catch (error) {
    console.error('Failed to get financial year:', error);
    return getCurrentFinancialYear();
  }
}

/**
 * Get current financial year
 */
function getCurrentFinancialYear() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Get financial year start date (April 1)
 */
function getFinancialYearStart(financialYear) {
  try {
    let year;

    if (typeof financialYear === 'string' && financialYear.includes('-')) {
      year = parseInt(financialYear.split('-')[0]);
    } else {
      year = parseInt(financialYear);
    }

    return new Date(year, 3, 1); // April 1
  } catch (error) {
    console.error('Failed to get financial year start:', error);
    return new Date();
  }
}

/**
 * Get financial year end date (March 31)
 */
function getFinancialYearEnd(financialYear) {
  try {
    let year;

    if (typeof financialYear === 'string' && financialYear.includes('-')) {
      year = parseInt(financialYear.split('-')[1]);
    } else {
      year = parseInt(financialYear) + 1;
    }

    return new Date(year, 2, 31); // March 31
  } catch (error) {
    console.error('Failed to get financial year end:', error);
    return new Date();
  }
}

/**
 * Get financial year range
 */
function getFinancialYearRange(financialYear) {
  try {
    const start = getFinancialYearStart(financialYear);
    const end = getFinancialYearEnd(financialYear);

    return {
      start,
      end,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Failed to get financial year range:', error);
    return null;
  }
}

/**
 * Check if date is within financial year
 */
function isDateInFinancialYear(date, financialYear) {
  try {
    const d = new Date(date);
    const start = getFinancialYearStart(financialYear);
    const end = getFinancialYearEnd(financialYear);

    return d >= start && d <= end;
  } catch (error) {
    console.error('Failed to check date in financial year:', error);
    return false;
  }
}

/**
 * Get all financial years in a range
 */
function getFinancialYearsInRange(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const years = [];
    let current = new Date(start);

    while (current <= end) {
      const fy = getFinancialYear(current);

      if (!years.includes(fy)) {
        years.push(fy);
      }

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return years;
  } catch (error) {
    console.error('Failed to get financial years in range:', error);
    return [];
  }
}

/**
 * Filter transactions by financial year
 */
function filterByFinancialYear(transactions, financialYear) {
  try {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const start = getFinancialYearStart(financialYear);
    const end = getFinancialYearEnd(financialYear);

    return transactions.filter(tx => {
      const txDate = new Date(tx.date || tx.transactionDate || tx.sellDate);
      return txDate >= start && txDate <= end;
    });
  } catch (error) {
    console.error('Failed to filter transactions by financial year:', error);
    return [];
  }
}

/**
 * Group transactions by financial year
 */
function groupByFinancialYear(transactions) {
  try {
    if (!transactions || transactions.length === 0) {
      return {};
    }

    const grouped = {};

    for (const tx of transactions) {
      const txDate = tx.date || tx.transactionDate || tx.sellDate;
      const fy = getFinancialYear(txDate);

      if (!grouped[fy]) {
        grouped[fy] = [];
      }

      grouped[fy].push(tx);
    }

    return grouped;
  } catch (error) {
    console.error('Failed to group transactions by financial year:', error);
    return {};
  }
}

/**
 * Get previous financial year
 */
function getPreviousFinancialYear(financialYear) {
  try {
    let year;

    if (typeof financialYear === 'string' && financialYear.includes('-')) {
      year = parseInt(financialYear.split('-')[0]);
    } else {
      year = parseInt(financialYear);
    }

    return `${year - 1}-${year}`;
  } catch (error) {
    console.error('Failed to get previous financial year:', error);
    return null;
  }
}

/**
 * Get next financial year
 */
function getNextFinancialYear(financialYear) {
  try {
    let year;

    if (typeof financialYear === 'string' && financialYear.includes('-')) {
      year = parseInt(financialYear.split('-')[0]);
    } else {
      year = parseInt(financialYear);
    }

    return `${year + 1}-${year + 2}`;
  } catch (error) {
    console.error('Failed to get next financial year:', error);
    return null;
  }
}

/**
 * Get financial year display string
 */
function getFinancialYearDisplay(financialYear) {
  try {
    if (typeof financialYear === 'string' && financialYear.includes('-')) {
      return `FY ${financialYear}`;
    }

    const fy = getFinancialYear(financialYear);
    return `FY ${fy}`;
  } catch (error) {
    console.error('Failed to get financial year display:', error);
    return 'FY Unknown';
  }
}

module.exports = {
  getFinancialYear,
  getCurrentFinancialYear,
  getFinancialYearStart,
  getFinancialYearEnd,
  getFinancialYearRange,
  isDateInFinancialYear,
  getFinancialYearsInRange,
  filterByFinancialYear,
  groupByFinancialYear,
  getPreviousFinancialYear,
  getNextFinancialYear,
  getFinancialYearDisplay
};
