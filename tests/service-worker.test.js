// Tests for service worker functionality
const { chromeMock, resetAllMocks, setMockAuthToken, setMockStorageData } = require('./mocks/chrome.mock.js');

// Setup global chrome mock before importing service worker
global.chrome = chromeMock;

// Mock fetch API
global.fetch = jest.fn();

describe('Service Worker', () => {
  beforeEach(() => {
    resetAllMocks();
    fetch.mockClear();
  });

  describe('Chrome API Setup', () => {
    test('chrome.storage.sync.get should work', async () => {
      setMockStorageData('sync', { testKey: 'testValue' });
      
      const result = await chrome.storage.sync.get(['testKey']);
      expect(result.testKey).toBe('testValue');
    });

    test('chrome.storage.sync.set should store data', async () => {
      await chrome.storage.sync.set({ newKey: 'newValue' });
      
      const result = await chrome.storage.sync.get(['newKey']);
      expect(result.newKey).toBe('newValue');
    });

    test('chrome.runtime.sendMessage should work', async () => {
      chromeMock.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      
      const response = await chrome.runtime.sendMessage({ type: 'TEST' });
      expect(response.success).toBe(true);
    });
  });

  describe('Authentication Flow', () => {
    test('chrome.identity.getAuthToken should return token when cached', async () => {
      setMockAuthToken('cached-test-token');
      
      const result = await chrome.identity.getAuthToken({ interactive: false });
      expect(result).toBe('cached-test-token');
    });

    test('chrome.identity.getAuthToken should return null when no token', async () => {
      setMockAuthToken(null);
      
      const result = await chrome.identity.getAuthToken({ interactive: false });
      expect(result).toBe(null);
    });

    test('chrome.identity.removeCachedAuthToken should clear token', async () => {
      setMockAuthToken('token-to-remove');
      
      await chrome.identity.removeCachedAuthToken({ token: 'token-to-remove' });
      
      // After removal, should return null
      const result = await chrome.identity.getAuthToken({ interactive: false });
      expect(result).toBe(null);
    });
  });

  describe('Tab Management', () => {
    test('chrome.tabs.query should find tabs by URL pattern', async () => {
      const tabs = await chrome.tabs.query({ url: '*://*.tiktok.com/*' });
      expect(tabs).toBeInstanceOf(Array);
    });

    test('chrome.tabs.sendMessage should send message to tab', async () => {
      chromeMock.tabs.sendMessage.mockResolvedValueOnce({ received: true });
      
      const response = await chrome.tabs.sendMessage(1, { type: 'TEST' });
      expect(response.received).toBe(true);
    });
  });

  describe('Storage Operations', () => {
    test('should persist multiple values', async () => {
      await chrome.storage.sync.set({
        folderId: 'folder-123',
        spreadsheetId: 'sheet-456',
        autoLogEnabled: true
      });

      const result = await chrome.storage.sync.get(['folderId', 'spreadsheetId', 'autoLogEnabled']);
      expect(result.folderId).toBe('folder-123');
      expect(result.spreadsheetId).toBe('sheet-456');
      expect(result.autoLogEnabled).toBe(true);
    });

    test('should handle local storage separately from sync', async () => {
      await chrome.storage.sync.set({ syncKey: 'syncValue' });
      await chrome.storage.local.set({ localKey: 'localValue' });

      const syncResult = await chrome.storage.sync.get(['syncKey', 'localKey']);
      const localResult = await chrome.storage.local.get(['syncKey', 'localKey']);

      expect(syncResult.syncKey).toBe('syncValue');
      expect(syncResult.localKey).toBeUndefined();
      expect(localResult.localKey).toBe('localValue');
      expect(localResult.syncKey).toBeUndefined();
    });
  });

  describe('Script Injection', () => {
    test('chrome.scripting.executeScript should resolve', async () => {
      const result = await chrome.scripting.executeScript({
        target: { tabId: 1 },
        files: ['content/injected.js']
      });

      expect(result).toEqual([{ result: null }]);
    });
  });
});
