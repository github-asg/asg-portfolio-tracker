const axios = require('axios');
const crypto = require('crypto');

class BreezeClient {
  constructor() {
    this.baseURL = 'https://api.icicidirect.com/breezeapi/api/v1';
    this.appKey = null;
    this.secretKey = null;
    this.sessionToken = null;
    this.apiSession = null;
  }

  /**
   * Initialize with API credentials
   */
  initialize(appKey, secretKey, apiSession) {
    this.appKey = appKey;
    this.secretKey = secretKey;
    this.apiSession = apiSession;
    console.log('Breeze client initialized with credentials');
  }

  /**
   * Get customer details and session token
   */
  async getCustomerDetails() {
    try {
      if (!this.appKey || !this.apiSession) {
        throw new Error('AppKey and API Session are required');
      }

      console.log('Getting customer details...');
      console.log('AppKey available:', !!this.appKey);
      console.log('API Session available:', !!this.apiSession);

      const payload = JSON.stringify({
        SessionToken: this.apiSession,
        AppKey: this.appKey
      });

      const response = await axios({
        method: 'GET',
        url: `${this.baseURL}/customerdetails`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: payload
      });

      console.log('Customer details response status:', response.status);
      console.log('Customer details response:', response.data);

      if (response.data && response.data.Success) {
        this.sessionToken = response.data.Success.session_token;
        console.log('✓ Session token obtained successfully');
        return response.data.Success;
      } else {
        const errorMsg = response.data.Error || 'Unknown error';
        console.error('Customer details API error:', errorMsg);
        throw new Error('Failed to get customer details: ' + errorMsg);
      }
    } catch (error) {
      console.error('Customer details error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error('Failed to get customer details: ' + error.message);
    }
  }

  /**
   * Generate checksum for API requests
   */
  generateChecksum(timestamp, payload) {
    const data = timestamp + payload + this.secretKey;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(method, endpoint, data = {}) {
    try {
      if (!this.sessionToken) {
        await this.getCustomerDetails();
      }

      const timestamp = new Date().toISOString().slice(0, 19) + '.000Z';
      const payload = JSON.stringify(data, null, 0);
      const checksum = this.generateChecksum(timestamp, payload);

      const headers = {
        'Content-Type': 'application/json',
        'X-Checksum': 'token ' + checksum,
        'X-Timestamp': timestamp,
        'X-AppKey': this.appKey,
        'X-SessionToken': this.sessionToken
      };

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
        data: payload
      };

      const response = await axios(config);
      
      if (response.data && response.data.Status === 200) {
        return response.data.Success;
      } else {
        throw new Error(response.data.Error || 'API request failed');
      }
    } catch (error) {
      console.error(`API request failed (${method} ${endpoint}):`, error.message);
      throw error;
    }
  }

  /**
   * Get historical chart data using v2 API (used for current prices)
   */
  async getHistoricalChartsV2(stockCode, exchangeCode = 'BSE', interval = '1day', fromDate = null, toDate = null) {
    try {
      console.log(`=== Starting getHistoricalChartsV2 for ${stockCode} ===`);
      console.log(`AppKey available: ${!!this.appKey}`);
      console.log(`SessionToken available: ${!!this.sessionToken}`);
      
      if (!this.appKey || !this.sessionToken) {
        throw new Error('API credentials not properly initialized. AppKey or SessionToken missing.');
      }

      // Use today's date if not provided
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const fromDateStr = fromDate || todayStart.toISOString();
      const toDateStr = toDate || todayEnd.toISOString();

      // Build query parameters for v2 API
      const params = new URLSearchParams({
        exch_code: exchangeCode,
        stock_code: stockCode,
        from_date: fromDateStr,
        to_date: toDateStr,
        interval: interval,
        product_type: 'cash'
      });

      const url = `https://breezeapi.icicidirect.com/api/v2/historicalcharts?${params.toString()}`;
      
      console.log(`Getting historical charts v2 for ${stockCode} on ${exchangeCode}`);
      console.log(`URL: ${url}`);
      console.log(`From: ${fromDateStr}, To: ${toDateStr}`);

      // Make direct axios call for v2 API (different base URL and auth)
      const headers = {
        'Content-Type': 'application/json',
        'apiKey': this.appKey,
        'X-SessionToken': this.sessionToken
      };

      console.log(`Request headers:`, { ...headers, 'X-SessionToken': '***masked***' });

      const response = await axios.get(url, { headers });
      
      console.log(`HTTP Status: ${response.status}`);
      console.log(`Raw historical charts v2 response for ${stockCode}:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.Success) {
        console.log(`✓ Successfully got ${response.data.Success.length} data points for ${stockCode}`);
        return response.data.Success;
      } else {
        console.error(`API Error for ${stockCode}:`, response.data.Error || 'Unknown error');
        throw new Error(response.data.Error || 'API request failed');
      }
    } catch (error) {
      console.error(`Get historical charts v2 error for ${stockCode}:`, error.message);
      if (error.response) {
        console.error(`HTTP Status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get single stock quote using historical charts v2 API
   */
  async getStockQuote(symbol, exchange = 'BSE') {
    try {
      console.log(`=== Getting stock quote for ${symbol} using v2 API ===`);
      console.log(`API Status:`, this.getStatus());
      
      const now = new Date();
      const currentHour = now.getHours();
      
      // Determine starting point based on time
      // If after 4 PM (16:00), start with today (day 0)
      // Otherwise, start with yesterday (day 1)
      const startDaysBack = currentHour >= 16 ? 0 : 1;
      
      console.log(`=== DATE CALCULATION DEBUG ===`);
      console.log(`Current Date/Time: ${now.toString()}`);
      console.log(`Current Hour (24h format): ${currentHour}`);
      console.log(`Is after 4 PM? ${currentHour >= 16}`);
      console.log(`Starting days back: ${startDaysBack}`);
      console.log(`============================`);
      
      // Try today first if after 4 PM, then go back up to 5 days to find data
      for (let daysBack = startDaysBack; daysBack <= 5; daysBack++) {
        try {
          // Calculate target date by going back daysBack days from today
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - daysBack);
          
          // Format as YYYY-MM-DD for the API
          const year = targetDate.getFullYear();
          const month = String(targetDate.getMonth() + 1).padStart(2, '0');
          const day = String(targetDate.getDate()).padStart(2, '0');
          
          const fromDateStr = `${year}-${month}-${day}T00:00:00.000Z`;
          const toDateStr = `${year}-${month}-${day}T23:59:59.000Z`;
          
          console.log(`Attempt ${daysBack}: Target date = ${year}-${month}-${day}`);
          console.log(`From: ${fromDateStr}`);
          console.log(`To: ${toDateStr}`);
          
          const result = await this.getHistoricalChartsV2(
            symbol, 
            exchange, 
            '1day',
            fromDateStr,
            toDateStr
          );
          
          console.log(`Raw result for ${symbol} (${daysBack} days back):`, result);
          
          // Transform the result to match expected format
          if (result && Array.isArray(result) && result.length > 0) {
            // Get the latest data point
            const latestData = result[result.length - 1];
            console.log(`Processing latest data for ${symbol}:`, latestData);
            
            const transformedQuote = {
              symbol: symbol,
              exchange: exchange,
              price: parseFloat(latestData.close || 0), // Use close price as LTP
              bid: 0, // Not available in historical data
              ask: 0, // Not available in historical data
              high: parseFloat(latestData.high || 0),
              low: parseFloat(latestData.low || 0),
              open: parseFloat(latestData.open || 0),
              close: parseFloat(latestData.close || 0),
              volume: parseInt(latestData.volume || 0),
              change: parseFloat(latestData.close || 0) - parseFloat(latestData.open || 0),
              changePercent: latestData.open ? ((parseFloat(latestData.close || 0) - parseFloat(latestData.open || 0)) / parseFloat(latestData.open || 0)) * 100 : 0,
              timestamp: new Date().toISOString(),
              dataDate: latestData.datetime || targetDate.toISOString()
            };
            
            console.log(`✓ Found data for ${symbol} from ${daysBack} days back (${year}-${month}-${day})`);
            console.log(`Transformed quote for ${symbol}:`, transformedQuote);
            return transformedQuote;
          }
        } catch (dayError) {
          console.warn(`Error fetching data for ${daysBack} days back:`, dayError.message);
          // Continue to next day
        }
      }
      
      // If we get here, no data was found for any of the days
      console.error(`No historical data found for ${symbol} in the last 5 days`);
      throw new Error(`No historical data received for ${symbol} in the last 5 days`);
    } catch (error) {
      console.error(`Get stock quote error for ${symbol}:`, error.message);
      console.error(`Full error:`, error);
      throw error;
    }
  }

  /**
   * Get multiple stock quotes
   */
  async getMultipleQuotes(symbols, exchange = 'BSE') {
    try {
      const quotes = [];
      
      // Get quotes for each symbol (ICICI Breeze API doesn't support batch requests)
      for (const symbol of symbols) {
        try {
          const quote = await this.getStockQuote(symbol, exchange);
          quotes.push(quote);
        } catch (error) {
          // Add error quote for failed symbols
          quotes.push({
            symbol: symbol,
            exchange: exchange,
            error: error.message
          });
        }
      }
      
      return quotes;
    } catch (error) {
      console.error('Get multiple quotes error:', error.message);
      throw error;
    }
  }

  /**
   * Get market time information
   */
  getMarketTimeInfo() {
    try {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Market hours: 9:15 AM to 3:30 PM IST (Monday to Friday)
      const marketOpen = 915;  // 9:15 AM
      const marketClose = 1530; // 3:30 PM
      
      let status = 'closed';
      let isOpen = false;
      let nextChange = '';
      let timeToNext = '';
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
        status = 'weekend';
        nextChange = 'Monday 9:15 AM';
      } else {
        // Weekday
        if (currentTime < marketOpen) {
          status = 'pre-market';
          nextChange = 'Market opens at 9:15 AM';
          const minutesToOpen = (marketOpen - currentTime);
          timeToNext = `${Math.floor(minutesToOpen / 100)}h ${minutesToOpen % 100}m`;
        } else if (currentTime >= marketOpen && currentTime <= marketClose) {
          status = 'open';
          isOpen = true;
          nextChange = 'Market closes at 3:30 PM';
          const minutesToClose = (marketClose - currentTime);
          timeToNext = `${Math.floor(minutesToClose / 100)}h ${minutesToClose % 100}m`;
        } else {
          status = 'post-market';
          nextChange = 'Next trading day 9:15 AM';
        }
      }
      
      return {
        status,
        isOpen,
        nextChange,
        timeToNext,
        marketOpen: '9:15 AM',
        marketClose: '3:30 PM',
        timezone: 'IST'
      };
    } catch (error) {
      console.error('Get market time info error:', error.message);
      return {
        status: 'unknown',
        isOpen: false,
        error: error.message
      };
    }
  }

  /**
   * Get API connection status
   */
  getStatus() {
    try {
      return {
        connected: !!(this.appKey && this.sessionToken),
        appKey: !!this.appKey,
        sessionToken: !!this.sessionToken,
        apiSession: !!this.apiSession,
        lastError: null
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        lastError: error.message
      };
    }
  }

  /**
   * Get portfolio holdings
   */
  async getPortfolioHoldings(exchangeCode = 'BSE') {
    try {
      const data = {
        exchange_code: exchangeCode,
        from_date: '',
        to_date: '',
        stock_code: '',
        portfolio_type: ''
      };

      return await this.makeRequest('GET', '/portfolioholdings', data);
    } catch (error) {
      console.error('Get portfolio holdings error:', error.message);
      throw error;
    }
  }

  /**
   * Get funds information
   */
  async getFunds() {
    try {
      return await this.makeRequest('GET', '/funds', {});
    } catch (error) {
      console.error('Get funds error:', error.message);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      console.log('Testing Breeze API connection...');
      
      // First get customer details to establish session
      const customerDetails = await this.getCustomerDetails();
      console.log('✓ Customer details retrieved');
      
      // Test with a simple API call
      const funds = await this.getFunds();
      console.log('✓ API connection test successful');
      
      return {
        success: true,
        message: 'Connection successful',
        userDetails: {
          userId: customerDetails.idirect_userid,
          userName: customerDetails.idirect_user_name,
          lastLogin: customerDetails.idirect_lastlogin_time
        }
      };
    } catch (error) {
      console.error('Connection test failed:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Export singleton instance
const breezeClient = new BreezeClient();
module.exports = breezeClient;