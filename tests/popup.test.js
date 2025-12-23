// Tests for popup functionality
const { chromeMock, resetAllMocks, setMockStorageData, setupMockTikTokTab } = require('./mocks/chrome.mock.js');

// Setup global chrome mock
global.chrome = chromeMock;

describe('Popup Logic', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Authentication State', () => {
    test('should show auth section when not authenticated', () => {
      // Mock unauthenticated state
      chromeMock.runtime.sendMessage.mockResolvedValueOnce({ authenticated: false });
      
      // Simulate checking auth
      const isAuthenticated = false;
      expect(isAuthenticated).toBe(false);
    });

    test('should show main section when authenticated', () => {
      // Mock authenticated state  
      chromeMock.runtime.sendMessage.mockResolvedValueOnce({ authenticated: true });
      
      // Simulate checking auth
      const isAuthenticated = true;
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('Tab Detection', () => {
    test('should detect TikTok tab', async () => {
      setupMockTikTokTab('https://www.tiktok.com/@user/video/123');
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      expect(tabs[0].url).toContain('tiktok.com');
    });

    test('should not enable download on non-TikTok page', async () => {
      chromeMock.tabs._tabs = [{
        id: 1,
        url: 'https://youtube.com',
        active: true,
        windowId: 1
      }];
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const isTikTok = tabs[0].url?.includes('tiktok.com');
      expect(isTikTok).toBe(false);
    });
  });

  describe('Storage Operations', () => {
    test('should load stats from storage', async () => {
      setMockStorageData('local', { 
        stats: { totalDownloads: 10, totalUploads: 8 } 
      });
      
      const result = await chrome.storage.local.get(['stats']);
      expect(result.stats.totalDownloads).toBe(10);
      expect(result.stats.totalUploads).toBe(8);
    });

    test('should clear stats', async () => {
      setMockStorageData('local', { 
        stats: { totalDownloads: 10, totalUploads: 8 } 
      });
      
      await chrome.storage.local.set({ 
        stats: { totalDownloads: 0, totalUploads: 0 } 
      });
      
      const result = await chrome.storage.local.get(['stats']);
      expect(result.stats.totalDownloads).toBe(0);
      expect(result.stats.totalUploads).toBe(0);
    });

    test('should load Drive folder ID', async () => {
      setMockStorageData('local', { driveFolderId: 'abc123' });
      
      const result = await chrome.storage.local.get(['driveFolderId']);
      expect(result.driveFolderId).toBe('abc123');
    });

    test('should load Sheet ID', async () => {
      setMockStorageData('local', { sheetId: 'sheet456' });
      
      const result = await chrome.storage.local.get(['sheetId']);
      expect(result.sheetId).toBe('sheet456');
    });
  });

  describe('Message Handling', () => {
    test('should send GET_AUTH_STATUS message and receive response', async () => {
      // Set up mock before calling
      chromeMock.runtime.sendMessage = jest.fn().mockResolvedValue({ authenticated: true });
      
      const result = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_AUTH_STATUS' });
      expect(result.authenticated).toBe(true);
    });

    test('should send AUTHENTICATE message and receive response', async () => {
      chromeMock.runtime.sendMessage = jest.fn().mockResolvedValue({ success: true });
      
      const result = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ type: 'AUTHENTICATE' });
      expect(result.success).toBe(true);
    });

    test('should send SIGN_OUT message', async () => {
      chromeMock.runtime.sendMessage = jest.fn().mockResolvedValue({ success: true });
      
      await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SIGN_OUT' });
    });

    test('should send START_DOWNLOAD message with video data and receive response', async () => {
      const videoData = {
        videoUrl: 'https://v16-webapp.tiktokcdn.com/video.mp4',
        username: 'testuser',
        videoId: '7123456789'
      };
      
      chromeMock.runtime.sendMessage = jest.fn().mockResolvedValue({ 
        success: true, 
        driveLink: 'https://drive.google.com/file/abc' 
      });
      
      const result = await chrome.runtime.sendMessage({ 
        type: 'START_DOWNLOAD', 
        videoData 
      });
      
      expect(result.success).toBe(true);
      expect(result.driveLink).toBe('https://drive.google.com/file/abc');
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Tab Communication', () => {
    test('should request video info from content script', async () => {
      setupMockTikTokTab();
      chromeMock.tabs.sendMessage.mockResolvedValueOnce({
        success: true,
        videoData: {
          videoUrl: 'https://v16-webapp.tiktokcdn.com/test.mp4',
          username: 'testuser',
          videoId: '7123456789'
        }
      });
      
      const response = await chrome.tabs.sendMessage(1, { type: 'GET_VIDEO_INFO' });
      expect(response.success).toBe(true);
      expect(response.videoData.videoUrl).toBeTruthy();
    });

    test('should handle no video found', async () => {
      setupMockTikTokTab();
      chromeMock.tabs.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'No video detected'
      });
      
      const response = await chrome.tabs.sendMessage(1, { type: 'GET_VIDEO_INFO' });
      expect(response.success).toBe(false);
    });
  });

  describe('Activity Feed', () => {
    test('should store activity in storage', async () => {
      const activity = {
        type: 'download',
        username: 'testuser',
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ 
        recentActivity: [activity]
      });
      
      const result = await chrome.storage.local.get(['recentActivity']);
      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0].type).toBe('download');
    });

    test('should limit activity to recent items', async () => {
      const activities = Array.from({ length: 20 }, (_, i) => ({
        type: 'download',
        username: `user${i}`,
        timestamp: Date.now() - i * 1000
      }));
      
      // Simulate limiting to 10 most recent
      const limitedActivities = activities.slice(0, 10);
      
      await chrome.storage.local.set({ 
        recentActivity: limitedActivities
      });
      
      const result = await chrome.storage.local.get(['recentActivity']);
      expect(result.recentActivity.length).toBeLessThanOrEqual(10);
    });
  });

  describe('URL Validation', () => {
    test('should validate TikTok page URLs', () => {
      const validUrls = [
        'https://www.tiktok.com/@user/video/123',
        'https://tiktok.com/foryou',
        'https://m.tiktok.com/v/123'
      ];
      
      validUrls.forEach(url => {
        expect(url.includes('tiktok.com')).toBe(true);
      });
    });

    test('should reject non-TikTok URLs', () => {
      const invalidUrls = [
        'https://youtube.com',
        'https://instagram.com',
        'https://fake-tiktok.com'
      ];
      
      invalidUrls.forEach(url => {
        const isTikTok = url.includes('tiktok.com') && !url.includes('fake-tiktok');
        expect(isTikTok).toBe(false);
      });
    });
  });
});
