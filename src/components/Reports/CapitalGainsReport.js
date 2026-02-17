import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import CurrencyDisplay from '../Common/CurrencyDisplay';
import DateDisplay from '../Common/DateDisplay';
import LoadingSpinner from '../Common/LoadingSpinner';
import './CapitalGainsReport.css';

/**
 * CapitalGainsReport Component
 * Displays STCG/LTCG breakdown with tax calculations
 */
const CapitalGainsReport = ({ financialYear, sessionToken }) => {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [financialYear, sessionToken]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await window.electronAPI.getRealizedGains(
        sessionToken,
        financialYear
      );
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!report) return;

    try {
      const result = await window.electronAPI.saveFileDialog({
        title: 'Save Capital Gains Report as PDF',
        defaultPath: `Capital_Gains_Report_${financialYear}.pdf`,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) return;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Capital Gains Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Financial Year
      doc.setFontSize(11);
      doc.text(`Financial Year: ${financialYear}`, 20, yPosition);
      yPosition += 10;

      // Summary Section
      doc.setFontSize(12);
      doc.text('Summary', 20, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      const { stcg, ltcg, summary } = report;
      doc.text(`Short-Term Capital Gains: ₹${stcg.total.toLocaleString('en-IN')}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Long-Term Capital Gains: ₹${ltcg.total.toLocaleString('en-IN')}`, 25, yPosition);
      yPosition += 6;
      doc.text(`LTCG Exemption: ₹${ltcg.exemption.toLocaleString('en-IN')}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Total Tax: ₹${summary.totalTax.toLocaleString('en-IN')}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Net Gains: ₹${summary.netGains.toLocaleString('en-IN')}`, 25, yPosition);
      yPosition += 12;

      // STCG Details
      if (stcg.gains && stcg.gains.length > 0) {
        doc.setFontSize(12);
        doc.text('Short-Term Capital Gains Details', 20, yPosition);
        yPosition += 8;

        const stcgData = stcg.gains.map(gain => [
          gain.symbol,
          gain.quantity,
          `₹${gain.buy_price.toFixed(2)}`,
          `₹${gain.sell_price.toFixed(2)}`,
          gain.buy_date,
          gain.sell_date,
          `${gain.holding_period_days}d`,
          `₹${gain.gain_loss.toLocaleString('en-IN')}`
        ]);

        doc.autoTable({
          head: [['Symbol', 'Qty', 'Buy Price', 'Sell Price', 'Buy Date', 'Sell Date', 'Period', 'Gain/Loss']],
          body: stcgData,
          startY: yPosition,
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185] }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // LTCG Details
      if (ltcg.gains && ltcg.gains.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.text('Long-Term Capital Gains Details', 20, yPosition);
        yPosition += 8;

        const ltcgData = ltcg.gains.map(gain => [
          gain.symbol,
          gain.quantity,
          `₹${gain.buy_price.toFixed(2)}`,
          `₹${gain.sell_price.toFixed(2)}`,
          gain.buy_date,
          gain.sell_date,
          `${gain.holding_period_days}d`,
          `₹${gain.gain_loss.toLocaleString('en-IN')}`
        ]);

        doc.autoTable({
          head: [['Symbol', 'Qty', 'Buy Price', 'Sell Price', 'Buy Date', 'Sell Date', 'Period', 'Gain/Loss']],
          body: ltcgData,
          startY: yPosition,
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [46, 204, 113] }
        });
      }

      doc.save(result.filePath);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF: ' + err.message);
    }
  };

  const exportToExcel = async () => {
    if (!report) return;

    try {
      const result = await window.electronAPI.saveFileDialog({
        title: 'Save Capital Gains Report as Excel',
        defaultPath: `Capital_Gains_Report_${financialYear}.xlsx`,
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) return;

      const { stcg, ltcg, summary } = report;
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Capital Gains Report'],
        [`Financial Year: ${financialYear}`],
        [],
        ['Summary'],
        ['Short-Term Capital Gains', stcg.total],
        ['Long-Term Capital Gains', ltcg.total],
        ['LTCG Exemption', ltcg.exemption],
        ['Taxable LTCG', ltcg.taxable],
        ['STCG Tax Rate', `${(stcg.taxRate * 100).toFixed(0)}%`],
        ['LTCG Tax Rate', `${(ltcg.taxRate * 100).toFixed(0)}%`],
        ['Total Tax', summary.totalTax],
        ['Net Gains', summary.netGains]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // STCG Details Sheet
      if (stcg.gains && stcg.gains.length > 0) {
        const stcgData = [
          ['Symbol', 'Quantity', 'Buy Price', 'Sell Price', 'Buy Date', 'Sell Date', 'Holding Period (Days)', 'Gain/Loss']
        ];
        stcg.gains.forEach(gain => {
          stcgData.push([
            gain.symbol,
            gain.quantity,
            gain.buy_price,
            gain.sell_price,
            gain.buy_date,
            gain.sell_date,
            gain.holding_period_days,
            gain.gain_loss
          ]);
        });
        const stcgSheet = XLSX.utils.aoa_to_sheet(stcgData);
        XLSX.utils.book_append_sheet(workbook, stcgSheet, 'STCG Details');
      }

      // LTCG Details Sheet
      if (ltcg.gains && ltcg.gains.length > 0) {
        const ltcgData = [
          ['Symbol', 'Quantity', 'Buy Price', 'Sell Price', 'Buy Date', 'Sell Date', 'Holding Period (Days)', 'Gain/Loss']
        ];
        ltcg.gains.forEach(gain => {
          ltcgData.push([
            gain.symbol,
            gain.quantity,
            gain.buy_price,
            gain.sell_price,
            gain.buy_date,
            gain.sell_date,
            gain.holding_period_days,
            gain.gain_loss
          ]);
        });
        const ltcgSheet = XLSX.utils.aoa_to_sheet(ltcgData);
        XLSX.utils.book_append_sheet(workbook, ltcgSheet, 'LTCG Details');
      }

      XLSX.writeFile(workbook, result.filePath);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to export Excel: ' + err.message);
    }
  };

  const exportToCSV = async () => {
    if (!report) return;

    try {
      const result = await window.electronAPI.saveFileDialog({
        title: 'Save Capital Gains Report as CSV',
        defaultPath: `Capital_Gains_Report_${financialYear}.csv`,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) return;

      const { stcg, ltcg, summary } = report;
      let csvContent = 'Capital Gains Report\n';
      csvContent += `Financial Year: ${financialYear}\n\n`;

      // Summary
      csvContent += 'Summary\n';
      csvContent += `Short-Term Capital Gains,${stcg.total}\n`;
      csvContent += `Long-Term Capital Gains,${ltcg.total}\n`;
      csvContent += `LTCG Exemption,${ltcg.exemption}\n`;
      csvContent += `Taxable LTCG,${ltcg.taxable}\n`;
      csvContent += `Total Tax,${summary.totalTax}\n`;
      csvContent += `Net Gains,${summary.netGains}\n\n`;

      // STCG Details
      if (stcg.gains && stcg.gains.length > 0) {
        csvContent += 'Short-Term Capital Gains Details\n';
        csvContent += 'Symbol,ISIN,Quantity,Buy Price,Sell Price,Buy Date,Sell Date,Holding Period (Days),Gain/Loss\n';
        stcg.gains.forEach(gain => {
          csvContent += `${gain.symbol},${gain.isin || ''},${gain.quantity},${gain.buy_price},${gain.sell_price},${gain.buy_date},${gain.sell_date},${gain.holding_period},${gain.gain_amount}\n`;
        });
        csvContent += '\n';
      }

      // LTCG Details
      if (ltcg.gains && ltcg.gains.length > 0) {
        csvContent += 'Long-Term Capital Gains Details\n';
        csvContent += 'Symbol,ISIN,Quantity,Buy Price,Sell Price,Buy Date,Sell Date,Holding Period (Days),Gain/Loss\n';
        ltcg.gains.forEach(gain => {
          csvContent += `${gain.symbol},${gain.isin || ''},${gain.quantity},${gain.buy_price},${gain.sell_price},${gain.buy_date},${gain.sell_date},${gain.holding_period},${gain.gain_amount}\n`;
        });
      }

      // Write file using Electron API
      await window.electronAPI.writeFile(result.filePath, csvContent);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Generating report..." />;
  }

  if (error) {
    return (
      <div className="report error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchReport} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report empty">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No transactions for this period</h3>
          <p>No capital gains or losses to report for {report?.financialYear}</p>
        </div>
      </div>
    );
  }

  const { stcg, ltcg, summary } = report;

  return (
    <div className="capital-gains-report">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Short-Term Capital Gains</h3>
          <div className="card-content">
            <div className="amount">
              <CurrencyDisplay value={stcg.total} />
            </div>
            <div className="details">
              <span className="label">Transactions:</span>
              <span className="value">{stcg.count}</span>
            </div>
            <div className="details">
              <span className="label">Tax Rate:</span>
              <span className="value">{(stcg.taxRate * 100).toFixed(0)}%</span>
            </div>
            <div className="details">
              <span className="label">Estimated Tax:</span>
              <span className="value">
                <CurrencyDisplay value={stcg.estimatedTax} />
              </span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Long-Term Capital Gains</h3>
          <div className="card-content">
            <div className="amount">
              <CurrencyDisplay value={ltcg.total} />
            </div>
            <div className="details">
              <span className="label">Transactions:</span>
              <span className="value">{ltcg.count}</span>
            </div>
            <div className="details">
              <span className="label">Exemption:</span>
              <span className="value">
                <CurrencyDisplay value={ltcg.exemption} />
              </span>
            </div>
            <div className="details">
              <span className="label">Taxable Amount:</span>
              <span className="value">
                <CurrencyDisplay value={ltcg.taxable} />
              </span>
            </div>
            <div className="details">
              <span className="label">Estimated Tax:</span>
              <span className="value">
                <CurrencyDisplay value={ltcg.estimatedTax} />
              </span>
            </div>
          </div>
        </div>

        <div className="summary-card total">
          <h3>Total Summary</h3>
          <div className="card-content">
            <div className="amount">
              <CurrencyDisplay value={summary.totalGains} />
            </div>
            <div className="details">
              <span className="label">Total Tax:</span>
              <span className="value">
                <CurrencyDisplay value={summary.totalTax} />
              </span>
            </div>
            <div className="details">
              <span className="label">Net Gains:</span>
              <span className="value">
                <CurrencyDisplay value={summary.netGains} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STCG Details */}
      {stcg.gains && stcg.gains.length > 0 && (
        <div className="gains-section">
          <h2>Short-Term Capital Gains Details</h2>
          <div className="table-wrapper">
            <table className="gains-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Buy Price</th>
                  <th>Sell Price</th>
                  <th>Buy Date</th>
                  <th>Sell Date</th>
                  <th>Holding Period</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {stcg.gains.map((gain, idx) => (
                  <tr key={idx}>
                    <td className="symbol">
                      <strong>{gain.symbol}</strong>
                    </td>
                    <td className="quantity">{gain.quantity}</td>
                    <td className="price">
                      <CurrencyDisplay value={gain.buy_price} decimals={2} />
                    </td>
                    <td className="price">
                      <CurrencyDisplay value={gain.sell_price} decimals={2} />
                    </td>
                    <td className="date">
                      <DateDisplay date={gain.buy_date} />
                    </td>
                    <td className="date">
                      <DateDisplay date={gain.sell_date} />
                    </td>
                    <td className="period">
                      {gain.holding_period_days} days
                    </td>
                    <td className="gain-loss">
                      <CurrencyDisplay value={gain.gain_loss} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LTCG Details */}
      {ltcg.gains && ltcg.gains.length > 0 && (
        <div className="gains-section">
          <h2>Long-Term Capital Gains Details</h2>
          <div className="table-wrapper">
            <table className="gains-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Buy Price</th>
                  <th>Sell Price</th>
                  <th>Buy Date</th>
                  <th>Sell Date</th>
                  <th>Holding Period</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {ltcg.gains.map((gain, idx) => (
                  <tr key={idx}>
                    <td className="symbol">
                      <strong>{gain.symbol}</strong>
                    </td>
                    <td className="quantity">{gain.quantity}</td>
                    <td className="price">
                      <CurrencyDisplay value={gain.buy_price} decimals={2} />
                    </td>
                    <td className="price">
                      <CurrencyDisplay value={gain.sell_price} decimals={2} />
                    </td>
                    <td className="date">
                      <DateDisplay date={gain.buy_date} />
                    </td>
                    <td className="date">
                      <DateDisplay date={gain.sell_date} />
                    </td>
                    <td className="period">
                      {gain.holding_period_days} days
                    </td>
                    <td className="gain-loss">
                      <CurrencyDisplay value={gain.gain_loss} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Gains Message */}
      {(!stcg.gains || stcg.gains.length === 0) && (!ltcg.gains || ltcg.gains.length === 0) && (
        <div className="no-gains">
          <span className="icon">✓</span>
          <h3>No capital gains or losses</h3>
          <p>No transactions were completed during this financial year</p>
        </div>
      )}

      {/* Export Buttons */}
      <div className="export-section">
        <button className="export-btn pdf" onClick={exportToPDF}>
          📄 Export as PDF
        </button>
        <button className="export-btn excel" onClick={exportToExcel}>
          📊 Export as Excel
        </button>
        <button className="export-btn csv" onClick={exportToCSV}>
          📋 Export as CSV
        </button>
      </div>
    </div>
  );
};

export default CapitalGainsReport;
