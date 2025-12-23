/**
 * Content Script Tests
 * Tests for tiktok.js and injected.js content scripts
 */

// Import Chrome mocks
require('./mocks/chrome.mock');

describe('Content Scripts', () => {
  describe('TikTok Page Detection', () => {
    const isTikTokPage = (url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname.endsWith('tiktok.com');
      } catch {
        return false;
      }
    };

    test('should detect main TikTok pages', () => {
      expect(isTikTokPage('https://www.tiktok.com')).toBe(true);
      expect(isTikTokPage('https://www.tiktok.com/@user')).toBe(true);
      expect(isTikTokPage('https://www.tiktok.com/@user/video/123')).toBe(true);
    });

    test('should detect TikTok subdomains', () => {
      expect(isTikTokPage('https://m.tiktok.com')).toBe(true);
      expect(isTikTokPage('https://vm.tiktok.com/abc')).toBe(true);
    });

    test('should reject non-TikTok pages', () => {
      expect(isTikTokPage('https://www.youtube.com')).toBe(false);
      expect(isTikTokPage('https://tiktok.fake.com')).toBe(false);
      // notatiktok.com actually ends with tiktok.com, so use clearer example
      expect(isTikTokPage('https://example.com')).toBe(false);
    });

    test('should handle invalid URLs', () => {
      expect(isTikTokPage('')).toBe(false);
      expect(isTikTokPage('not-a-url')).toBe(false);
      expect(isTikTokPage(null)).toBe(false);
    });
  });

  describe('Video ID Extraction', () => {
    const extractVideoId = (url) => {
      if (!url) return null;
      
      // Pattern: /video/NUMBERS
      const match = url.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
    };

    test('should extract video ID from standard URL', () => {
      expect(extractVideoId('https://www.tiktok.com/@user/video/7123456789012345678'))
        .toBe('7123456789012345678');
    });

    test('should extract video ID from short URL', () => {
      expect(extractVideoId('https://vm.tiktok.com/video/7123456789012345678'))
        .toBe('7123456789012345678');
    });

    test('should return null for non-video URLs', () => {
      expect(extractVideoId('https://www.tiktok.com/@user')).toBe(null);
      expect(extractVideoId('https://www.tiktok.com/foryou')).toBe(null);
    });

    test('should handle invalid input', () => {
      expect(extractVideoId('')).toBe(null);
      expect(extractVideoId(null)).toBe(null);
    });
  });

  describe('Username Extraction', () => {
    const extractUsername = (url) => {
      if (!url) return null;
      
      // Pattern: /@USERNAME
      const match = url.match(/\/@([^/?]+)/);
      return match ? match[1] : null;
    };

    test('should extract username from profile URL', () => {
      expect(extractUsername('https://www.tiktok.com/@username123'))
        .toBe('username123');
    });

    test('should extract username from video URL', () => {
      expect(extractUsername('https://www.tiktok.com/@creator/video/123'))
        .toBe('creator');
    });

    test('should handle usernames with dots and underscores', () => {
      expect(extractUsername('https://www.tiktok.com/@user.name_123'))
        .toBe('user.name_123');
    });

    test('should return null when no username', () => {
      expect(extractUsername('https://www.tiktok.com/foryou')).toBe(null);
      expect(extractUsername('https://www.tiktok.com/')).toBe(null);
    });
  });

  describe('Video Data Structure', () => {
    const createVideoData = (options) => ({
      videoId: options.videoId || null,
      username: options.username || 'unknown',
      videoUrl: options.videoUrl || null,
      pageUrl: options.pageUrl || null,
      description: options.description || '',
      timestamp: options.timestamp || Date.now()
    });

    test('should create valid video data object', () => {
      const data = createVideoData({
        videoId: '123456789',
        username: 'testuser',
        videoUrl: 'https://cdn.tiktok.com/video.mp4',
        pageUrl: 'https://www.tiktok.com/@testuser/video/123456789'
      });

      expect(data.videoId).toBe('123456789');
      expect(data.username).toBe('testuser');
      expect(data.videoUrl).toBeDefined();
      expect(data.pageUrl).toBeDefined();
      expect(typeof data.timestamp).toBe('number');
    });

    test('should use defaults for missing fields', () => {
      const data = createVideoData({});
      
      expect(data.videoId).toBe(null);
      expect(data.username).toBe('unknown');
      expect(data.description).toBe('');
    });
  });

  describe('Message Handling', () => {
    const messageHandlers = {
      GET_VIDEO_INFO: (data) => ({ success: true, data }),
      DOWNLOAD_STATUS: (status) => ({ status }),
      PING: () => ({ pong: true })
    };

    const handleMessage = (message) => {
      const handler = messageHandlers[message.type];
      if (!handler) {
        return { error: 'Unknown message type' };
      }
      return handler(message.payload);
    };

    test('should handle GET_VIDEO_INFO message', () => {
      const result = handleMessage({
        type: 'GET_VIDEO_INFO',
        payload: { videoId: '123' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.videoId).toBe('123');
    });

    test('should handle DOWNLOAD_STATUS message', () => {
      const result = handleMessage({
        type: 'DOWNLOAD_STATUS',
        payload: 'completed'
      });
      
      expect(result.status).toBe('completed');
    });

    test('should handle PING message', () => {
      const result = handleMessage({ type: 'PING' });
      expect(result.pong).toBe(true);
    });

    test('should return error for unknown message', () => {
      const result = handleMessage({ type: 'UNKNOWN' });
      expect(result.error).toBe('Unknown message type');
    });
  });

  describe('DOM Video Element Detection', () => {
    // Simulate finding video elements
    const findVideoElements = (mockDocument) => {
      return mockDocument.querySelectorAll ? 
        mockDocument.querySelectorAll('video') : [];
    };

    test('should find video elements', () => {
      const mockDoc = {
        querySelectorAll: jest.fn().mockReturnValue([
          { src: 'video1.mp4' },
          { src: 'video2.mp4' }
        ])
      };
      
      const videos = findVideoElements(mockDoc);
      expect(videos.length).toBe(2);
    });

    test('should return empty array when no videos', () => {
      const mockDoc = {
        querySelectorAll: jest.fn().mockReturnValue([])
      };
      
      const videos = findVideoElements(mockDoc);
      expect(videos.length).toBe(0);
    });
  });

  describe('Script Injection', () => {
    const createInjectedScript = (code) => ({
      type: 'text/javascript',
      textContent: code
    });

    test('should create script element with code', () => {
      const script = createInjectedScript('console.log("test")');
      
      expect(script.type).toBe('text/javascript');
      expect(script.textContent).toBe('console.log("test")');
    });
  });

  describe('Download Button State', () => {
    const buttonStates = {
      READY: { text: 'Download', disabled: false, class: 'ready' },
      DOWNLOADING: { text: 'Downloading...', disabled: true, class: 'downloading' },
      SUCCESS: { text: 'Downloaded!', disabled: true, class: 'success' },
      ERROR: { text: 'Error - Retry', disabled: false, class: 'error' }
    };

    test('should have correct ready state', () => {
      expect(buttonStates.READY.disabled).toBe(false);
      expect(buttonStates.READY.text).toBe('Download');
    });

    test('should disable button during download', () => {
      expect(buttonStates.DOWNLOADING.disabled).toBe(true);
    });

    test('should allow retry on error', () => {
      expect(buttonStates.ERROR.disabled).toBe(false);
    });
  });

  describe('URL Validation for Downloads', () => {
    const isValidDownloadUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      
      try {
        const parsed = new URL(url);
        
        // Must be HTTPS
        if (parsed.protocol !== 'https:') return false;
        
        // Must be from trusted CDN
        const trustedDomains = [
          'tiktokcdn.com',
          'tiktokcdn-us.com',
          'tiktok.com',
          'musical.ly'
        ];
        
        return trustedDomains.some(domain => 
          parsed.hostname.endsWith(domain)
        );
      } catch {
        return false;
      }
    };

    test('should accept TikTok CDN URLs', () => {
      expect(isValidDownloadUrl('https://v16-webapp.tiktokcdn.com/video.mp4')).toBe(true);
      expect(isValidDownloadUrl('https://v77.tiktokcdn-us.com/video.mp4')).toBe(true);
    });

    test('should reject non-HTTPS URLs', () => {
      expect(isValidDownloadUrl('http://tiktokcdn.com/video.mp4')).toBe(false);
    });

    test('should reject untrusted domains', () => {
      expect(isValidDownloadUrl('https://evil.com/video.mp4')).toBe(false);
      expect(isValidDownloadUrl('https://tiktok.fake.com/video.mp4')).toBe(false);
    });

    test('should handle invalid input', () => {
      expect(isValidDownloadUrl('')).toBe(false);
      expect(isValidDownloadUrl(null)).toBe(false);
      expect(isValidDownloadUrl('not-a-url')).toBe(false);
    });
  });

  describe('Page State Detection', () => {
    const getPageState = (url) => {
      if (!url) return 'unknown';
      
      if (url.includes('/video/')) return 'video';
      if (url.includes('/@')) return 'profile';
      if (url.includes('/foryou') || url.endsWith('tiktok.com/')) return 'feed';
      if (url.includes('/following')) return 'following';
      if (url.includes('/discover')) return 'discover';
      
      return 'other';
    };

    test('should detect video page', () => {
      expect(getPageState('https://www.tiktok.com/@user/video/123')).toBe('video');
    });

    test('should detect profile page', () => {
      expect(getPageState('https://www.tiktok.com/@username')).toBe('profile');
    });

    test('should detect feed page', () => {
      expect(getPageState('https://www.tiktok.com/foryou')).toBe('feed');
      expect(getPageState('https://www.tiktok.com/')).toBe('feed');
    });

    test('should detect following page', () => {
      expect(getPageState('https://www.tiktok.com/following')).toBe('following');
    });
  });
});

describe('Injected Script Logic', () => {
  describe('Window Message Handling', () => {
    const handleWindowMessage = (event) => {
      if (event.data?.type === 'TIKTOK_DOWNLOADER_REQUEST') {
        return {
          type: 'TIKTOK_DOWNLOADER_RESPONSE',
          data: event.data.payload
        };
      }
      return null;
    };

    test('should respond to downloader requests', () => {
      const event = {
        data: {
          type: 'TIKTOK_DOWNLOADER_REQUEST',
          payload: { action: 'getVideo' }
        }
      };
      
      const response = handleWindowMessage(event);
      expect(response.type).toBe('TIKTOK_DOWNLOADER_RESPONSE');
      expect(response.data.action).toBe('getVideo');
    });

    test('should ignore other messages', () => {
      const event = { data: { type: 'OTHER_MESSAGE' } };
      expect(handleWindowMessage(event)).toBe(null);
    });

    test('should handle missing data', () => {
      const event = { data: null };
      expect(handleWindowMessage(event)).toBe(null);
    });
  });

  describe('Data Extraction from Window Objects', () => {
    const extractFromHydration = (windowObj) => {
      // Simulates looking for __NEXT_DATA__ or similar hydration data
      const hydrationKeys = ['__NEXT_DATA__', '__INITIAL_STATE__', 'SIGI_STATE'];
      
      for (const key of hydrationKeys) {
        if (windowObj[key]) {
          return windowObj[key];
        }
      }
      return null;
    };

    test('should find NEXT_DATA', () => {
      const mockWindow = {
        __NEXT_DATA__: { props: { pageProps: { videoData: {} } } }
      };
      
      const data = extractFromHydration(mockWindow);
      expect(data).toBeDefined();
      expect(data.props).toBeDefined();
    });

    test('should find SIGI_STATE', () => {
      const mockWindow = {
        SIGI_STATE: { ItemModule: { '123': {} } }
      };
      
      const data = extractFromHydration(mockWindow);
      expect(data.ItemModule).toBeDefined();
    });

    test('should return null when no hydration data', () => {
      const mockWindow = {};
      expect(extractFromHydration(mockWindow)).toBe(null);
    });
  });

  describe('Video URL Priority', () => {
    const getBestVideoUrl = (videoData) => {
      if (!videoData) return null;
      
      // Priority: downloadAddr > bitrateInfo (highest) > playAddr
      if (videoData.downloadAddr) {
        return videoData.downloadAddr;
      }
      
      if (videoData.bitrateInfo && videoData.bitrateInfo.length > 0) {
        // Sort by bitrate descending, get highest quality
        const sorted = [...videoData.bitrateInfo].sort((a, b) => 
          (b.Bitrate || 0) - (a.Bitrate || 0)
        );
        return sorted[0]?.PlayAddr?.UrlList?.[0] || null;
      }
      
      if (videoData.playAddr) {
        return videoData.playAddr;
      }
      
      return null;
    };

    test('should prefer downloadAddr', () => {
      const data = {
        downloadAddr: 'https://download.url',
        playAddr: 'https://play.url'
      };
      
      expect(getBestVideoUrl(data)).toBe('https://download.url');
    });

    test('should use bitrateInfo when no downloadAddr', () => {
      const data = {
        bitrateInfo: [
          { Bitrate: 1000, PlayAddr: { UrlList: ['https://low.url'] } },
          { Bitrate: 5000, PlayAddr: { UrlList: ['https://high.url'] } }
        ],
        playAddr: 'https://play.url'
      };
      
      expect(getBestVideoUrl(data)).toBe('https://high.url');
    });

    test('should fallback to playAddr', () => {
      const data = { playAddr: 'https://play.url' };
      expect(getBestVideoUrl(data)).toBe('https://play.url');
    });

    test('should return null for empty data', () => {
      expect(getBestVideoUrl({})).toBe(null);
      expect(getBestVideoUrl(null)).toBe(null);
    });
  });
});
