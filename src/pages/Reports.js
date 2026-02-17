import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import CapitalGainsReport from '../components/Reports/CapitalGainsReport';
import './Reports.css';

/**
 * Reports Page
 * Main page for generating and viewing capital gains reports
 */
const Reports = () => {
  const { sessionToken } = useSession();
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeYears();
  }, [sessionToken]);

  const initializeYears = () => {
    // Generate list of financial years (current and past 5 years)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Current financial year (April to March)
    const currentFY = currentMonth >= 3 ? currentYear : currentYear - 1;

    const years = [];
    for (let i = 0; i < 6; i++) {
      const fy = currentFY - i;
      years.push({
        label: `FY ${fy}-${fy + 1}`,
        value: `${fy}-${String(fy + 1).slice(-2)}`
      });
    }

    setAvailableYears(years);
    setSelectedYear(years[0].value); // Default to current FY
    setIsLoading(false);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Capital Gains Reports</h1>
        <p>Generate and view your capital gains reports for tax purposes</p>
      </div>

      <div className="page-content">
        {isLoading ? (
          <div className="loading">Loading reports...</div>
        ) : (
          <>
            {/* Year Selection */}
            <div className="year-selector">
              <label htmlFor="year-select">Select Financial Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {availableYears.map(year => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Report */}
            {selectedYear && (
              <CapitalGainsReport
                key={selectedYear}
                financialYear={selectedYear}
                sessionToken={sessionToken}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
