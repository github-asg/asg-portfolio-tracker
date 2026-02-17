// Authentication Service Tests
/**
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock electron before importing database modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => {
      const mockPath = require('path');
      const mockOs = require('os');
      return mockPath.join(mockOs.tmpdir(), 'portfolio-test-auth');
    })
  }
}));

const databaseManager = require('../database/index');
const authenticationService = require('./authenticationService');

describe('Authentication Service', () => {
  const testDir = path.join(os.tmpdir(), 'portfolio-test-auth');

  beforeAll(async () => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Initialize database
    await databaseManager.initialize();
    authenticationService.initialize();
  });

  afterAll(async () => {
    // Shutdown services
    authenticationService.shutdown();
    await databaseManager.close();

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('User Creation', () => {
    test('should create a new user with valid credentials', async () => {
      const result = await authenticationService.createUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.created_at).toBeDefined();
    });

    test('should reject duplicate usernames', async () => {
      await authenticationService.createUser('uniqueuser', 'password123');

      await expect(
        authenticationService.createUser('uniqueuser', 'password456')
      ).rejects.toThrow('Username already exists');
    });

    test('should reject short passwords', async () => {
      await expect(
        authenticationService.createUser('newuser', 'short')
      ).rejects.toThrow('Password must be at least 6 characters long');
    });

    test('should reject empty username', async () => {
      await expect(
        authenticationService.createUser('', 'password123')
      ).rejects.toThrow('Username is required');
    });
  });

  describe('User Login', () => {
    beforeAll(async () => {
      await authenticationService.createUser('loginuser', 'correctpassword');
    });

    test('should login with correct credentials', async () => {
      const result = await authenticationService.login('loginuser', 'correctpassword');

      expect(result).toBeDefined();
      expect(result.sessionToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('loginuser');
      expect(result.expiresIn).toBe(30 * 60 * 1000);
    });

    test('should reject login with wrong password', async () => {
      await expect(
        authenticationService.login('loginuser', 'wrongpassword')
      ).rejects.toThrow('Invalid username or password');
    });

    test('should reject login with non-existent user', async () => {
      await expect(
        authenticationService.login('nonexistent', 'password123')
      ).rejects.toThrow('Invalid username or password');
    });

    test('should reject login with missing credentials', async () => {
      await expect(
        authenticationService.login('', 'password123')
      ).rejects.toThrow('Username and password are required');
    });
  });

  describe('Session Management', () => {
    let sessionToken;
    let userId;

    beforeAll(async () => {
      const result = await authenticationService.createUser('sessionuser', 'password123');
      userId = result.id;

      const loginResult = await authenticationService.login('sessionuser', 'password123');
      sessionToken = loginResult.sessionToken;
    });

    test('should validate active session', () => {
      const validation = authenticationService.validateSession(sessionToken);

      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(userId);
      expect(validation.username).toBe('sessionuser');
      expect(validation.expiresAt).toBeDefined();
    });

    test('should reject invalid session token', () => {
      const validation = authenticationService.validateSession('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid session token');
    });

    test('should refresh session token', () => {
      const refreshResult = authenticationService.refreshSession(sessionToken);

      expect(refreshResult).toBeDefined();
      expect(refreshResult.sessionToken).toBeDefined();
      expect(refreshResult.sessionToken).not.toBe(sessionToken);
      expect(refreshResult.expiresIn).toBe(30 * 60 * 1000);

      // Old token should be invalid
      const oldValidation = authenticationService.validateSession(sessionToken);
      expect(oldValidation.valid).toBe(false);

      // New token should be valid
      const newValidation = authenticationService.validateSession(refreshResult.sessionToken);
      expect(newValidation.valid).toBe(true);

      // Update sessionToken for next tests
      sessionToken = refreshResult.sessionToken;
    });

    test('should logout user', async () => {
      const loginResult = await authenticationService.login('sessionuser', 'password123');
      const token = loginResult.sessionToken;

      const logoutResult = authenticationService.logout(token);
      expect(logoutResult).toBe(true);

      // Token should be invalid after logout
      const validation = authenticationService.validateSession(token);
      expect(validation.valid).toBe(false);
    });

    test('should get current user info', async () => {
      const loginResult = await authenticationService.login('sessionuser', 'password123');
      const token = loginResult.sessionToken;

      const user = authenticationService.getCurrentUser(token);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.username).toBe('sessionuser');
      expect(user.created_at).toBeDefined();
    });
  });

  describe('Password Management', () => {
    let sessionToken;

    beforeAll(async () => {
      await authenticationService.createUser('pwduser', 'oldpassword');
      const loginResult = await authenticationService.login('pwduser', 'oldpassword');
      sessionToken = loginResult.sessionToken;
    });

    test('should change password with correct current password', async () => {
      const result = await authenticationService.changePassword(
        sessionToken,
        'oldpassword',
        'newpassword123'
      );

      expect(result).toBe(true);

      // Should be able to login with new password
      const loginResult = await authenticationService.login('pwduser', 'newpassword123');
      expect(loginResult.sessionToken).toBeDefined();
    });

    test('should reject password change with wrong current password', async () => {
      const loginResult = await authenticationService.login('pwduser', 'newpassword123');
      const token = loginResult.sessionToken;

      await expect(
        authenticationService.changePassword(token, 'wrongpassword', 'anotherpassword')
      ).rejects.toThrow('Current password is incorrect');
    });

    test('should reject password change with same password', async () => {
      const loginResult = await authenticationService.login('pwduser', 'newpassword123');
      const token = loginResult.sessionToken;

      await expect(
        authenticationService.changePassword(token, 'newpassword123', 'newpassword123')
      ).rejects.toThrow('New password must be different from current password');
    });

    test('should reject password change with short new password', async () => {
      const loginResult = await authenticationService.login('pwduser', 'newpassword123');
      const token = loginResult.sessionToken;

      await expect(
        authenticationService.changePassword(token, 'newpassword123', 'short')
      ).rejects.toThrow('New password must be at least 6 characters long');
    });
  });

  describe('Session Cleanup', () => {
    test('should track active sessions', async () => {
      const initialCount = authenticationService.getActiveSessionsCount();

      await authenticationService.createUser('cleanupuser1', 'password123');
      const login1 = await authenticationService.login('cleanupuser1', 'password123');

      await authenticationService.createUser('cleanupuser2', 'password123');
      const login2 = await authenticationService.login('cleanupuser2', 'password123');

      const newCount = authenticationService.getActiveSessionsCount();
      expect(newCount).toBeGreaterThan(initialCount);

      // Cleanup
      authenticationService.logout(login1.sessionToken);
      authenticationService.logout(login2.sessionToken);
    });

    test('should cleanup expired sessions', () => {
      // This test verifies the cleanup mechanism exists
      // Actual expiration would take 30 minutes
      authenticationService.cleanupExpiredSessions();
      // Should not throw any errors
    });
  });

  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'testpassword123';
      const hash1 = await authenticationService.hashPassword(password);
      const hash2 = await authenticationService.hashPassword(password);

      // Hashes should be different (due to salt)
      expect(hash1).not.toBe(hash2);

      // Both should match the original password
      const match1 = await authenticationService.comparePassword(password, hash1);
      const match2 = await authenticationService.comparePassword(password, hash2);

      expect(match1).toBe(true);
      expect(match2).toBe(true);
    });

    test('should reject incorrect password comparison', async () => {
      const password = 'correctpassword';
      const wrongPassword = 'wrongpassword';
      const hash = await authenticationService.hashPassword(password);

      const match = await authenticationService.comparePassword(wrongPassword, hash);
      expect(match).toBe(false);
    });
  });
});
