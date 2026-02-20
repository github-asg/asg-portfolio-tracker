// Stock Age Histogram API Client
// Provides renderer process access to stock age histogram IPC channels

/**
 * Get age distribution for a specific stock
 * @param {Object} sessionToken - The session token
 * @param {string} stockSymbol - The stock symbol
 * @returns {Promise<Object>} Distribution data with buckets, quantities, percentages
 */
export async function getStockAgeDistribution(sessionToken, stockSymbol) {
  try {
    if (!window.electronAPI || !window.electronAPI.getStockAgeDistribution) {
      throw new Error('Electron API not available');
    }

    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    if (!stockSymbol) {
      throw new Error('Stock symbol is required');
    }

    const response = await window.electronAPI.getStockAgeDistribution(
      sessionToken,
      stockSymbol
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to get stock age distribution');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to get stock age distribution:', error);
    throw error;
  }
}

/**
 * Get age distribution for entire portfolio
 * @param {Object} sessionToken - The session token
 * @returns {Promise<Object>} Aggregated distribution data
 */
export async function getPortfolioAgeDistribution(sessionToken) {
  try {
    if (!window.electronAPI || !window.electronAPI.getPortfolioAgeDistribution) {
      throw new Error('Electron API not available');
    }

    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const response = await window.electronAPI.getPortfolioAgeDistribution(sessionToken);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get portfolio age distribution');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to get portfolio age distribution:', error);
    throw error;
  }
}

/**
 * Get detailed lot information for a specific bucket
 * @param {Object} sessionToken - The session token
 * @param {string} stockSymbol - The stock symbol
 * @param {string} bucketName - The age bucket name
 * @param {number} currentPrice - Current stock price (optional)
 * @returns {Promise<Object>} Bucket details with lot information
 */
export async function getBucketDetails(sessionToken, stockSymbol, bucketName, currentPrice = null) {
  try {
    if (!window.electronAPI || !window.electronAPI.getBucketDetails) {
      throw new Error('Electron API not available');
    }

    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    if (!stockSymbol) {
      throw new Error('Stock symbol is required');
    }

    if (!bucketName) {
      throw new Error('Bucket name is required');
    }

    const response = await window.electronAPI.getBucketDetails(
      sessionToken,
      stockSymbol,
      bucketName,
      currentPrice
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to get bucket details');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to get bucket details:', error);
    throw error;
  }
}
