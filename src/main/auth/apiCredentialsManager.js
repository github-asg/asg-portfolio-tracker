// API Credentials Manager for secure storage of API keys
const databaseManager = require('../database/index');
const encryptionService = require('./encryptionService');

class APICredentialsManager {
  /**
   * Save API credentials encrypted in database
   */
  async saveCredentials(userId, apiProvider, credentials, masterPassword) {
    try {
      if (!userId || !apiProvider || !credentials || !masterPassword) {
        throw new Error('All parameters are required');
      }

      // Encrypt credentials
      const encryptedData = encryptionService.encrypt(credentials, masterPassword);

      // Check if credentials already exist
      const existing = databaseManager.getOne(
        'SELECT id FROM api_settings WHERE user_id = ? AND provider = ?',
        [userId, apiProvider]
      );

      if (existing) {
        // Update existing credentials
        await databaseManager.update(
          `UPDATE api_settings 
           SET encrypted_data = ?, salt = ?, iv = ?, auth_tag = ?, updated_at = ?
           WHERE user_id = ? AND provider = ?`,
          [
            encryptedData.encrypted,
            encryptedData.salt,
            encryptedData.iv,
            encryptedData.authTag,
            new Date().toISOString(),
            userId,
            apiProvider
          ]
        );

        console.log(`API credentials updated for ${apiProvider}`);
      } else {
        // Insert new credentials
        await databaseManager.insert(
          `INSERT INTO api_settings 
           (user_id, provider, encrypted_data, salt, iv, auth_tag, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            apiProvider,
            encryptedData.encrypted,
            encryptedData.salt,
            encryptedData.iv,
            encryptedData.authTag,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );

        console.log(`API credentials saved for ${apiProvider}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to save API credentials:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt API credentials
   */
  getCredentials(userId, apiProvider, masterPassword) {
    try {
      if (!userId || !apiProvider || !masterPassword) {
        throw new Error('All parameters are required');
      }

      // Get encrypted credentials from database
      const record = databaseManager.getOne(
        `SELECT encrypted_data, salt, iv, auth_tag FROM api_settings 
         WHERE user_id = ? AND provider = ?`,
        [userId, apiProvider]
      );

      if (!record) {
        throw new Error(`No credentials found for ${apiProvider}`);
      }

      // Decrypt credentials
      const encryptedData = {
        encrypted: record.encrypted_data,
        salt: record.salt,
        iv: record.iv,
        authTag: record.auth_tag
      };

      const credentials = encryptionService.decrypt(encryptedData, masterPassword);

      return credentials;
    } catch (error) {
      console.error('Failed to retrieve API credentials:', error);
      throw error;
    }
  }

  /**
   * Delete API credentials
   */
  async deleteCredentials(userId, apiProvider) {
    try {
      if (!userId || !apiProvider) {
        throw new Error('User ID and API provider are required');
      }

      const changes = await databaseManager.delete(
        'DELETE FROM api_settings WHERE user_id = ? AND provider = ?',
        [userId, apiProvider]
      );

      if (changes === 0) {
        throw new Error(`No credentials found for ${apiProvider}`);
      }

      console.log(`API credentials deleted for ${apiProvider}`);
      return true;
    } catch (error) {
      console.error('Failed to delete API credentials:', error);
      throw error;
    }
  }

  /**
   * List all API providers for a user
   */
  listProviders(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const providers = databaseManager.getAll(
        `SELECT provider, created_at, updated_at FROM api_settings 
         WHERE user_id = ? ORDER BY provider`,
        [userId]
      );

      return providers;
    } catch (error) {
      console.error('Failed to list API providers:', error);
      throw error;
    }
  }

  /**
   * Check if credentials exist for a provider
   */
  hasCredentials(userId, apiProvider) {
    try {
      if (!userId || !apiProvider) {
        throw new Error('User ID and API provider are required');
      }

      const record = databaseManager.getOne(
        'SELECT id FROM api_settings WHERE user_id = ? AND provider = ?',
        [userId, apiProvider]
      );

      return !!record;
    } catch (error) {
      console.error('Failed to check credentials:', error);
      throw error;
    }
  }

  /**
   * Validate API credentials by testing connection
   */
  async validateCredentials(apiProvider, credentials) {
    try {
      if (!apiProvider || !credentials) {
        throw new Error('API provider and credentials are required');
      }

      // Normalize provider name
      const normalizedProvider = apiProvider.toLowerCase().replace('icici_', '');

      // Provider-specific validation
      switch (normalizedProvider) {
        case 'breeze':
          return await this.validateBreezeCredentials(credentials);
        default:
          throw new Error(`Unknown API provider: ${apiProvider}`);
      }
    } catch (error) {
      console.error('Credential validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate Breeze API credentials
   */
  async validateBreezeCredentials(credentials) {
    try {
      const { appKey, secretKey, apiSession } = credentials;
      
      if (!appKey || !secretKey || !apiSession) {
        throw new Error('AppKey, SecretKey, and API Session are required for Breeze API');
      }

      // Initialize Breeze client (use singleton instance)
      const breezeClient = require('../api/breezeClient');
      
      // Initialize with credentials
      breezeClient.initialize(appKey, secretKey, apiSession);
      
      // Test connection
      const result = await breezeClient.testConnection();
      
      if (result.success) {
        console.log('✓ Breeze API credentials validated successfully');
        console.log('✓ Breeze client remains initialized for use');
        return {
          success: true,
          message: 'Credentials validated successfully',
          userDetails: result.userDetails
        };
      } else {
        throw new Error(result.message || 'Credential validation failed');
      }
    } catch (error) {
      console.error('Breeze credential validation failed:', error);
      throw new Error(`Breeze API validation failed: ${error.message}`);
    }
  }

  /**
   * Initialize Breeze client with saved credentials
   * This should be called after retrieving credentials from storage
   */
  async initializeBreezeClient(userId, masterPassword) {
    try {
      console.log('Initializing Breeze client with saved credentials...');
      
      // Get saved credentials
      const credentials = this.getCredentials(userId, 'breeze', masterPassword);
      
      if (!credentials || !credentials.appKey || !credentials.secretKey || !credentials.apiSession) {
        throw new Error('Breeze credentials not found or incomplete');
      }

      // Initialize Breeze client
      const breezeClient = require('../api/breezeClient');
      breezeClient.initialize(credentials.appKey, credentials.secretKey, credentials.apiSession);
      
      // Get session token
      await breezeClient.getCustomerDetails();
      
      console.log('✓ Breeze client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Breeze client:', error);
      throw error;
    }
  }
}

// Export singleton instance
const apiCredentialsManager = new APICredentialsManager();
module.exports = apiCredentialsManager;
