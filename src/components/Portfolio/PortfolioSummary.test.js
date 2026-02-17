import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioSummary from './PortfolioSummary';
import { useSession } from '../../context/SessionContext';

// Mock the SessionContext
jest.mock('../../context/SessionContext', () => ({
  useSession: jest.fn()
}));

// Mock window.electronAPI
const mockElectronAPI = {
  getPortfolioWithGains: jest.fn(),
  lookupStockByCode: jest.fn(),
  lookupStockByShortName: jest.fn(),
  onPriceUpdate: jest.fn(),
  removeAllListeners: jest.fn()
};

describe('PortfolioSummary - BSE Integration', () => {
  beforeEach(() => {
    window.electronAPI = mockElectronAPI;
    useSession.mockReturnValue({ sessionToken: 'test-token' });
    jest.clearAllMocks();
  });

  test('fetches and displays BSE data for holdings', async () => {
    // Mock portfolio data
    const mockPortfolio = {
      totalInvestment: 100000,
      currentValue: 120000,
      totalGainLoss: 20000,
      totalGainLossPercent: 20,
      holdingCount: 2,
      gainCount: 1,
      lossCount: 0,
      breakevenCount: 1,
      lastUpdated: new Date().toISOString(),
      holdings: [
        {
          symbol: '532454',
          quantity: 100,
          avgCost: 500,
          currentPrice: 600,
          totalCost: 50000,
          currentValue: 60000,
          gainLoss: 10000,
          gainLossPercent: 20
        }
      ]
    };

    // Mock BSE data
    const mockBseData = {
      Token: '532454',
      ShortName: 'BHAAIR',
      ScripName: 'BHARTI AIRTEL LTD',
      ISINCode: 'INE397D01024',
      '52WeeksHigh': 850.00,
      '52WeeksLow': 650.00
    };

    mockElectronAPI.getPortfolioWithGains.mockResolvedValue(mockPortfolio);
    mockElectronAPI.lookupStockByCode.mockResolvedValue({
      success: true,
      data: mockBseData
    });

    render(<PortfolioSummary />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('BHARTI AIRTEL LTD')).toBeInTheDocument();
    });

    // Verify BSE data is displayed
    expect(screen.getByText('BHAAIR')).toBeInTheDocument();
    expect(screen.getByText(/ISIN: INE397D01024/)).toBeInTheDocument();
    
    // Verify API calls
    expect(mockElectronAPI.getPortfolioWithGains).toHaveBeenCalledWith('test-token');
    expect(mockElectronAPI.lookupStockByCode).toHaveBeenCalledWith('532454');
  });

  test('displays unmapped indicator when BSE data not found', async () => {
    const mockPortfolio = {
      totalInvestment: 50000,
      currentValue: 55000,
      totalGainLoss: 5000,
      totalGainLossPercent: 10,
      holdingCount: 1,
      gainCount: 1,
      lossCount: 0,
      breakevenCount: 0,
      lastUpdated: new Date().toISOString(),
      holdings: [
        {
          symbol: 'UNKNOWN',
          quantity: 50,
          avgCost: 1000,
          currentPrice: 1100,
          totalCost: 50000,
          currentValue: 55000,
          gainLoss: 5000,
          gainLossPercent: 10
        }
      ]
    };

    mockElectronAPI.getPortfolioWithGains.mockResolvedValue(mockPortfolio);
    mockElectronAPI.lookupStockByCode.mockResolvedValue({
      success: false,
      error: 'Stock not found',
      data: null
    });
    mockElectronAPI.lookupStockByShortName.mockResolvedValue({
      success: false,
      error: 'Stock not found',
      data: null
    });

    render(<PortfolioSummary />);

    await waitFor(() => {
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    // Verify unmapped indicator is shown
    expect(screen.getByText('(unmapped)')).toBeInTheDocument();
    
    // Verify both lookup methods were tried
    expect(mockElectronAPI.lookupStockByCode).toHaveBeenCalledWith('UNKNOWN');
    expect(mockElectronAPI.lookupStockByShortName).toHaveBeenCalledWith('UNKNOWN');
  });

  test('displays 52-week high and low values', async () => {
    const mockPortfolio = {
      totalInvestment: 100000,
      currentValue: 120000,
      totalGainLoss: 20000,
      totalGainLossPercent: 20,
      holdingCount: 1,
      gainCount: 1,
      lossCount: 0,
      breakevenCount: 0,
      lastUpdated: new Date().toISOString(),
      holdings: [
        {
          symbol: '500325',
          quantity: 100,
          avgCost: 1000,
          currentPrice: 1200,
          totalCost: 100000,
          currentValue: 120000,
          gainLoss: 20000,
          gainLossPercent: 20
        }
      ]
    };

    const mockBseData = {
      Token: '500325',
      ShortName: 'RELIANCE',
      ScripName: 'RELIANCE INDUSTRIES LTD',
      ISINCode: 'INE002A01018',
      '52WeeksHigh': 2856.00,
      '52WeeksLow': 2220.00
    };

    mockElectronAPI.getPortfolioWithGains.mockResolvedValue(mockPortfolio);
    mockElectronAPI.lookupStockByCode.mockResolvedValue({
      success: true,
      data: mockBseData
    });

    render(<PortfolioSummary />);

    await waitFor(() => {
      expect(screen.getByText('RELIANCE INDUSTRIES LTD')).toBeInTheDocument();
    });

    // Verify 52-week range is displayed
    expect(screen.getByText('H:')).toBeInTheDocument();
    expect(screen.getByText('L:')).toBeInTheDocument();
  });

  test('handles multiple stocks with mixed BSE data availability', async () => {
    const mockPortfolio = {
      totalInvestment: 150000,
      currentValue: 170000,
      totalGainLoss: 20000,
      totalGainLossPercent: 13.33,
      holdingCount: 2,
      gainCount: 2,
      lossCount: 0,
      breakevenCount: 0,
      lastUpdated: new Date().toISOString(),
      holdings: [
        {
          symbol: '532454',
          quantity: 100,
          avgCost: 500,
          currentPrice: 600,
          totalCost: 50000,
          currentValue: 60000,
          gainLoss: 10000,
          gainLossPercent: 20
        },
        {
          symbol: 'UNKNOWN',
          quantity: 100,
          avgCost: 1000,
          currentPrice: 1100,
          totalCost: 100000,
          currentValue: 110000,
          gainLoss: 10000,
          gainLossPercent: 10
        }
      ]
    };

    const mockBseData = {
      Token: '532454',
      ShortName: 'BHAAIR',
      ScripName: 'BHARTI AIRTEL LTD',
      ISINCode: 'INE397D01024',
      '52WeeksHigh': 850.00,
      '52WeeksLow': 650.00
    };

    mockElectronAPI.getPortfolioWithGains.mockResolvedValue(mockPortfolio);
    
    // First stock has BSE data
    mockElectronAPI.lookupStockByCode.mockImplementation((symbol) => {
      if (symbol === '532454') {
        return Promise.resolve({ success: true, data: mockBseData });
      }
      return Promise.resolve({ success: false, error: 'Stock not found', data: null });
    });
    
    mockElectronAPI.lookupStockByShortName.mockResolvedValue({
      success: false,
      error: 'Stock not found',
      data: null
    });

    render(<PortfolioSummary />);

    await waitFor(() => {
      expect(screen.getByText('BHARTI AIRTEL LTD')).toBeInTheDocument();
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    // Verify both stocks are displayed correctly
    expect(screen.getByText('BHAAIR')).toBeInTheDocument();
    expect(screen.getByText('(unmapped)')).toBeInTheDocument();
    
    // Verify lookup was called for both stocks
    expect(mockElectronAPI.lookupStockByCode).toHaveBeenCalledWith('532454');
    expect(mockElectronAPI.lookupStockByCode).toHaveBeenCalledWith('UNKNOWN');
  });
});
