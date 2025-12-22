// TikTok Video Downloader - Injected Script
// Intercepts XHR and Fetch requests to capture video URLs
// This runs in the page context to access TikTok's actual network requests

(function() {
  'use strict';
  
  const VIDEO_URL_PATTERNS = [
    /playAddr/i,
    /downloadAddr/i,
    /play_addr/i,
    /download_addr/i,
    /video\.bitrateInfo/i
  ];
  
  const API_ENDPOINTS = [
    '/api/item/detail',
    '/api/recommend/item_list',
    '/api/post/item_list',
    '/aweme/v1/feed',
    '/aweme/v1/play',
    '/node/video'
  ];
  
  // Dispatch event to content script
  function dispatchVideoUrl(videoId, videoUrl, username, description) {
    window.dispatchEvent(new CustomEvent('tiktok-video-url', {
      detail: { videoId, videoUrl, username, description }
    }));
  }
  
  // Extract video data from response
  function extractVideoData(responseText, url) {
    try {
      const data = JSON.parse(responseText);
      processVideoData(data);
    } catch (e) {
      // Not JSON, try to find video URLs in text
      const urlMatch = responseText.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
      if (urlMatch) {
        const videoIdMatch = url.match(/\/video\/(\d+)/) || 
                            responseText.match(/"id"\s*:\s*"(\d+)"/);
        if (videoIdMatch) {
          dispatchVideoUrl(videoIdMatch[1], urlMatch[0], null, null);
        }
      }
    }
  }
  
  // Process parsed video data recursively
  function processVideoData(data, depth = 0) {
    if (depth > 15 || !data) return;
    
    if (typeof data === 'object') {
      // Check for video object structure
      if (data.video && data.id) {
        const videoUrl = extractBestVideoUrl(data.video);
        if (videoUrl) {
          dispatchVideoUrl(
            data.id,
            videoUrl,
            data.author?.uniqueId || data.author?.nickname,
            data.desc
          );
          return;
        }
      }
      
      // Check for itemStruct
      if (data.itemStruct) {
        processVideoData(data.itemStruct, depth + 1);
        return;
      }
      
      // Check for itemInfo
      if (data.itemInfo?.itemStruct) {
        processVideoData(data.itemInfo.itemStruct, depth + 1);
        return;
      }
      
      // Check for aweme_list (API response with multiple videos)
      if (Array.isArray(data.aweme_list)) {
        for (const item of data.aweme_list) {
          processVideoData(item, depth + 1);
        }
        return;
      }
      
      // Check for itemList
      if (Array.isArray(data.itemList)) {
        for (const item of data.itemList) {
          processVideoData(item, depth + 1);
        }
        return;
      }
      
      // Check for items array
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          processVideoData(item, depth + 1);
        }
        return;
      }
      
      // Recurse into object properties
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object') {
          processVideoData(data[key], depth + 1);
        }
      }
    }
  }
  
  // Extract the best quality video URL
  function extractBestVideoUrl(videoObj) {
    if (!videoObj) return null;
    
    // Priority 1: downloadAddr (non-watermarked)
    if (videoObj.downloadAddr) {
      return videoObj.downloadAddr;
    }
    
    // Priority 2: Best quality from bitrateInfo
    if (videoObj.bitrateInfo && Array.isArray(videoObj.bitrateInfo)) {
      // Sort by bitrate (highest first)
      const sorted = [...videoObj.bitrateInfo].sort((a, b) => 
        (b.Bitrate || 0) - (a.Bitrate || 0)
      );
      
      for (const bitrate of sorted) {
        if (bitrate.PlayAddr?.UrlList?.[0]) {
          return bitrate.PlayAddr.UrlList[0];
        }
      }
    }
    
    // Priority 3: playAddr
    if (videoObj.playAddr) {
      return videoObj.playAddr;
    }
    
    // Priority 4: play_addr (API format)
    if (videoObj.play_addr?.url_list?.[0]) {
      return videoObj.play_addr.url_list[0];
    }
    
    // Priority 5: Direct URL properties
    if (videoObj.url) return videoObj.url;
    if (videoObj.UrlList?.[0]) return videoObj.UrlList[0];
    
    return null;
  }
  
  // Check if URL is a TikTok API endpoint
  function isApiEndpoint(url) {
    return API_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }
  
  // ============ XHR Interception ============
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._tiktokUrl = url;
    this._tiktokMethod = method;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    if (this._tiktokUrl && isApiEndpoint(this._tiktokUrl)) {
      this.addEventListener('load', function() {
        try {
          if (this.responseText) {
            extractVideoData(this.responseText, this._tiktokUrl);
          }
        } catch (e) {
          // Silently fail
        }
      });
    }
    return originalXHRSend.apply(this, [body]);
  };
  
  // ============ Fetch Interception ============
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const response = await originalFetch.apply(this, [input, init]);
    
    if (isApiEndpoint(url)) {
      try {
        // Clone response so we can read it without consuming
        const clone = response.clone();
        const text = await clone.text();
        extractVideoData(text, url);
      } catch (e) {
        // Silently fail
      }
    }
    
    return response;
  };
  
  // ============ Initial Page Data Extraction ============
  
  // Extract from existing page data on load
  function extractFromExistingPageData() {
    // SIGI_STATE
    const sigiState = document.getElementById('SIGI_STATE');
    if (sigiState) {
      try {
        const data = JSON.parse(sigiState.textContent);
        processVideoData(data);
      } catch (e) {}
    }
    
    // __UNIVERSAL_DATA_FOR_REHYDRATION__
    const universalData = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (universalData) {
      try {
        const data = JSON.parse(universalData.textContent);
        processVideoData(data);
      } catch (e) {}
    }
    
    // __NEXT_DATA__
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent);
        if (data.props?.pageProps) {
          processVideoData(data.props.pageProps);
        }
      } catch (e) {}
    }
  }
  
  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractFromExistingPageData);
  } else {
    extractFromExistingPageData();
  }
  
  // Also observe for dynamically added script tags
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'SCRIPT' && node.id) {
          if (node.id === 'SIGI_STATE' || 
              node.id === '__UNIVERSAL_DATA_FOR_REHYDRATION__' ||
              node.id === '__NEXT_DATA__') {
            setTimeout(extractFromExistingPageData, 100);
          }
        }
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // ============ Video Fetch Handler (for CORS bypass) ============
  
  // Listen for fetch requests from content script
  window.addEventListener('tiktok-fetch-video', async function(event) {
    const { videoUrl, requestId } = event.detail;
    console.log('[TikTok DL Injected] Fetching video:', requestId);
    
    try {
      // Fetch in page context (same-origin, has cookies)
      const response = await fetch(videoUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('[TikTok DL Injected] Video blob size:', blob.size);
      
      if (blob.size < 10000) {
        throw new Error('Video too small, probably blocked');
      }
      
      // Convert to base64 for transfer
      const reader = new FileReader();
      reader.onloadend = function() {
        const base64 = reader.result.split(',')[1];
        window.dispatchEvent(new CustomEvent('tiktok-video-fetched', {
          detail: { requestId, success: true, videoData: base64, size: blob.size }
        }));
      };
      reader.onerror = function() {
        window.dispatchEvent(new CustomEvent('tiktok-video-fetched', {
          detail: { requestId, success: false, error: 'Failed to read blob' }
        }));
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('[TikTok DL Injected] Fetch error:', error);
      window.dispatchEvent(new CustomEvent('tiktok-video-fetched', {
        detail: { requestId, success: false, error: error.message }
      }));
    }
  });
  
  console.log('TikTok Video Downloader: Interceptor injected');
})();
