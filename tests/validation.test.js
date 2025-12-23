// Tests for validation utilities
const { 
  isValidVideoUrl, 
  isValidTikTokPage, 
  sanitizeUsername, 
  sanitizeVideoId,
  sanitizeForHtml,
  isValidFileSize,
  createSafeFilename 
} = require('../src/utils/validation.js');

describe('Validation Utilities', () => {
  describe('isValidVideoUrl', () => {
    test('should accept valid TikTok CDN URLs', () => {
      const validUrls = [
        'https://v16-webapp.tiktokcdn.com/video.mp4',
        'https://v19.tiktokcdn-us.com/video/123.mp4',
        'https://pull-f3.tiktokcdn.com/video.mp4',
        'https://v16.muscdn.com/video.mp4'
      ];
      
      validUrls.forEach(url => {
        expect(isValidVideoUrl(url)).toBe(true);
      });
    });

    test('should reject non-HTTPS URLs', () => {
      expect(isValidVideoUrl('http://v16-webapp.tiktokcdn.com/video.mp4')).toBe(false);
    });

    test('should reject untrusted domains', () => {
      const invalidUrls = [
        'https://evil.com/video.mp4',
        'https://tiktok.fake.com/video.mp4',
        'https://malware.site/tiktokcdn.com/video.mp4'
      ];
      
      invalidUrls.forEach(url => {
        expect(isValidVideoUrl(url)).toBe(false);
      });
    });

    test('should handle invalid input gracefully', () => {
      expect(isValidVideoUrl(null)).toBe(false);
      expect(isValidVideoUrl(undefined)).toBe(false);
      expect(isValidVideoUrl('')).toBe(false);
      expect(isValidVideoUrl(123)).toBe(false);
      expect(isValidVideoUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidTikTokPage', () => {
    test('should accept valid TikTok page URLs', () => {
      const validUrls = [
        'https://www.tiktok.com/@username/video/123',
        'https://tiktok.com/foryou',
        'https://m.tiktok.com/v/123',
        'https://vm.tiktok.com/ABC123'
      ];
      
      validUrls.forEach(url => {
        expect(isValidTikTokPage(url)).toBe(true);
      });
    });

    test('should reject non-TikTok URLs', () => {
      expect(isValidTikTokPage('https://youtube.com')).toBe(false);
      expect(isValidTikTokPage('https://fake-tiktok.com')).toBe(false);
    });

    test('should handle invalid input', () => {
      expect(isValidTikTokPage(null)).toBe(false);
      expect(isValidTikTokPage('')).toBe(false);
    });
  });

  describe('sanitizeUsername', () => {
    test('should remove @ prefix', () => {
      expect(sanitizeUsername('@testuser')).toBe('testuser');
    });

    test('should remove HTML special characters', () => {
      expect(sanitizeUsername('user<script>')).toBe('userscript');
      expect(sanitizeUsername('user&test')).toBe('usertest');
    });

    test('should limit length to 50 characters', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeUsername(longName).length).toBe(50);
    });

    test('should return "unknown" for invalid input', () => {
      expect(sanitizeUsername(null)).toBe('unknown');
      expect(sanitizeUsername('')).toBe('unknown');
    });
  });

  describe('sanitizeVideoId', () => {
    test('should extract numeric ID', () => {
      expect(sanitizeVideoId('7123456789012345678')).toBe('7123456789012345678');
    });

    test('should remove non-numeric characters', () => {
      expect(sanitizeVideoId('abc123def456')).toBe('123456');
    });

    test('should return null for invalid input', () => {
      expect(sanitizeVideoId(null)).toBe(null);
      expect(sanitizeVideoId('')).toBe(null);
      expect(sanitizeVideoId('abcdef')).toBe(null);
    });
  });

  describe('sanitizeForHtml', () => {
    test('should escape HTML special characters', () => {
      expect(sanitizeForHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    test('should escape ampersand', () => {
      expect(sanitizeForHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('should handle empty/null input', () => {
      expect(sanitizeForHtml('')).toBe('');
      expect(sanitizeForHtml(null)).toBe('');
    });
  });

  describe('isValidFileSize', () => {
    test('should accept files under max size', () => {
      expect(isValidFileSize(100 * 1024 * 1024, 500)).toBe(true); // 100MB
      expect(isValidFileSize(499 * 1024 * 1024, 500)).toBe(true); // 499MB
    });

    test('should reject files over max size', () => {
      expect(isValidFileSize(600 * 1024 * 1024, 500)).toBe(false); // 600MB
    });

    test('should use default 500MB limit', () => {
      expect(isValidFileSize(400 * 1024 * 1024)).toBe(true);
      expect(isValidFileSize(600 * 1024 * 1024)).toBe(false);
    });

    test('should reject invalid size values', () => {
      expect(isValidFileSize(0)).toBe(false);
      expect(isValidFileSize(-100)).toBe(false);
      expect(isValidFileSize('100')).toBe(false);
    });
  });

  describe('createSafeFilename', () => {
    test('should create filename with sanitized components', () => {
      const filename = createSafeFilename({
        username: '@testuser',
        videoId: '7123456789012345678'
      });
      
      expect(filename).toMatch(/^tiktok_@testuser_7123456789012345678_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.mp4$/);
    });

    test('should handle missing data', () => {
      const filename = createSafeFilename({});
      expect(filename).toContain('unknown');
      expect(filename).toContain('video');
    });
  });
});
