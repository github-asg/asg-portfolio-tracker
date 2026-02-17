const fs = require('fs');
const path = require('path');
const BseScripLoader = require('./bseScripLoader');

describe('BseScripLoader', () => {
  let loader;
  let testFilePath;

  beforeEach(() => {
    loader = new BseScripLoader();
    testFilePath = path.join(process.cwd(), 'BSEScripMaster.txt');
  });

  afterEach(() => {
    // Clean up test files if created
    const testFiles = ['test-empty.txt', 'test-malformed.txt'];
    testFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('loadScripMaster', () => {
    test('should load and parse sample file with known records', async () => {
      // This test uses the actual BSEScripMaster.txt file
      const records = await loader.loadScripMaster();
      
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
      
      // Verify first record structure
      const firstRecord = records[0];
      expect(firstRecord).toHaveProperty('Token');
      expect(firstRecord).toHaveProperty('ShortName');
      expect(firstRecord).toHaveProperty('ScripName');
      expect(firstRecord).toHaveProperty('ISINCode');
      expect(firstRecord).toHaveProperty('52WeeksHigh');
      expect(firstRecord).toHaveProperty('52WeeksLow');
    });

    test('should handle missing file gracefully', async () => {
      // Create a loader with non-existent file path
      const tempLoader = new BseScripLoader();
      tempLoader.filePath = path.join(process.cwd(), 'non-existent-file.txt');
      
      const records = await tempLoader.loadScripMaster();
      
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBe(0);
    });

    test('should handle empty file', async () => {
      // Create temporary empty file
      const emptyFilePath = path.join(process.cwd(), 'test-empty.txt');
      fs.writeFileSync(emptyFilePath, '');
      
      const tempLoader = new BseScripLoader();
      tempLoader.filePath = emptyFilePath;
      
      const records = await tempLoader.loadScripMaster();
      
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBe(0);
    });
  });

  describe('parseLine', () => {
    test('should parse valid pipe-delimited line with quoted fields', () => {
      const line = '"800078","03D001","DR","11.10% GOI LOAN 07/04/2003",115.1,1,"800078",0,0,0,0,"CG1110S9803","11.10% GOI LOAN 07/04/2003","","","","","","","","","","",94.2,100,"INY019980013",104.65,104.3,104.65,104.3,"","","","CG1110S9803"';
      
      const record = loader.parseLine(line);
      
      expect(record.Token).toBe('800078');
      expect(record.ShortName).toBe('03D001');
      expect(record.Series).toBe('DR');
      expect(record.CompanyName).toBe('11.10% GOI LOAN 07/04/2003');
      expect(record.ScripName).toBe('11.10% GOI LOAN 07/04/2003');
      expect(record.ISINCode).toBe('INY019980013');
      expect(record['52WeeksHigh']).toBe(104.65);
      expect(record['52WeeksLow']).toBe(104.3);
    });

    test('should handle numeric fields correctly', () => {
      const line = '"800078","03D001","DR","Test Company",115.1,1,"800078",0,0,0,0,"CG1110S9803","Test Company","","","","","","","","","","",94.2,100,"INY019980013",104.65,104.3,104.65,104.3,"","","","CG1110S9803"';
      
      const record = loader.parseLine(line);
      
      expect(record.TickSize).toBe(115.1);
      expect(record.LotSize).toBe(1);
      expect(record.IssuePrice).toBe(94.2);
      expect(record.FaceValue).toBe(100);
    });

    test('should handle empty numeric fields as null', () => {
      const line = '"800078","03D001","DR","Test Company",,,"800078",0,0,0,0,"CG1110S9803","Test Company","","","","","","","","","","",,,,"INY019980013",,,,,,"","","","CG1110S9803"';
      
      const record = loader.parseLine(line);
      
      expect(record.TickSize).toBeNull();
      expect(record.LotSize).toBeNull();
      expect(record.IssuePrice).toBeNull();
      expect(record['52WeeksHigh']).toBeNull();
      expect(record['52WeeksLow']).toBeNull();
    });

    test('should handle non-numeric values in numeric fields', () => {
      const line = '"800078","03D001","DR","Test Company",invalid,abc,"800078",0,0,0,0,"CG1110S9803","Test Company","","","","","","","","","","",xyz,100,"INY019980013",not-a-number,also-invalid,104.65,104.3,"","","","CG1110S9803"';
      
      const record = loader.parseLine(line);
      
      expect(record.TickSize).toBeNull();
      expect(record.LotSize).toBeNull();
      expect(record.IssuePrice).toBeNull();
      expect(record['52WeeksHigh']).toBeNull();
      expect(record['52WeeksLow']).toBeNull();
    });
  });

  describe('validateRecord', () => {
    test('should validate record with all required fields', () => {
      const record = {
        Token: '800078',
        ShortName: '03D001',
        ScripName: 'Test Company',
        ISINCode: 'INY019980013'
      };
      
      expect(loader.validateRecord(record)).toBe(true);
    });

    test('should reject record missing Token', () => {
      const record = {
        Token: null,
        ShortName: '03D001',
        ScripName: 'Test Company'
      };
      
      expect(loader.validateRecord(record)).toBe(false);
    });

    test('should reject record missing ShortName', () => {
      const record = {
        Token: '800078',
        ShortName: null,
        ScripName: 'Test Company'
      };
      
      expect(loader.validateRecord(record)).toBe(false);
    });

    test('should reject record missing ScripName', () => {
      const record = {
        Token: '800078',
        ShortName: '03D001',
        ScripName: null
      };
      
      expect(loader.validateRecord(record)).toBe(false);
    });

    test('should accept record with valid ISIN code', () => {
      const record = {
        Token: '800078',
        ShortName: '03D001',
        ScripName: 'Test Company',
        ISINCode: 'INY019980013' // 12 characters
      };
      
      expect(loader.validateRecord(record)).toBe(true);
    });

    test('should accept but warn for invalid ISIN code format', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const record = {
        Token: '800078',
        ShortName: '03D001',
        ScripName: 'Test Company',
        ISINCode: 'INVALID' // Not 12 characters
      };
      
      expect(loader.validateRecord(record)).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid ISIN code format')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    test('should skip malformed lines and continue processing', async () => {
      const testContent = `"Token","ShortName","Series","CompanyName","TickSize","LotSize","ScripCode","MarketLot","BCastFlag","AVMBuyMargin","AVMSellMargin","ScripID","ScripName","GroupName","NdFlag","NDSDate","NDEDate","SuspStatus","avmflag","SuspensionReason","Suspensiondate","DateOfListing","DateOfDeListing","IssuePrice","FaceValue","ISINCode","52WeeksHigh","52WeeksLow","LifeTimeHigh","LifeTimeLow","HighDate","LowDate","MarginPercentage","ExchangeCode"
"800078","03D001","DR","Valid Company",115.1,1,"800078",0,0,0,0,"CG1110S9803","Valid Company","","","","","","","","","","",94.2,100,"INY019980013",104.65,104.3,104.65,104.3,"","","","CG1110S9803"
malformed line without proper quotes
"800079","03D002","DR","Another Valid",115.1,1,"800079",0,0,0,0,"CG1110S9804","Another Valid","","","","","","","","","","",94.2,100,"INY019980014",104.65,104.3,104.65,104.3,"","","","CG1110S9804"`;
      
      const testFile = path.join(process.cwd(), 'test-malformed.txt');
      fs.writeFileSync(testFile, testContent);
      
      const tempLoader = new BseScripLoader();
      tempLoader.filePath = testFile;
      
      const records = await tempLoader.loadScripMaster();
      
      // Should have 2 valid records, skipping the malformed line
      expect(records.length).toBe(2);
      expect(records[0].ShortName).toBe('03D001');
      expect(records[1].ShortName).toBe('03D002');
    });
  });
});
