// TikTok Video Downloader - Content Script
// Detects videos on TikTok pages and extracts video information

const TIKTOK_PATTERNS = {
  VIDEO: /tiktok\.com\/@([^/]+)\/video\/(\d+)/,
  SHORT: /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
  MOBILE: /m\.tiktok\.com\/v\/(\d+)/,
  FYP: /tiktok\.com\/(foryou)?(\?.*)?$/,  // Matches /foryou and root URL /
  FOLLOWING: /tiktok\.com\/following/,
  PROFILE: /tiktok\.com\/@([^/?]+)$/
};

const MESSAGE_TYPES = {
  VIDEO_DETECTED: 'VIDEO_DETECTED',
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',
  DOWNLOAD_PROGRESS: 'DOWNLOAD_PROGRESS',
  VIDEO_URL_FOUND: 'VIDEO_URL_FOUND'
};

// Current video data state
let currentVideoData = null;
const interceptedVideoUrls = new Map();
let debugOverlay = null;
let debugEnabled = false;

// Debug overlay functions
function createDebugOverlay() {
  if (debugOverlay) return debugOverlay;
  
  debugOverlay = document.createElement('div');
  debugOverlay.id = 'tiktok-dl-debug';
  debugOverlay.innerHTML = `
    <div class="tiktok-dl-debug-header">
      <span>🔧 TikTok DL Debug</span>
      <button id="tiktok-dl-debug-close">×</button>
    </div>
    <div class="tiktok-dl-debug-content">
      <div class="tiktok-dl-debug-row">
        <label>URL Video ID:</label>
        <span id="debug-url-id">-</span>
      </div>
      <div class="tiktok-dl-debug-row">
        <label>Current Data ID:</label>
        <span id="debug-current-id">-</span>
      </div>
      <div class="tiktok-dl-debug-row">
        <label>Intercepted IDs:</label>
        <span id="debug-intercepted">-</span>
      </div>
      <div class="tiktok-dl-debug-row">
        <label>URL Source:</label>
        <span id="debug-source">-</span>
      </div>
      <div class="tiktok-dl-debug-row">
        <label>Status:</label>
        <span id="debug-status">Ready</span>
      </div>
      <div class="tiktok-dl-debug-log" id="debug-log"></div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    #tiktok-dl-debug {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #FE2C55;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #fff;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .tiktok-dl-debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: linear-gradient(135deg, #FE2C55, #25F4EE);
      border-radius: 6px 6px 0 0;
      font-weight: bold;
    }
    #tiktok-dl-debug-close {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
    }
    .tiktok-dl-debug-content {
      padding: 10px;
    }
    .tiktok-dl-debug-row {
      display: flex;
      margin-bottom: 6px;
      border-bottom: 1px solid #333;
      padding-bottom: 4px;
    }
    .tiktok-dl-debug-row label {
      width: 110px;
      color: #25F4EE;
      flex-shrink: 0;
    }
    .tiktok-dl-debug-row span {
      color: #fff;
      word-break: break-all;
    }
    #debug-status { color: #4ade80; }
    #debug-status.error { color: #f87171; }
    #debug-status.warning { color: #fbbf24; }
    .tiktok-dl-debug-log {
      max-height: 150px;
      overflow-y: auto;
      background: #111;
      padding: 6px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 10px;
    }
    .tiktok-dl-debug-log div {
      padding: 2px 0;
      border-bottom: 1px solid #222;
    }
    .tiktok-dl-debug-log .info { color: #60a5fa; }
    .tiktok-dl-debug-log .success { color: #4ade80; }
    .tiktok-dl-debug-log .warn { color: #fbbf24; }
    .tiktok-dl-debug-log .error { color: #f87171; }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(debugOverlay);
  
  document.getElementById('tiktok-dl-debug-close').onclick = () => {
    debugOverlay.style.display = 'none';
    debugEnabled = false;
  };
  
  debugEnabled = true;
  return debugOverlay;
}

function updateDebugOverlay(data = {}) {
  if (!debugEnabled || !debugOverlay) return;
  
  const urlId = extractVideoIdFromUrl() || '-';
  const currentId = currentVideoData?.videoId || '-';
  const interceptedIds = Array.from(interceptedVideoUrls.keys()).join(', ') || 'none';
  
  document.getElementById('debug-url-id').textContent = urlId;
  document.getElementById('debug-current-id').textContent = currentId;
  document.getElementById('debug-intercepted').textContent = interceptedIds;
  
  if (data.source) {
    document.getElementById('debug-source').textContent = data.source;
  }
  if (data.status) {
    const statusEl = document.getElementById('debug-status');
    statusEl.textContent = data.status;
    statusEl.className = data.statusClass || '';
  }
}

function debugLog(message, type = 'info') {
  console.log(`[TikTok DL] ${message}`);
  
  if (!debugEnabled || !debugOverlay) return;
  
  const logEl = document.getElementById('debug-log');
  if (logEl) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = type;
    entry.textContent = `[${time}] ${message}`;
    logEl.insertBefore(entry, logEl.firstChild);
    
    // Keep only last 50 entries
    while (logEl.children.length > 50) {
      logEl.removeChild(logEl.lastChild);
    }
  }
}

function showDebugOverlay() {
  createDebugOverlay();
  debugOverlay.style.display = 'block';
  debugEnabled = true;
  updateDebugOverlay();
  debugLog('Debug overlay enabled', 'success');
}

// Initialize content script
(function init() {
  console.log('[TikTok DL] Content script loaded on:', window.location.href);
  
  // Inject the XHR/Fetch interceptor script
  injectInterceptor();
  
  // Listen for intercepted video URLs
  window.addEventListener('tiktok-video-url', handleInterceptedUrl);
  
  // Initial video detection
  setTimeout(() => {
    detectVideo().then(data => {
      console.log('[TikTok DL] Initial detection:', data);
    });
  }, 2000);
  
  // Watch for navigation changes (TikTok is SPA)
  observeUrlChanges();
  
  // Watch for video element changes
  observeVideoElements();
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener(handleMessage);
})();

// Inject the interceptor script into the page context
function injectInterceptor() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/injected.js');
    script.onload = function() {
      console.log('[TikTok DL] Interceptor script injected');
      this.remove();
    };
    script.onerror = function(e) {
      console.error('[TikTok DL] Failed to inject interceptor:', e);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.error('[TikTok DL] Error injecting interceptor:', e);
  }
}

// Handle intercepted video URLs from injected script
function handleInterceptedUrl(event) {
  const { videoId, videoUrl, username, description } = event.detail;
  debugLog(`Intercepted: ${videoId}`, 'success');
  
  if (videoId && videoUrl) {
    interceptedVideoUrls.set(videoId, {
      videoUrl,
      username: username || extractUsernameFromUrl(),
      description: description || ''
    });
    debugLog(`Stored URL for video: ${videoId}`, 'info');
    updateDebugOverlay();
    
    // Update current video data if this matches current page
    const pageVideoId = extractVideoIdFromUrl();
    if (pageVideoId === videoId) {
      updateCurrentVideoData(videoId, videoUrl, username, description);
      debugLog(`Updated current video data`, 'success');
    }
  }
}

// Handle messages from popup/background
function handleMessage(message, sender, sendResponse) {
  debugLog(`Message: ${message.type}`, 'info');
  
  switch (message.type) {
    case MESSAGE_TYPES.GET_VIDEO_INFO:
      // ALWAYS force fresh detection - never use cache for download requests
      debugLog('Forcing fresh detection...', 'warn');
      updateDebugOverlay({ status: 'Detecting...', statusClass: 'warning' });
      currentVideoData = null; // Clear any cached data
      
      detectVideo(true).then(videoData => {
        if (videoData) {
          debugLog(`Found video: ${videoData.videoId}`, 'success');
          updateDebugOverlay({ status: 'Video found!', statusClass: '' });
        } else {
          debugLog('No video detected!', 'error');
          updateDebugOverlay({ status: 'No video found', statusClass: 'error' });
        }
        sendResponse(videoData ? 
          { success: true, videoData } : 
          { success: false, error: 'No video detected on this page' }
        );
      });
      return true;
    
    case 'GET_VIDEO_INFO_FRESH':
      // Get fresh video data by fetching page data directly
      debugLog('Getting fresh video data...', 'warn');
      updateDebugOverlay({ status: 'Fetching fresh...', statusClass: 'warning' });
      
      getFreshVideoData().then(videoData => {
        if (videoData) {
          debugLog(`Fresh video found: ${videoData.videoId}`, 'success');
          updateDebugOverlay({ status: 'Fresh data found!', statusClass: '' });
        } else {
          debugLog('Fresh fetch failed!', 'error');
          updateDebugOverlay({ status: 'Fresh fetch failed', statusClass: 'error' });
        }
        sendResponse(videoData ? 
          { success: true, videoData } : 
          { success: false, error: 'Could not fetch fresh video data' }
        );
      });
      return true;
    
    case 'FETCH_VIDEO':
      // Fetch video from content script context (bypasses CORS)
      debugLog('Fetching video...', 'info');
      updateDebugOverlay({ status: 'Downloading...', statusClass: 'warning' });
      fetchVideoAsBase64(message.videoUrl).then(result => {
        if (result.success) {
          debugLog('Video fetched successfully', 'success');
          updateDebugOverlay({ status: 'Fetched!', statusClass: '' });
        } else {
          debugLog(`Fetch failed: ${result.error}`, 'error');
          updateDebugOverlay({ status: 'Fetch failed', statusClass: 'error' });
        }
        sendResponse(result);
      }).catch(error => {
        debugLog(`Fetch error: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
      });
      return true;
    
    case 'SHOW_DEBUG':
      showDebugOverlay();
      sendResponse({ success: true });
      return true;
    
    case MESSAGE_TYPES.DOWNLOAD_PROGRESS:
      debugLog(`Progress: ${message.percent}%`, 'info');
      break;
  }
}

// Fetch video and return as base64 (for sending to service worker)
async function fetchVideoAsBase64(videoUrl) {
  try {
    console.log('[TikTok DL] Attempting to fetch video via injected script...');
    
    // Generate unique request ID
    const requestId = 'fetch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Try via injected script first (runs in page context, bypasses CORS)
    const injectedResult = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('tiktok-video-fetched', handler);
        resolve({ success: false, error: 'Timeout waiting for injected script' });
      }, 30000); // 30 second timeout
      
      function handler(event) {
        if (event.detail.requestId === requestId) {
          clearTimeout(timeout);
          window.removeEventListener('tiktok-video-fetched', handler);
          resolve(event.detail);
        }
      }
      
      window.addEventListener('tiktok-video-fetched', handler);
      
      // Request fetch via injected script
      window.dispatchEvent(new CustomEvent('tiktok-fetch-video', {
        detail: { videoUrl, requestId }
      }));
    });
    
    if (injectedResult.success) {
      console.log('[TikTok DL] Video fetched via injected script, size:', injectedResult.size);
      return injectedResult;
    }
    
    console.log('[TikTok DL] Injected script fetch failed:', injectedResult.error);
    
    // Fallback: Try direct content script fetch
    console.log('[TikTok DL] Trying direct fetch as fallback...');
    const fetchAttempts = [
      () => fetch(videoUrl),
      () => fetch(videoUrl, { credentials: 'include' }),
      () => fetch(videoUrl, { 
        credentials: 'include',
        headers: { 'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8' }
      })
    ];
    
    for (const attemptFetch of fetchAttempts) {
      try {
        const response = await attemptFetch();
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 10000) {
            console.log('[TikTok DL] Video fetched via content script, size:', blob.size);
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve({ success: true, videoData: base64, size: blob.size });
              };
              reader.onerror = () => reject(new Error('Failed to read video blob'));
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {
        console.log('[TikTok DL] Fetch attempt failed:', e.message);
      }
    }
    
    return { success: false, error: 'Could not fetch video from any source' };
  } catch (error) {
    console.error('[TikTok DL] fetchVideoAsBase64 error:', error);
    return { success: false, error: error.message };
  }
}

// Get current video URL directly from the playing video element via injected script
async function getCurrentVideoFromElement(videoId) {
  return new Promise((resolve) => {
    const requestId = `current_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const timeout = setTimeout(() => {
      window.removeEventListener('tiktok-current-video-result', handler);
      resolve(null);
    }, 5000);
    
    function handler(event) {
      if (event.detail.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('tiktok-current-video-result', handler);
        if (event.detail.success) {
          debugLog(`Got URL from video element (${event.detail.method})`, 'success');
          resolve(event.detail.videoUrl);
        } else {
          debugLog(`Video element method failed: ${event.detail.error}`, 'warn');
          resolve(null);
        }
      }
    }
    
    window.addEventListener('tiktok-current-video-result', handler);
    
    window.dispatchEvent(new CustomEvent('tiktok-get-current-video', {
      detail: { requestId, videoId }
    }));
  });
}

// Detect video on current page
async function detectVideo(forceRefresh = false) {
  const url = window.location.href;
  console.log('[TikTok DL] Detecting video on:', url, 'forceRefresh:', forceRefresh);
  
  // Check if we're on a video page
  const videoMatch = url.match(TIKTOK_PATTERNS.VIDEO);
  if (videoMatch) {
    const username = videoMatch[1];
    const videoId = videoMatch[2];
    console.log('[TikTok DL] Video page detected - User:', username, 'Video ID:', videoId);
    
    // If forcing refresh, clear intercepted URLs for other videos
    if (forceRefresh) {
      // Keep only the current video in intercepted URLs
      for (const [key] of interceptedVideoUrls) {
        if (key !== videoId) {
          interceptedVideoUrls.delete(key);
        }
      }
    }
    
    // Try to get video URL from multiple sources
    const videoUrl = await getVideoUrl(videoId);
    console.log('[TikTok DL] Got video URL:', videoUrl ? 'Yes' : 'No');
    
    if (videoUrl) {
      currentVideoData = {
        videoUrl,
        videoId,
        username,
        description: getVideoDescription(),
        timestamp: new Date().toISOString(),
        pageUrl: url
      };
      
      console.log('[TikTok DL] Video data found:', currentVideoData);
      return currentVideoData;
    }
  }
  
  // Check for video in feed (FYP, Following, Profile)
  if (TIKTOK_PATTERNS.FYP.test(url) || 
      TIKTOK_PATTERNS.FOLLOWING.test(url) || 
      TIKTOK_PATTERNS.PROFILE.test(url)) {
    console.log('[TikTok DL] Feed page detected, looking for visible video...');
    return await detectFeedVideo();
  }
  
  console.log('[TikTok DL] No video detected');
  return null;
}

// Detect the currently visible video in a feed
async function detectFeedVideo() {
  const videoElements = document.querySelectorAll('video');
  console.log('[TikTok DL] Found', videoElements.length, 'video elements');
  
  for (const video of videoElements) {
    if (isElementInViewport(video)) {
      // Try to find the video container and extract info
      const container = video.closest('[data-e2e="recommend-list-item-container"]') ||
                       video.closest('[class*="DivItemContainer"]') ||
                       video.closest('[class*="DivVideoCardContainer"]') ||
                       video.closest('article[class*="ArticleItemContainer"]') ||
                       video.closest('div[class*="video-card"]') ||
                       video.parentElement?.parentElement?.parentElement;
      
      if (container) {
        let videoId = null;
        let username = null;
        let pageUrl = null;
        
        // Method 1: Try direct video link (works on profile pages)
        const linkElement = container.querySelector('a[href*="/video/"]');
        if (linkElement) {
          const href = linkElement.href;
          const match = href.match(TIKTOK_PATTERNS.VIDEO);
          if (match) {
            username = match[1];
            videoId = match[2];
            pageUrl = href;
          }
        }
        
        // Method 2: Extract from xgplayer wrapper ID (FYP/Following - no video links)
        // Format: xgwrapper-0-7556991857977249025 where the last number is videoId
        if (!videoId) {
          const xgWrapper = container.querySelector('[id^="xgwrapper-"]');
          if (xgWrapper) {
            const wrapperId = xgWrapper.id;
            const wrapperMatch = wrapperId.match(/xgwrapper-\d+-(\d+)/);
            if (wrapperMatch) {
              videoId = wrapperMatch[1];
              console.log('[TikTok DL] Found video ID from xgwrapper:', videoId);
            }
          }
        }
        
        // Method 3: Extract from media-card ID (format: media-card-0)
        // Then get videoId from the wrapper inside
        if (!videoId) {
          const mediaCard = container.querySelector('[id^="media-card-"]');
          if (mediaCard) {
            const innerWrapper = mediaCard.querySelector('[id^="xgwrapper-"]');
            if (innerWrapper) {
              const wrapperMatch = innerWrapper.id.match(/xgwrapper-\d+-(\d+)/);
              if (wrapperMatch) {
                videoId = wrapperMatch[1];
                console.log('[TikTok DL] Found video ID from media-card xgwrapper:', videoId);
              }
            }
          }
        }
        
        // Get username from creator profile link if not found
        if (!username) {
          const creatorLink = container.querySelector('a[href^="/@"]');
          if (creatorLink) {
            const creatorMatch = creatorLink.href.match(/\/@([^/?]+)/);
            if (creatorMatch) {
              username = creatorMatch[1];
              console.log('[TikTok DL] Found username from creator link:', username);
            }
          }
        }
        
        // Construct page URL if we have both pieces
        if (videoId && username && !pageUrl) {
          pageUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;
        }
        
        if (videoId) {
          const videoUrl = await getVideoUrl(videoId);
          
          if (videoUrl) {
            currentVideoData = {
              videoUrl,
              videoId,
              username: username || 'unknown',
              description: getVideoDescription(container),
              timestamp: new Date().toISOString(),
              pageUrl: pageUrl || window.location.href
            };
            
            console.log('[TikTok DL] Feed video data found:', currentVideoData);
            return currentVideoData;
          }
        }
      }
    }
  }
  
  return null;
}

// Get video URL from various sources
async function getVideoUrl(videoId) {
  debugLog(`Getting URL for: ${videoId}`, 'info');
  updateDebugOverlay({ status: 'Searching...', statusClass: 'warning' });
  
  // Priority 1: Check intercepted URLs (most reliable - captured from actual API calls)
  if (interceptedVideoUrls.has(videoId)) {
    debugLog('Source: Intercepted URLs ✓', 'success');
    updateDebugOverlay({ source: 'Intercepted (XHR/Fetch)', status: 'Found!', statusClass: '' });
    return interceptedVideoUrls.get(videoId).videoUrl;
  }
  
  // Priority 2: Try injected script's seenVideoUrls map (works after scrolling!)
  // This is the most reliable fallback - TikTok preloads video URLs via batch APIs
  debugLog('Trying injected script seenVideoUrls...', 'info');
  updateDebugOverlay({ source: 'Stored URLs...', status: 'Checking...', statusClass: 'warning' });
  const storedUrl = await getCurrentVideoFromElement(videoId);
  if (storedUrl) {
    debugLog('Source: Stored Video URLs ✓', 'success');
    updateDebugOverlay({ source: 'Stored URLs', status: 'Found!', statusClass: '' });
    return storedUrl;
  }
  
  // Priority 3: Wait briefly for intercepted URL (TikTok might still be loading)
  debugLog('Waiting for intercepted URL (1s)...', 'warn');
  updateDebugOverlay({ source: 'Waiting for intercept...', status: 'Waiting...', statusClass: 'warning' });
  const waitedUrl = await waitForInterceptedUrl(videoId, 1000); // Reduced from 3s to 1s
  if (waitedUrl) {
    debugLog('Source: Waited Intercepted ✓', 'success');
    updateDebugOverlay({ source: 'Intercepted (waited)', status: 'Found!', statusClass: '' });
    return waitedUrl;
  }
  
  // Priority 4: Extract from page data (with strict video ID verification)
  debugLog('Trying page data...', 'info');
  const pageDataResult = extractFromPageData(videoId);
  if (pageDataResult) {
    debugLog('Source: Page Data ✓', 'success');
    updateDebugOverlay({ source: 'Page Data (JSON)', status: 'Found!', statusClass: '' });
    return pageDataResult;
  }
  
  // Priority 5: Get from video element source
  debugLog('Trying video element src...', 'info');
  const videoElement = document.querySelector('video');
  if (videoElement) {
    // Check src attribute (non-blob)
    if (videoElement.src && !videoElement.src.startsWith('blob:')) {
      debugLog('Source: Video Element ✓', 'success');
      updateDebugOverlay({ source: 'Video Element src', status: 'Found!', statusClass: '' });
      return videoElement.src;
    }
    
    // Check source elements
    const sourceEl = videoElement.querySelector('source');
    if (sourceEl && sourceEl.src && !sourceEl.src.startsWith('blob:')) {
      debugLog('Source: Source Element ✓', 'success');
      updateDebugOverlay({ source: 'Source Element', status: 'Found!', statusClass: '' });
      return sourceEl.src;
    }
  }

  debugLog('NO URL FOUND!', 'error');
  updateDebugOverlay({ source: 'None - All failed', status: 'NOT FOUND', statusClass: 'error' });
  return null;
}

// Get FRESH video data by fetching the current page directly
// This bypasses any caching issues by making a fresh request
async function getFreshVideoData() {
  try {
    const videoId = extractVideoIdFromUrl();
    const username = extractUsernameFromUrl();
    
    if (!videoId) {
      debugLog('No video ID in URL for fresh fetch', 'error');
      return null;
    }
    
    debugLog(`Getting fresh data for: ${videoId}`, 'info');
    
    // Build the direct video URL - this guarantees we get the correct video
    const directUrl = `https://www.tiktok.com/@${username || '_'}/video/${videoId}`;
    debugLog(`Fetching: ${directUrl}`, 'info');
    
    // Fetch the video page fresh with cache-busting
    const response = await fetch(directUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store' // Force fresh request, bypass all caches
    });
    
    if (!response.ok) {
      debugLog(`Fresh fetch failed: ${response.status}`, 'error');
      return null;
    }
    
    const html = await response.text();
    debugLog(`Fresh HTML received: ${html.length} chars`, 'info');
    
    // Parse the fresh HTML for video data
    const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
    if (!match) {
      debugLog('No rehydration data in fresh HTML', 'error');
      return null;
    }
    
    const data = JSON.parse(match[1]);
    const videoDetail = data?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    
    if (!videoDetail?.itemInfo?.itemStruct) {
      debugLog('No video item in fresh data', 'error');
      return null;
    }
    
    const item = videoDetail.itemInfo.itemStruct;
    const video = item.video;
    const author = item.author;
    
    // Get video URL
    const videoUrl = video?.downloadAddr || video?.playAddr;
    if (!videoUrl) {
      debugLog('No video URL in fresh data', 'error');
      return null;
    }
    
    // Verify the video ID matches
    if (item.id !== videoId) {
      debugLog(`ID mismatch! Fresh: ${item.id}, Expected: ${videoId}`, 'error');
      return null;
    }
    
    debugLog(`Fresh video URL obtained for ${videoId}!`, 'success');
    
    // Update our cache with fresh data
    interceptedVideoUrls.set(videoId, {
      videoUrl: videoUrl,
      username: author?.uniqueId || '',
      description: item.desc || ''
    });
    
    // Build and return complete video data object
    return {
      videoId: videoId,
      videoUrl: videoUrl,
      username: author?.uniqueId || username || 'unknown',
      description: item.desc || '',
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href
    };
    
  } catch (error) {
    debugLog(`Fresh fetch error: ${error.message}`, 'error');
    return null;
  }
}

// Helper: Recursively find video URL in object
// Note: Currently unused but kept for fallback extraction
// eslint-disable-next-line no-unused-vars
function findVideoUrlInObject(obj, targetVideoId, depth = 0) {
  if (depth > 10 || !obj) return null;
  
  if (typeof obj === 'string') {
    if (obj.includes('.mp4') && (obj.includes('tiktokcdn') || obj.includes('muscdn'))) {
      return obj;
    }
    return null;
  }
  
  if (typeof obj === 'object') {
    // Check if this object has matching video ID
    if (obj.id === targetVideoId || obj.videoId === targetVideoId) {
      if (obj.video) {
        if (obj.video.downloadAddr) return obj.video.downloadAddr;
        if (obj.video.playAddr) return obj.video.playAddr;
      }
      if (obj.downloadAddr) return obj.downloadAddr;
      if (obj.playAddr) return obj.playAddr;
    }
    
    for (const key of Object.keys(obj)) {
      const result = findVideoUrlInObject(obj[key], targetVideoId, depth + 1);
      if (result) return result;
    }
  }
  
  return null;
}

// Wait for intercepted URL with timeout
async function waitForInterceptedUrl(videoId, timeout = 2000) {
  const startTime = Date.now();
  
  console.log('[TikTok DL] Waiting for intercepted URL for video:', videoId);
  console.log('[TikTok DL] Current intercepted videos:', Array.from(interceptedVideoUrls.keys()));
  
  while (Date.now() - startTime < timeout) {
    if (interceptedVideoUrls.has(videoId)) {
      console.log('[TikTok DL] Found intercepted URL after waiting');
      return interceptedVideoUrls.get(videoId).videoUrl;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('[TikTok DL] Timeout waiting for intercepted URL');
  console.log('[TikTok DL] Available intercepted videos after timeout:', Array.from(interceptedVideoUrls.keys()));
  return null;
}

// Extract video URL from page's embedded data
function extractFromPageData(targetVideoId = null) {
  console.log('[TikTok DL] Extracting from page data...');
  
  // Method 1: Try __UNIVERSAL_DATA_FOR_REHYDRATION__ (current TikTok)
  const universalData = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
  if (universalData) {
    try {
      const data = JSON.parse(universalData.textContent);
      console.log('[TikTok DL] Found __UNIVERSAL_DATA_FOR_REHYDRATION__');
      console.log('[TikTok DL] Universal data structure:', JSON.stringify(data, null, 2).substring(0, 2000));
      const url = extractVideoUrlFromUniversalData(data, targetVideoId);
      if (url) return url;
    } catch (e) {
      console.error('[TikTok DL] Error parsing universal data:', e);
    }
  }
  
  // Method 2: Try SIGI_STATE (older TikTok)
  const sigiState = document.getElementById('SIGI_STATE');
  if (sigiState) {
    try {
      const data = JSON.parse(sigiState.textContent);
      console.log('[TikTok DL] Found SIGI_STATE');
      const url = extractVideoUrlFromSigiState(data, targetVideoId);
      if (url) return url;
    } catch (e) {
      console.error('[TikTok DL] Error parsing SIGI_STATE:', e);
    }
  }
  
  // Method 2.5: Try __NEXT_DATA__ (some TikTok pages use Next.js)
  const nextData = document.getElementById('__NEXT_DATA__');
  if (nextData) {
    try {
      const data = JSON.parse(nextData.textContent);
      console.log('[TikTok DL] Found __NEXT_DATA__');
      if (data?.props?.pageProps) {
        const url = deepSearchForVideoUrl(data.props.pageProps, targetVideoId, 0, 'pageProps');
        if (url) return url;
      }
    } catch (e) {
      console.error('[TikTok DL] Error parsing __NEXT_DATA__:', e);
    }
  }
  
  // Method 3: Search in all script tags
  const scripts = document.querySelectorAll('script:not([src])');
  for (const script of scripts) {
    const text = script.textContent;
    if (text && (text.includes('"playAddr"') || text.includes('"downloadAddr"') || text.includes('video_url'))) {
      console.log('[TikTok DL] Found potential video data in script tag');
      try {
        // Try to find and parse JSON objects containing video URLs
        const matches = text.match(/\{[^{}]*(?:"playAddr"|"downloadAddr"|"video_url")[^{}]*\}/g);
        if (matches) {
          for (const match of matches) {
            try {
              const obj = JSON.parse(match);
              if (obj.downloadAddr) return obj.downloadAddr;
              if (obj.playAddr) return obj.playAddr;
              if (obj.video_url) return obj.video_url;
            } catch (e) { /* Ignore malformed JSON */ }
          }
        }
      } catch (e) { /* Ignore parse errors */ }
    }
  }
  
  // Method 4: Try to find direct video URLs in any script
  console.log('[TikTok DL] Method 4: Searching for direct video URLs...');
  const allScripts = document.querySelectorAll('script:not([src])');
  for (const script of allScripts) {
    const text = script.textContent || '';
    // Look for TikTok CDN video URLs
    const urlPatterns = [
      /https?:\/\/[^"'\s]*v[0-9]*(?:-webapp)?\.tiktokcdn(?:-[a-z]+)?\.com[^"'\s]*\.mp4[^"'\s]*/gi,
      /https?:\/\/[^"'\s]*pull-[^"'\s]*\.tiktokcdn[^"'\s]*\.mp4[^"'\s]*/gi,
      /https?:\/\/[^"'\s]*v[0-9]*\.tiktokcdn\.com[^"'\s]*\.mp4[^"'\s]*/gi
    ];
    
    for (const pattern of urlPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Decode URL if needed
        let url = matches[0];
        try {
          // Handle escaped URLs
          if (url.includes('\\u002F')) {
            url = url.replace(/\\u002F/g, '/');
          }
          if (url.includes('\\u0026')) {
            url = url.replace(/\\u0026/g, '&');
          }
          console.log('[TikTok DL] Found direct video URL:', url.substring(0, 100));
          return url;
        } catch (e) { /* Ignore decode errors */ }
      }
    }
  }
  
  return null;
}

// Extract from __UNIVERSAL_DATA_FOR_REHYDRATION__ structure
function extractVideoUrlFromUniversalData(data, targetVideoId) {
  try {
    console.log('[TikTok DL] Universal data keys:', Object.keys(data || {}));
    console.log('[TikTok DL] Looking for video ID:', targetVideoId);
    
    // Try __DEFAULT_SCOPE__ paths
    const defaultScope = data?.__DEFAULT_SCOPE__;
    if (defaultScope) {
      console.log('[TikTok DL] __DEFAULT_SCOPE__ keys:', Object.keys(defaultScope));
      
      // Try webapp.video-detail path
      const videoDetail = defaultScope['webapp.video-detail'];
      if (videoDetail) {
        console.log('[TikTok DL] Found webapp.video-detail, keys:', Object.keys(videoDetail));
        const itemStruct = videoDetail?.itemInfo?.itemStruct;
        if (itemStruct?.video) {
          // IMPORTANT: Check if this is the video we're looking for
          const foundId = itemStruct.id || itemStruct.video?.id;
          console.log('[TikTok DL] Found video ID in itemStruct:', foundId);
          
          if (!targetVideoId || foundId === targetVideoId) {
            console.log('[TikTok DL] Video ID matches, extracting URL');
            return getBestVideoUrl(itemStruct.video);
          } else {
            console.log('[TikTok DL] Video ID mismatch! Page has:', foundId, 'Need:', targetVideoId);
            // Return null to try other sources
          }
        }
      }
      
      // Try alternative paths for newer TikTok structure
      for (const key of Object.keys(defaultScope)) {
        const scopeData = defaultScope[key];
        if (scopeData?.itemInfo?.itemStruct?.video) {
          const foundId = scopeData.itemInfo.itemStruct.id;
          if (!targetVideoId || foundId === targetVideoId) {
            console.log('[TikTok DL] Found matching video in scope:', key);
            return getBestVideoUrl(scopeData.itemInfo.itemStruct.video);
          }
        }
        // Check for video directly
        if (scopeData?.video && typeof scopeData.video === 'object') {
          const foundId = scopeData.id;
          if (!targetVideoId || foundId === targetVideoId) {
            const url = getBestVideoUrl(scopeData.video);
            if (url) {
              console.log('[TikTok DL] Found video URL in scope:', key);
              return url;
            }
          }
        }
      }
    }
    
    // Try direct paths
    if (data?.itemInfo?.itemStruct?.video) {
      const foundId = data.itemInfo.itemStruct.id;
      if (!targetVideoId || foundId === targetVideoId) {
        console.log('[TikTok DL] Found video in direct itemInfo path');
        return getBestVideoUrl(data.itemInfo.itemStruct.video);
      }
    }
    
    // Try to find video in any nested structure
    console.log('[TikTok DL] Starting deep search...');
    return deepSearchForVideoUrl(data, targetVideoId);
  } catch (e) {
    console.error('[TikTok DL] Error in extractVideoUrlFromUniversalData:', e);
    return null;
  }
}

// Extract from SIGI_STATE structure
function extractVideoUrlFromSigiState(data, targetVideoId) {
  try {
    // Try ItemModule path
    if (data.ItemModule) {
      for (const key in data.ItemModule) {
        const item = data.ItemModule[key];
        if (item.video) {
          if (!targetVideoId || item.id === targetVideoId) {
            return getBestVideoUrl(item.video);
          }
        }
      }
    }
    
    // Deep search
    return deepSearchForVideoUrl(data, targetVideoId);
  } catch (e) {
    console.error('[TikTok DL] Error in extractVideoUrlFromSigiState:', e);
    return null;
  }
}

// Get best quality video URL from video object
function getBestVideoUrl(video) {
  if (!video) return null;
  
  console.log('[TikTok DL] getBestVideoUrl checking object with keys:', Object.keys(video));
  
  // Priority 1: downloadAddr (usually non-watermarked)
  if (video.downloadAddr) {
    console.log('[TikTok DL] Using downloadAddr');
    return video.downloadAddr;
  }
  
  // Priority 2: bitrateInfo (best quality)
  if (video.bitrateInfo && Array.isArray(video.bitrateInfo)) {
    const sorted = [...video.bitrateInfo].sort((a, b) => (b.Bitrate || 0) - (a.Bitrate || 0));
    for (const br of sorted) {
      if (br.PlayAddr?.UrlList?.[0]) {
        console.log('[TikTok DL] Using bitrateInfo');
        return br.PlayAddr.UrlList[0];
      }
    }
  }
  
  // Priority 3: playAddr (string or object)
  if (video.playAddr) {
    console.log('[TikTok DL] Using playAddr');
    if (typeof video.playAddr === 'string') {
      return video.playAddr;
    } else if (video.playAddr.UrlList?.[0]) {
      return video.playAddr.UrlList[0];
    } else if (video.playAddr.url_list?.[0]) {
      return video.playAddr.url_list[0];
    }
  }
  
  // Priority 4: play_addr (API format)
  if (video.play_addr?.url_list?.[0]) {
    console.log('[TikTok DL] Using play_addr');
    return video.play_addr.url_list[0];
  }
  
  // Priority 5: Check for URL directly in UrlList
  if (video.UrlList?.[0]) {
    console.log('[TikTok DL] Using UrlList directly');
    return video.UrlList[0];
  }
  
  // Priority 6: Check for url_list
  if (video.url_list?.[0]) {
    console.log('[TikTok DL] Using url_list directly');
    return video.url_list[0];
  }
  
  return null;
}

// Deep search through object for video URLs
function deepSearchForVideoUrl(obj, targetVideoId, depth = 0, path = '') {
  if (depth > 15 || !obj || typeof obj !== 'object') return null;
  
  // Check if this object has video properties AND matching ID
  if (obj.video && typeof obj.video === 'object') {
    // CRITICAL: Always verify video ID matches if we have a targetVideoId
    const objId = obj.id || obj.videoId || obj.video?.id;
    if (targetVideoId && objId && objId !== targetVideoId) {
      // ID mismatch - skip this object entirely
      console.log('[TikTok DL] Deep search skipping - ID mismatch:', objId, 'vs', targetVideoId);
      return null; // Don't search children either - wrong video context
    }
    
    if (!targetVideoId || objId === targetVideoId) {
      console.log('[TikTok DL] Deep search found matching video object at:', path);
      const url = getBestVideoUrl(obj.video);
      if (url) return url;
    }
  }
  
  // Check for direct video URL properties - BUT only if we can verify ID or no target
  // If we have targetVideoId but can't verify, don't return raw URLs
  if (targetVideoId) {
    // Don't return downloadAddr/playAddr without ID verification from deep search
    // These could belong to wrong video
  } else {
    if (obj.downloadAddr) {
      console.log('[TikTok DL] Deep search found downloadAddr at:', path);
      return obj.downloadAddr;
    }
    if (obj.playAddr) {
      console.log('[TikTok DL] Deep search found playAddr at:', path);
      return obj.playAddr;
    }
  }
  
  // Check arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = deepSearchForVideoUrl(obj[i], targetVideoId, depth + 1, `${path}[${i}]`);
      if (result) return result;
    }
  } else {
    // Prioritized keys to search
    const priorityKeys = ['video', 'itemStruct', 'ItemModule', 'itemInfo', 'aweme_list', 
                          'itemList', 'videoData', 'detail', 'data', 'item', 'items',
                          'webapp.video-detail', 'videoDetail'];
    
    // Check object properties - priority keys first
    for (const key of priorityKeys) {
      if (obj[key]) {
        const result = deepSearchForVideoUrl(obj[key], targetVideoId, depth + 1, `${path}.${key}`);
        if (result) return result;
      }
    }
    
    // Then check all other keys at depth <= 5
    if (depth <= 5) {
      for (const key of Object.keys(obj)) {
        if (!priorityKeys.includes(key)) {
          const result = deepSearchForVideoUrl(obj[key], targetVideoId, depth + 1, `${path}.${key}`);
          if (result) return result;
        }
      }
    }
  }
  
  return null;
}

// Update current video data
function updateCurrentVideoData(videoId, videoUrl, username, description) {
  currentVideoData = {
    videoUrl,
    videoId,
    username: username || extractUsernameFromUrl(),
    description: description || getVideoDescription(),
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href
  };
  
  console.log('[TikTok DL] Updated current video data:', currentVideoData);
  
  // Notify background script
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.VIDEO_DETECTED,
    videoData: currentVideoData
  }).catch(() => {});
}

// Extract username from current URL
function extractUsernameFromUrl() {
  const match = window.location.href.match(/@([^/]+)/);
  return match ? match[1] : 'unknown';
}

// Extract video ID from current URL
function extractVideoIdFromUrl() {
  const match = window.location.href.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// Get video description from page
function getVideoDescription(container = null) {
  const selectors = [
    '[data-e2e="browse-video-desc"]',
    '[data-e2e="video-desc"]',
    'h1[data-e2e="video-desc"]',
    '[class*="DivVideoInfoContainer"] span',
    '.tiktok-j2a19r-SpanText',
    '[class*="SpanText"]'
  ];
  
  const searchRoot = container || document;
  
  for (const selector of selectors) {
    const element = searchRoot.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim().slice(0, 200);
    }
  }
  
  return '';
}

// Check if element is in viewport
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  
  return (
    rect.top >= -rect.height / 2 &&
    rect.top <= windowHeight - rect.height / 2
  );
}

// Observe URL changes for SPA navigation
function observeUrlChanges() {
  let lastUrl = window.location.href;
  let lastVideoId = extractVideoIdFromUrl();
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      const newVideoId = extractVideoIdFromUrl();
      console.log('[TikTok DL] URL changed:', window.location.href);
      console.log('[TikTok DL] Video ID change:', lastVideoId, '->', newVideoId);
      
      lastUrl = window.location.href;
      
      // Only reset if video ID changed
      if (newVideoId !== lastVideoId) {
        console.log('[TikTok DL] New video detected, clearing cache');
        currentVideoData = null;
        // Clear old video from intercepted URLs
        if (lastVideoId) {
          interceptedVideoUrls.delete(lastVideoId);
        }
        lastVideoId = newVideoId;
      }
      
      // Re-detect with delay for page to load
      setTimeout(() => {
        detectVideo().then(data => {
          console.log('[TikTok DL] Re-detection after URL change:', data);
        });
      }, 1500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Observe video elements for changes
function observeVideoElements() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'VIDEO' || 
            (node.querySelector && node.querySelector('video'))) {
          console.log('[TikTok DL] New video element detected');
          setTimeout(() => {
            detectVideo().then(data => {
              console.log('[TikTok DL] Detection after video element added:', data);
            });
          }, 1000);
          return;
        }
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Expose for debugging
window.__tiktokDownloader = {
  getCurrentVideo: () => currentVideoData,
  detectVideo,
  getInterceptedUrls: () => interceptedVideoUrls,
  extractFromPageData,
  getVideoUrl,
  showDebug: showDebugOverlay,
  debug: () => {
    showDebugOverlay();
    return 'Debug overlay enabled!';
  }
};

console.log('[TikTok DL] Debug: window.__tiktokDownloader available');
console.log('[TikTok DL] Tip: Run __tiktokDownloader.debug() in console to show debug overlay');
