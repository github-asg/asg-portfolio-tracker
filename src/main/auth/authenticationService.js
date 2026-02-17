// Authentication Service for Stock Portfolio Manager
const bcrypt = require('bcrypt');
const databaseManager = require('../database/index');

class AuthenticationService {
  constructor() {
    this.bcryptCostFactor = 10;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.activeSessions = new Map();
    this.sessionCleanupInterval = null;
  }

  /**
   * Initialize authentication service
   */
  initialize() {
    // Start session cleanup interval
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute

    console.log('Authentication service initialized');
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password) {
    try {
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const hash = await bcrypt.hash(password, this.bcryptCostFactor);
      return hash;
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw error;
    }
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password comparison failed:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(username, password) {
    try {
      // Validate inputs
      if (!username || username.trim().length === 0) {
        throw new Error('Username is required');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if user already exists
      const existingUser = databaseManager.getOne(
        'SELECT id FROM users WHERE username = ?',
        [username.trim()]
      );

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user in database
      const userId = await databaseManager.insert(
        'INSERT INTO users (username, password_hash, created_at, is_active) VALUES (?, ?, ?, ?)',
        [username.trim(), passwordHash, new Date().toISOString(), 1]
      );

      console.log(`User created: ${username} (ID: ${userId})`);

      return {
        id: userId,
        username: username.trim(),
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('User creation failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with username and password
   */
  async login(username, password) {
    try {
      // Validate inputs
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Get user from database
      const user = databaseManager.getOne(
        'SELECT id, username, password_hash, is_active FROM users WHERE username = ?',
        [username.trim()]
      );

      if (!user) {
        throw new Error('Invalid username or password');
      }

      if (!user.is_active) {
        throw new Error('User account is inactive');
      }

      // Compare password
      const passwordMatch = await this.comparePassword(password, user.password_hash);

      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await databaseManager.update(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [new Date().toISOString(), user.id]
      );

      // Create session
      const sessionToken = this.generateSessionToken();
      const session = {
        userId: user.id,
        username: user.username,
        token: sessionToken,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      };

      this.activeSessions.set(sessionToken, session);

      console.log(`User logged in: ${username}`);

      return {
        sessionToken,
        user: {
          id: user.id,
          username: user.username
        },
        expiresIn: this.sessionTimeout
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(sessionToken) {
    try {
      const session = this.activeSessions.get(sessionToken);

      if (!session) {
        throw new Error('Invalid session token');
      }

      this.activeSessions.delete(sessionToken);

      console.log(`User logged out: ${session.username}`);

      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Validate session token
   */
  validateSession(sessionToken) {
    try {
      const session = this.activeSessions.get(sessionToken);

      if (!session) {
        return { valid: false, error: 'Invalid session token' };
      }

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.activeSessions.delete(sessionToken);
        return { valid: false, error: 'Session expired' };
      }

      // Update last activity
      session.lastActivity = Date.now();

      return {
        valid: true,
        userId: session.userId,
        username: session.username,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('Session validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Refresh session token
   */
  refreshSession(sessionToken) {
    try {
      const session = this.activeSessions.get(sessionToken);

      if (!session) {
        throw new Error('Invalid session token');
      }

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.activeSessions.delete(sessionToken);
        throw new Error('Session expired');
      }

      // Create new session
      const newSessionToken = this.generateSessionToken();
      const newSession = {
        ...session,
        token: newSessionToken,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      };

      // Remove old session and add new one
      this.activeSessions.delete(sessionToken);
      this.activeSessions.set(newSessionToken, newSession);

      console.log(`Session refreshed for user: ${session.username}`);

      return {
        sessionToken: newSessionToken,
        expiresIn: this.sessionTimeout
      };
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get current user info from session
   */
  getCurrentUser(sessionToken) {
    try {
      const validation = this.validateSession(sessionToken);

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const user = databaseManager.getOne(
        'SELECT id, username, created_at, last_login FROM users WHERE id = ?',
        [validation.userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(sessionToken, currentPassword, newPassword) {
    try {
      // Validate session
      const validation = this.validateSession(sessionToken);

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get user
      const user = databaseManager.getOne(
        'SELECT id, password_hash FROM users WHERE id = ?',
        [validation.userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const passwordMatch = await this.comparePassword(currentPassword, user.password_hash);

      if (!passwordMatch) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in database
      await databaseManager.update(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, validation.userId]
      );

      console.log(`Password changed for user: ${validation.username}`);

      return true;
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  }

  /**
   * Generate a random session token
   */
  generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';

    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return token;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredTokens = [];

    for (const [token, session] of this.activeSessions) {
      if (now > session.expiresAt) {
        expiredTokens.push(token);
      }
    }

    for (const token of expiredTokens) {
      const session = this.activeSessions.get(token);
      this.activeSessions.delete(token);
      console.log(`Session expired for user: ${session.username}`);
    }

    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired sessions`);
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  /**
   * Shutdown authentication service
   */
  shutdown() {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }

    this.activeSessions.clear();
    console.log('Authentication service shut down');
  }
}

// Export singleton instance
const authenticationService = new AuthenticationService();
module.exports = authenticationService;
