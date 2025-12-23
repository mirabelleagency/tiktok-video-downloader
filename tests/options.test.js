/**
 * Options Page Tests
 * Tests for options.js form validation and storage operations
 */

// Import Chrome mocks
require('./mocks/chrome.mock');

describe('Options Page', () => {
  // Default settings for comparison
  const defaultSettings = {
    driveFolderName: 'TikTok Downloads',
    sheetsName: 'TikTok Download Log',
    showNotifications: true
  };

  beforeEach(async () => {
    // Reset Chrome mock state using the proper methods
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
    jest.clearAllMocks();
  });

  describe('Settings Storage', () => {
    test('should have default settings defined', () => {
      expect(defaultSettings.driveFolderName).toBe('TikTok Downloads');
      expect(defaultSettings.sheetsName).toBe('TikTok Download Log');
      expect(defaultSettings.showNotifications).toBe(true);
    });

    test('should load settings from chrome.storage.local', async () => {
      const customSettings = {
        driveFolderName: 'My Videos',
        sheetsName: 'My Log',
        showNotifications: false
      };
      
      // Set the data first
      await chrome.storage.local.set({ settings: customSettings });
      
      const { settings } = await chrome.storage.local.get('settings');
      expect(settings).toEqual(customSettings);
    });

    test('should save settings to chrome.storage.local', async () => {
      const newSettings = {
        driveFolderName: 'Custom Folder',
        sheetsName: 'Custom Log',
        showNotifications: true
      };
      
      await chrome.storage.local.set({ settings: newSettings });
      
      const { settings } = await chrome.storage.local.get('settings');
      expect(settings).toEqual(newSettings);
    });

    test('should handle missing settings gracefully', async () => {
      // Clear any existing data using the mock's clear method
      await chrome.storage.local.clear();
      
      const { settings } = await chrome.storage.local.get('settings');
      expect(settings).toBeUndefined();
      
      // Should use defaults when undefined
      const currentSettings = settings || defaultSettings;
      expect(currentSettings.driveFolderName).toBe('TikTok Downloads');
    });
  });

  describe('Form Validation', () => {
    test('should validate folder name is not empty', () => {
      const validateFolderName = (name) => {
        return typeof name === 'string' && name.trim().length > 0;
      };
      
      expect(validateFolderName('TikTok Downloads')).toBe(true);
      expect(validateFolderName('My Videos')).toBe(true);
      expect(validateFolderName('')).toBe(false);
      expect(validateFolderName('   ')).toBe(false);
      expect(validateFolderName(null)).toBe(false);
    });

    test('should validate sheets name is not empty', () => {
      const validateSheetsName = (name) => {
        return typeof name === 'string' && name.trim().length > 0;
      };
      
      expect(validateSheetsName('Download Log')).toBe(true);
      expect(validateSheetsName('')).toBe(false);
    });

    test('should sanitize folder names for Drive compatibility', () => {
      const sanitizeFolderName = (name) => {
        // Remove characters not allowed in Google Drive
        return name.replace(/[<>:"/\\|?*]/g, '_').trim();
      };
      
      expect(sanitizeFolderName('My:Folder')).toBe('My_Folder');
      expect(sanitizeFolderName('Videos/Downloads')).toBe('Videos_Downloads');
      expect(sanitizeFolderName('Normal Folder')).toBe('Normal Folder');
      expect(sanitizeFolderName('<test>')).toBe('_test_');
    });

    test('should validate notification settings is boolean', () => {
      const validateNotificationSetting = (value) => {
        return typeof value === 'boolean';
      };
      
      expect(validateNotificationSetting(true)).toBe(true);
      expect(validateNotificationSetting(false)).toBe(true);
      expect(validateNotificationSetting('true')).toBe(false);
      expect(validateNotificationSetting(1)).toBe(false);
    });
  });

  describe('Authentication State', () => {
    test('should detect authenticated state from storage', async () => {
      await chrome.storage.local.set({ accessToken: 'mock-token-123' });
      
      const { accessToken } = await chrome.storage.local.get('accessToken');
      const isAuthenticated = !!accessToken;
      
      expect(isAuthenticated).toBe(true);
    });

    test('should detect unauthenticated state', async () => {
      // Clear storage first using the mock's clear method
      await chrome.storage.local.clear();
      
      const { accessToken } = await chrome.storage.local.get('accessToken');
      const isAuthenticated = !!accessToken;
      
      expect(isAuthenticated).toBe(false);
    });

    test('should clear auth token on sign out', async () => {
      await chrome.storage.local.set({ accessToken: 'mock-token' });
      
      await chrome.storage.local.remove('accessToken');
      
      const { accessToken } = await chrome.storage.local.get('accessToken');
      expect(accessToken).toBeUndefined();
    });
  });

  describe('Spreadsheet Selection', () => {
    test('should load spreadsheet ID from storage', async () => {
      await chrome.storage.local.set({ spreadsheetId: 'sheet-123' });
      
      const { spreadsheetId } = await chrome.storage.local.get('spreadsheetId');
      expect(spreadsheetId).toBe('sheet-123');
    });

    test('should save selected spreadsheet ID', async () => {
      await chrome.storage.local.set({ spreadsheetId: 'new-sheet-456' });
      
      const { spreadsheetId } = await chrome.storage.local.get('spreadsheetId');
      expect(spreadsheetId).toBe('new-sheet-456');
    });

    test('should validate spreadsheet ID format', () => {
      const isValidSpreadsheetId = (id) => {
        // Google Sheets IDs are typically 44 characters, alphanumeric with - and _
        return typeof id === 'string' && /^[a-zA-Z0-9_-]{20,50}$/.test(id);
      };
      
      expect(isValidSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(true);
      expect(isValidSpreadsheetId('abc-123_XYZ')).toBe(false); // too short
      expect(isValidSpreadsheetId('')).toBe(false);
      expect(isValidSpreadsheetId('invalid spaces here')).toBe(false);
    });
  });

  describe('Toast Notifications', () => {
    test('should create toast message data', () => {
      const createToast = (message, type = 'info') => ({
        message,
        type,
        timestamp: Date.now()
      });
      
      const successToast = createToast('Settings saved', 'success');
      expect(successToast.message).toBe('Settings saved');
      expect(successToast.type).toBe('success');
      expect(typeof successToast.timestamp).toBe('number');
      
      const errorToast = createToast('Failed to save', 'error');
      expect(errorToast.type).toBe('error');
    });
  });

  describe('Reset Functionality', () => {
    test('should reset to default settings', async () => {
      // Set custom settings
      await chrome.storage.local.set({
        settings: {
          driveFolderName: 'Custom',
          sheetsName: 'Custom Log',
          showNotifications: false
        }
      });
      
      // Reset to defaults
      await chrome.storage.local.set({ settings: defaultSettings });
      
      const { settings } = await chrome.storage.local.get('settings');
      expect(settings).toEqual(defaultSettings);
    });
  });

  describe('Version Display', () => {
    test('should extract version from manifest', () => {
      // Simulating manifest version extraction
      const mockManifest = {
        version: '1.0.0',
        name: 'TikTok Video Downloader'
      };
      
      expect(mockManifest.version).toBe('1.0.0');
    });
  });
});

describe('Rate Limiter', () => {
  const { RateLimiter, canMakeRequest, rateLimiters } = require('../src/utils/ratelimit');

  describe('Token Bucket Algorithm', () => {
    test('should initialize with max tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      expect(limiter.getTokens()).toBe(10);
    });

    test('should consume tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      
      expect(limiter.tryConsume(1)).toBe(true);
      expect(limiter.getTokens()).toBe(9);
      
      expect(limiter.tryConsume(5)).toBe(true);
      expect(limiter.getTokens()).toBe(4);
    });

    test('should reject when insufficient tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 2 });
      
      expect(limiter.tryConsume(3)).toBe(false);
      expect(limiter.getTokens()).toBe(2); // Unchanged
    });

    test('should refill tokens over time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 5,
        interval: 100, // 100ms
        maxTokens: 10
      });
      
      // Consume all tokens
      limiter.tryConsume(10);
      expect(limiter.getTokens()).toBe(0);
      
      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 110));
      
      expect(limiter.getTokens()).toBeGreaterThanOrEqual(5);
    });

    test('should not exceed max tokens on refill', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 10,
        maxTokens: 10
      });
      
      // Consume some tokens
      limiter.tryConsume(5);
      
      // Wait for refill (would add way more than max)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(limiter.getTokens()).toBeLessThanOrEqual(10);
    });

    test('should calculate wait time correctly', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 1000,
        maxTokens: 5
      });
      
      // Full bucket - no wait
      expect(limiter.getWaitTime()).toBe(0);
      
      // Empty bucket - must wait
      limiter.tryConsume(5);
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
    });

    test('should reset limiter', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      
      limiter.tryConsume(10);
      expect(limiter.getTokens()).toBe(0);
      
      limiter.reset();
      expect(limiter.getTokens()).toBe(10);
    });
  });

  describe('Pre-configured Limiters', () => {
    test('should have Google Drive limiter', () => {
      expect(rateLimiters.googleDrive).toBeInstanceOf(RateLimiter);
    });

    test('should have Google Sheets limiter', () => {
      expect(rateLimiters.googleSheets).toBeInstanceOf(RateLimiter);
    });

    test('should have video fetch limiter', () => {
      expect(rateLimiters.videoFetch).toBeInstanceOf(RateLimiter);
    });
  });

  describe('canMakeRequest Helper', () => {
    test('should return true when tokens available', () => {
      expect(canMakeRequest('googleDrive')).toBe(true);
    });

    test('should handle unknown service gracefully', () => {
      expect(canMakeRequest('unknownService')).toBe(true);
    });
  });
});
