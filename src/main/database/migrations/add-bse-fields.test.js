const { addBseFields } = require('./add-bse-fields');

describe('BSE Fields Migration', () => {
  let mockDb;
  let mockStockLookupService;

  beforeEach(() => {
    // Mock database manager
    mockDb = {
      getAll: jest.fn(),
      run: jest.fn(),
      isInitialized: true
    };

    // Mock stock lookup service
    mockStockLookupService = {
      isReady: jest.fn().mockReturnValue(true),
      lookupByScripCode: jest.fn(),
      lookupByShortName: jest.fn()
    };
  });

  describe('Column Addition', () => {
    it('should add all BSE columns when they do not exist', async () => {
      // Mock table info without BSE columns
      mockDb.getAll.mockReturnValue([
        { name: 'id' },
        { name: 'symbol' },
        { name: 'company_name' },
        { name: 'exchange' }
      ]);

      await addBseFields(mockDb, mockStockLookupService);

      // Verify all columns were added
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE stocks ADD COLUMN bse_short_name TEXT')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE stocks ADD COLUMN scrip_name TEXT')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE stocks ADD COLUMN isin_code TEXT')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE stocks ADD COLUMN week_52_high REAL')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE stocks ADD COLUMN week_52_low REAL')
      );
    });

    it('should skip columns that already exist (idempotent)', async () => {
      // Mock table info with some BSE columns already present
      mockDb.getAll.mockReturnValue([
        { name: 'id' },
        { name: 'symbol' },
        { name: 'bse_short_name' },
        { name: 'scrip_name' }
      ]);

      await addBseFields(mockDb, mockStockLookupService);

      // Verify only missing columns were added
      const runCalls = mockDb.run.mock.calls;
      const alterTableCalls = runCalls.filter(call => 
        call[0].includes('ALTER TABLE')
      );

      // Should only add 3 missing columns (isin_code, week_52_high, week_52_low)
      expect(alterTableCalls.length).toBe(3);
    });

    it('should handle empty table (no stocks table)', async () => {
      mockDb.getAll.mockReturnValue([]);

      await addBseFields(mockDb, mockStockLookupService);

      // Should not attempt to add columns
      expect(mockDb.run).not.toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE')
      );
    });
  });

  describe('Index Creation', () => {
    it('should create indexes on bse_short_name and isin_code', async () => {
      mockDb.getAll.mockReturnValue([
        { name: 'id' },
        { name: 'symbol' }
      ]);

      await addBseFields(mockDb, mockStockLookupService);

      // Verify indexes were created
      expect(mockDb.run).toHaveBeenCalledWith(
        'CREATE INDEX IF NOT EXISTS idx_stocks_bse_short_name ON stocks(bse_short_name)'
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        'CREATE INDEX IF NOT EXISTS idx_stocks_isin_code ON stocks(isin_code)'
      );
    });
  });

  describe('Data Population', () => {
    beforeEach(() => {
      // Mock table with no BSE columns (so they will be added)
      mockDb.getAll
        .mockReturnValueOnce([
          { name: 'id' },
          { name: 'symbol' }
        ])
        // Mock stocks query
        .mockReturnValueOnce([
          { id: 1, symbol: '500325' },
          { id: 2, symbol: 'RELIANCE' },
          { id: 3, symbol: 'INVALID' }
        ]);
    });

    it('should populate existing stocks with BSE data', async () => {
      // Mock lookup responses
      mockStockLookupService.lookupByScripCode
        .mockReturnValueOnce({
          ShortName: 'RELIANCE',
          ScripName: 'RELIANCE INDUSTRIES LTD',
          ISINCode: 'INE002A01018',
          '52WeeksHigh': 2500.50,
          '52WeeksLow': 2000.25
        })
        .mockReturnValueOnce(null);

      mockStockLookupService.lookupByShortName
        .mockReturnValueOnce({
          ShortName: 'RELIANCE',
          ScripName: 'RELIANCE INDUSTRIES LTD',
          ISINCode: 'INE002A01018',
          '52WeeksHigh': 2500.50,
          '52WeeksLow': 2000.25
        })
        .mockReturnValueOnce(null);

      await addBseFields(mockDb, mockStockLookupService);

      // Verify UPDATE queries were called for found stocks
      const updateCalls = mockDb.run.mock.calls.filter(call =>
        call[0].includes('UPDATE stocks')
      );

      expect(updateCalls.length).toBe(2); // Two stocks found
    });

    it('should handle stocks not found in BSE data', async () => {
      mockStockLookupService.lookupByScripCode.mockReturnValue(null);
      mockStockLookupService.lookupByShortName.mockReturnValue(null);

      // Should not throw error
      await expect(addBseFields(mockDb, mockStockLookupService)).resolves.not.toThrow();
    });

    it('should skip population when stock lookup service is not ready', async () => {
      mockStockLookupService.isReady.mockReturnValue(false);

      await addBseFields(mockDb, mockStockLookupService);

      // Verify no UPDATE queries were made
      const updateCalls = mockDb.run.mock.calls.filter(call =>
        call[0].includes('UPDATE stocks')
      );

      expect(updateCalls.length).toBe(0);
    });

    it('should skip population when stock lookup service is not provided', async () => {
      await addBseFields(mockDb, null);

      // Verify no UPDATE queries were made
      const updateCalls = mockDb.run.mock.calls.filter(call =>
        call[0].includes('UPDATE stocks')
      );

      expect(updateCalls.length).toBe(0);
    });

    it('should handle empty stocks table', async () => {
      // Reset mocks for this test
      mockDb.getAll.mockReset();
      
      mockDb.getAll
        .mockReturnValueOnce([{ name: 'id' }, { name: 'symbol' }]) // Table info
        .mockReturnValueOnce([]); // No stocks

      await addBseFields(mockDb, mockStockLookupService);

      // Should not throw error
      expect(mockStockLookupService.lookupByScripCode).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when column addition fails', async () => {
      mockDb.getAll.mockReturnValue([{ name: 'id' }]);
      mockDb.run.mockImplementation((sql) => {
        if (sql.includes('ALTER TABLE')) {
          throw new Error('Column addition failed');
        }
      });

      await expect(addBseFields(mockDb, mockStockLookupService)).rejects.toThrow(
        'Column addition failed'
      );
    });

    it('should throw error when index creation fails', async () => {
      mockDb.getAll.mockReturnValue([
        { name: 'id' },
        { name: 'bse_short_name' },
        { name: 'scrip_name' },
        { name: 'isin_code' },
        { name: 'week_52_high' },
        { name: 'week_52_low' }
      ]);

      mockDb.run.mockImplementation((sql) => {
        if (sql.includes('CREATE INDEX')) {
          throw new Error('Index creation failed');
        }
      });

      await expect(addBseFields(mockDb, mockStockLookupService)).rejects.toThrow(
        'Index creation failed'
      );
    });

    it('should continue with other stocks if one fails during population', async () => {
      mockDb.getAll
        .mockReturnValueOnce([{ name: 'id' }, { name: 'symbol' }])
        .mockReturnValueOnce([
          { id: 1, symbol: 'STOCK1' },
          { id: 2, symbol: 'STOCK2' }
        ]);

      mockStockLookupService.lookupByScripCode
        .mockReturnValueOnce({
          ShortName: 'STOCK1',
          ScripName: 'STOCK 1 LTD',
          ISINCode: 'INE001A01018',
          '52WeeksHigh': 100,
          '52WeeksLow': 50
        })
        .mockReturnValueOnce({
          ShortName: 'STOCK2',
          ScripName: 'STOCK 2 LTD',
          ISINCode: 'INE002A01018',
          '52WeeksHigh': 200,
          '52WeeksLow': 100
        });

      // Make first UPDATE fail
      let updateCount = 0;
      mockDb.run.mockImplementation((sql) => {
        if (sql.includes('UPDATE stocks')) {
          updateCount++;
          if (updateCount === 1) {
            throw new Error('Update failed');
          }
        }
      });

      // Should not throw - continues with other stocks
      await expect(addBseFields(mockDb, mockStockLookupService)).resolves.not.toThrow();
    });
  });

  describe('Migration Idempotency', () => {
    it('should be safe to run multiple times', async () => {
      // First run - no columns exist
      mockDb.getAll.mockReturnValue([{ name: 'id' }]);
      await addBseFields(mockDb, mockStockLookupService);

      // Second run - all columns exist
      mockDb.getAll.mockReturnValue([
        { name: 'id' },
        { name: 'bse_short_name' },
        { name: 'scrip_name' },
        { name: 'isin_code' },
        { name: 'week_52_high' },
        { name: 'week_52_low' }
      ]);

      // Should not throw error
      await expect(addBseFields(mockDb, mockStockLookupService)).resolves.not.toThrow();
    });
  });
});
