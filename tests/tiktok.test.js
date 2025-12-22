// TikTok Video Downloader - Test Suite
// Basic tests for video detection and URL extraction

const { JSDOM } = require('jsdom');

// Mock TikTok page data
const mockPageData = {
  '__DEFAULT_SCOPE__': {
    'webapp.video-detail': {
      itemInfo: {
        itemStruct: {
          id: '7123456789012345678',
          desc: 'Test video description',
          author: {
            uniqueId: 'testuser',
            nickname: 'Test User'
          },
          video: {
            playAddr: 'https://v16-webapp.tiktok.com/video.mp4',
            downloadAddr: 'https://v16-webapp.tiktok.com/download.mp4',
            bitrateInfo: [
              {
                Bitrate: 1000000,
                PlayAddr: {
                  UrlList: ['https://v16-webapp.tiktok.com/hd.mp4']
                }
              }
            ]
          }
        }
      }
    }
  }
};

describe('TikTok URL Patterns', () => {
  const TIKTOK_PATTERNS = {
    VIDEO: /tiktok\.com\/@([^/]+)\/video\/(\d+)/,
    SHORT: /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    MOBILE: /m\.tiktok\.com\/v\/(\d+)/,
    FYP: /tiktok\.com\/foryou/,
    FOLLOWING: /tiktok\.com\/following/,
    PROFILE: /tiktok\.com\/@([^/?]+)$/
  };

  test('should match standard video URL', () => {
    const url = 'https://www.tiktok.com/@testuser/video/7123456789012345678';
    const match = url.match(TIKTOK_PATTERNS.VIDEO);
    expect(match).toBeTruthy();
    expect(match[1]).toBe('testuser');
    expect(match[2]).toBe('7123456789012345678');
  });

  test('should match short URL', () => {
    const url = 'https://vm.tiktok.com/ZMxxxxxxx/';
    const match = url.match(TIKTOK_PATTERNS.SHORT);
    expect(match).toBeTruthy();
    expect(match[1]).toBe('ZMxxxxxxx');
  });

  test('should match mobile URL', () => {
    const url = 'https://m.tiktok.com/v/7123456789012345678';
    const match = url.match(TIKTOK_PATTERNS.MOBILE);
    expect(match).toBeTruthy();
    expect(match[1]).toBe('7123456789012345678');
  });

  test('should match FYP URL', () => {
    const url = 'https://www.tiktok.com/foryou';
    expect(TIKTOK_PATTERNS.FYP.test(url)).toBe(true);
  });

  test('should match Following URL', () => {
    const url = 'https://www.tiktok.com/following';
    expect(TIKTOK_PATTERNS.FOLLOWING.test(url)).toBe(true);
  });

  test('should match profile URL', () => {
    const url = 'https://www.tiktok.com/@testuser';
    const match = url.match(TIKTOK_PATTERNS.PROFILE);
    expect(match).toBeTruthy();
    expect(match[1]).toBe('testuser');
  });
});

describe('Video URL Extraction', () => {
  function extractBestVideoUrl(videoObj) {
    if (!videoObj) return null;
    
    if (videoObj.downloadAddr) return videoObj.downloadAddr;
    
    if (videoObj.bitrateInfo && Array.isArray(videoObj.bitrateInfo)) {
      const sorted = [...videoObj.bitrateInfo].sort((a, b) => 
        (b.Bitrate || 0) - (a.Bitrate || 0)
      );
      
      for (const bitrate of sorted) {
        if (bitrate.PlayAddr?.UrlList?.[0]) {
          return bitrate.PlayAddr.UrlList[0];
        }
      }
    }
    
    if (videoObj.playAddr) return videoObj.playAddr;
    
    return null;
  }

  test('should prioritize downloadAddr', () => {
    const videoObj = {
      playAddr: 'https://play.mp4',
      downloadAddr: 'https://download.mp4'
    };
    expect(extractBestVideoUrl(videoObj)).toBe('https://download.mp4');
  });

  test('should use bitrateInfo when no downloadAddr', () => {
    const videoObj = {
      playAddr: 'https://play.mp4',
      bitrateInfo: [
        { Bitrate: 500000, PlayAddr: { UrlList: ['https://low.mp4'] } },
        { Bitrate: 1000000, PlayAddr: { UrlList: ['https://high.mp4'] } }
      ]
    };
    expect(extractBestVideoUrl(videoObj)).toBe('https://high.mp4');
  });

  test('should fallback to playAddr', () => {
    const videoObj = {
      playAddr: 'https://play.mp4'
    };
    expect(extractBestVideoUrl(videoObj)).toBe('https://play.mp4');
  });

  test('should return null for empty object', () => {
    expect(extractBestVideoUrl({})).toBe(null);
    expect(extractBestVideoUrl(null)).toBe(null);
  });
});

describe('Page Data Extraction', () => {
  function findVideoInData(data) {
    function search(obj, depth = 0) {
      if (depth > 10 || !obj) return null;
      
      if (typeof obj === 'object') {
        if (obj.video && obj.id) {
          return {
            id: obj.id,
            video: obj.video,
            author: obj.author,
            desc: obj.desc
          };
        }
        
        for (const key of Object.keys(obj)) {
          const result = search(obj[key], depth + 1);
          if (result) return result;
        }
      }
      
      return null;
    }
    
    return search(data);
  }

  test('should extract video data from page structure', () => {
    const result = findVideoInData(mockPageData);
    expect(result).toBeTruthy();
    expect(result.id).toBe('7123456789012345678');
    expect(result.video.downloadAddr).toBe('https://v16-webapp.tiktok.com/download.mp4');
    expect(result.author.uniqueId).toBe('testuser');
  });
});

// Run tests if Jest is available
if (typeof jest !== 'undefined') {
  // Jest will run automatically
} else {
  console.log('Run tests with: npm test');
}
