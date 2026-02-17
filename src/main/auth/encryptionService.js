// Encryption Service for sensitive data (API credentials, etc.)
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.saltLength = 16;
    this.tagLength = 16;
    this.iterations = 100000; // PBKDF2 iterations
  }

  /**
   * Derive encryption key from master password using PBKDF2
   */
  deriveKey(masterPassword, salt = null) {
    try {
      // Generate salt if not provided
      if (!salt) {
        salt = crypto.randomBytes(this.saltLength);
      }

      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(
        masterPassword,
        salt,
        this.iterations,
        this.keyLength,
        'sha256'
      );

      return { key, salt };
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data, masterPassword) {
    try {
      if (!data || !masterPassword) {
        throw new Error('Data and master password are required');
      }

      // Derive key
      const { key, salt } = this.deriveKey(masterPassword);

      // Generate IV
      const iv = crypto.randomBytes(12); // 96 bits for GCM

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt data
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine salt, iv, authTag, and encrypted data
      const result = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted: encrypted
      };

      return result;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData, masterPassword) {
    try {
      if (!encryptedData || !masterPassword) {
        throw new Error('Encrypted data and master password are required');
      }

      // Extract components
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const encrypted = encryptedData.encrypted;

      // Derive key using same salt
      const { key } = this.deriveKey(masterPassword, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Parse JSON
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }

  /**
   * Generate a secure random token
   */
  generateRandomToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      console.error('Random token generation failed:', error);
      throw error;
    }
  }

  /**
   * Hash data using SHA-256
   */
  hashData(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('Data hashing failed:', error);
      throw error;
    }
  }

  /**
   * Verify data integrity using HMAC
   */
  verifyIntegrity(data, signature, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Integrity verification failed:', error);
      throw error;
    }
  }

  /**
   * Create HMAC signature for data
   */
  createSignature(data, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      console.error('Signature creation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();
module.exports = encryptionService;
