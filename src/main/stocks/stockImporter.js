// Stock Importer - Import stocks from CSV/Excel
const databaseManager = require('../database/index');
const XLSX = require('xlsx');
const fs = require('fs');

class StockImporter {
  constructor() {
    this.stockLookupService = null;
  }

  /**
   * Set the stock lookup service for BSE data integration
   */
  setStockLookupService(service) {
    this.stockLookupService = service;
    console.log('Stock lookup service injected into StockImporter');
  }

  /**
   * Import stocks from Excel file
   * Expected columns: Symbol, Company Name, ISIN, Exchange, Sector, Industry
   */
  importFromExcel(filePath) {
    try {
      console.log('Importing stocks from:', filePath);
      
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Found ${data.length} stocks to import`);
      
      let imported = 0;
      let updated = 0;
      let errors = 0;
      
      for (const row of data) {
        try {
          const result = this.importStock(row);
          if (result === 'imported') imported++;
          else if (result === 'updated') updated++;
        } catch (error) {
          console.error(`Failed to import ${row.Symbol}:`, error.message);
          errors++;
        }
      }
      
      console.log(`\n✓ Import complete:`);
      console.log(`  - Imported: ${imported}`);
      console.log(`  - Updated: ${updated}`);
      console.log(`  - Errors: ${errors}`);
      
      return { imported, updated, errors, total: data.length };
      
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }
  
  /**
   * Import stocks from CSV file
   */
  importFromCSV(filePath) {
    try {
      console.log('Importing stocks from CSV:', filePath);
      
      // Read CSV file
      const csvData = fs.readFileSync(filePath, 'utf8');
      const lines = csvData.split('\n');
      
      // Parse header
      const headers = lines[0].split(',').map(h => h.trim());
      
      let imported = 0;
      let updated = 0;
      let errors = 0;
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        
        try {
          const result = this.importStock(row);
          if (result === 'imported') imported++;
          else if (result === 'updated') updated++;
        } catch (error) {
          console.error(`Failed to import ${row.Symbol}:`, error.message);
          errors++;
        }
      }
      
      console.log(`\n✓ Import complete:`);
      console.log(`  - Imported: ${imported}`);
      console.log(`  - Updated: ${updated}`);
      console.log(`  - Errors: ${errors}`);
      
      return { imported, updated, errors, total: lines.length - 1 };
      
    } catch (error) {
      console.error('CSV import failed:', error);
      throw error;
    }
  }
  
  /**
   * Import a single stock
   */
  importStock(row) {
    try {
      // Map column names (case insensitive)
      const symbol = row.Symbol || row.symbol || row.SYMBOL;
      const companyName = row['Company Name'] || row['company_name'] || row.CompanyName || row.Name;
      const isin = row.ISIN || row.isin;
      const exchange = row.Exchange || row.exchange || 'BSE';
      const sector = row.Sector || row.sector || null;
      const industry = row.Industry || row.industry || null;
      
      if (!symbol || !companyName) {
        throw new Error('Symbol and Company Name are required');
      }
      
      // Lookup BSE data if stock lookup service is available
      let bseData = null;
      if (this.stockLookupService && this.stockLookupService.isReady()) {
        bseData = this.stockLookupService.lookupByScripCode(symbol) || 
                  this.stockLookupService.lookupByShortName(symbol);
        
        if (bseData) {
          console.log(`✓ BSE data found for ${symbol}: ${bseData.ScripName}`);
        }
      }
      
      // Check if stock exists
      const existing = databaseManager.getOne(
        'SELECT id FROM stocks WHERE symbol = ?',
        [symbol]
      );
      
      if (existing) {
        // Update existing stock with BSE fields
        databaseManager.run(
          `UPDATE stocks 
           SET company_name = ?, isin = ?, exchange = ?, sector = ?, industry = ?,
               bse_short_name = ?, scrip_name = ?, isin_code = ?, 
               week_52_high = ?, week_52_low = ?, updated_at = ?
           WHERE symbol = ?`,
          [
            companyName, 
            isin, 
            exchange, 
            sector, 
            industry,
            bseData ? bseData.ShortName : null,
            bseData ? bseData.ScripName : null,
            bseData ? bseData.ISINCode : null,
            bseData ? bseData['52WeeksHigh'] : null,
            bseData ? bseData['52WeeksLow'] : null,
            new Date().toISOString(), 
            symbol
          ]
        );
        return 'updated';
      } else {
        // Insert new stock with BSE fields
        databaseManager.run(
          `INSERT INTO stocks (
            symbol, company_name, isin, exchange, sector, industry,
            bse_short_name, scrip_name, isin_code, week_52_high, week_52_low,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            symbol, 
            companyName, 
            isin, 
            exchange, 
            sector, 
            industry,
            bseData ? bseData.ShortName : null,
            bseData ? bseData.ScripName : null,
            bseData ? bseData.ISINCode : null,
            bseData ? bseData['52WeeksHigh'] : null,
            bseData ? bseData['52WeeksLow'] : null,
            new Date().toISOString()
          ]
        );
        return 'imported';
      }
      
    } catch (error) {
      console.error('Failed to import stock:', error);
      throw error;
    }
  }
  
  /**
   * Export stocks to CSV
   */
  exportToCSV(outputPath) {
    try {
      const stocks = databaseManager.getAll(
        'SELECT symbol, company_name, isin, exchange, sector, industry FROM stocks ORDER BY symbol'
      );
      
      // Create CSV content
      const headers = 'Symbol,Company Name,ISIN,Exchange,Sector,Industry\n';
      const rows = stocks.map(s => 
        `${s.symbol},"${s.company_name}",${s.isin || ''},${s.exchange},${s.sector || ''},${s.industry || ''}`
      ).join('\n');
      
      const csv = headers + rows;
      
      fs.writeFileSync(outputPath, csv, 'utf8');
      console.log(`✓ Exported ${stocks.length} stocks to ${outputPath}`);
      
      return stocks.length;
      
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  /**
   * Create sample template file
   */
  createTemplate(outputPath) {
    try {
      const template = `Symbol,Company Name,ISIN,Exchange,Sector,Industry
RELIANCE,Reliance Industries Ltd,INE002A01018,NSE,Energy & Power,Oil & Gas
TCS,Tata Consultancy Services,INE467B01029,NSE,Technology & IT Services,IT Services
INFY,Infosys Limited,INE009A01021,NSE,Technology & IT Services,IT Services`;
      
      fs.writeFileSync(outputPath, template, 'utf8');
      console.log(`✓ Template created at ${outputPath}`);
      
    } catch (error) {
      console.error('Template creation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const stockImporter = new StockImporter();
module.exports = stockImporter;

