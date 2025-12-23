// TikTok Video Downloader - Injected Script
// Intercepts XHR and Fetch requests to capture video URLs
// This runs in the page context to access TikTok's actual network requests

(function() {
  'use strict';
  
  const API_ENDPOINTS = [
    '/api/item/detail',
    '/api/recommend/item_list',
    '/api/post/item_list',
    '/aweme/v1/feed',
    '/aweme/v1/play',
    '/node/video',
    '/api/comment/list',
    '/tiktok/webapp/video',
    '/api/user/detail',
    '/v1/feed',
    '/v2/feed',
    '/api/related/item_list'
  ];
  
  // Track all video URLs we've seen in current session
  const seenVideoUrls = new Map();
  
  // Track blob URLs to their original video URLs
  const blobToSourceMap = new Map();
  
  // Track video element sources
  const videoSourceMap = new Map();
  
  // Dispatch event to content script
  function dispatchVideoUrl(videoId, videoUrl, username, description) {
    // Only dispatch if we haven't seen this exact combo before, or if URL changed
    const existingUrl = seenVideoUrls.get(videoId);
    if (existingUrl !== videoUrl) {
      seenVideoUrls.set(videoId, videoUrl);
      console.log('[TikTok DL Injected] Dispatching video:', videoId);
      window.dispatchEvent(new CustomEvent('tiktok-video-url', {
        detail: { videoId, videoUrl, username, description }
      }));
    }
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
  
  // Check if response might contain video data
  function mightContainVideoData(url, responseText) {
    // Check URL patterns
    if (isApiEndpoint(url)) return true;
    
    // Check if response contains video-related fields
    if (responseText && (
      responseText.includes('"playAddr"') ||
      responseText.includes('"downloadAddr"') ||
      responseText.includes('"bitrateInfo"') ||
      responseText.includes('"play_addr"') ||
      responseText.includes('"video":')
    )) {
      return true;
    }
    
    return false;
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
    // Listen to ALL responses, we'll check content later
    this.addEventListener('load', function() {
      try {
        if (this.responseText && mightContainVideoData(this._tiktokUrl, this.responseText)) {
          console.log('[TikTok DL Injected] XHR response might contain video data:', this._tiktokUrl);
          extractVideoData(this.responseText, this._tiktokUrl);
        }
      } catch (e) {
        // Silently fail
      }
    });
    return originalXHRSend.apply(this, [body]);
  };
  
  // ============ Fetch Interception ============
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const response = await originalFetch.apply(this, [input, init]);
    
    try {
      // Clone response so we can read it without consuming
      const clone = response.clone();
      const text = await clone.text();
      
      if (mightContainVideoData(url, text)) {
        console.log('[TikTok DL Injected] Fetch response might contain video data:', url);
        extractVideoData(text, url);
      }
    } catch (e) {
      // Silently fail
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
      } catch (e) { /* Ignore parse errors */ }
    }
    
    // __UNIVERSAL_DATA_FOR_REHYDRATION__
    const universalData = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (universalData) {
      try {
        const data = JSON.parse(universalData.textContent);
        processVideoData(data);
      } catch (e) { /* Ignore parse errors */ }
    }
    
    // __NEXT_DATA__
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent);
        if (data.props?.pageProps) {
          processVideoData(data.props.pageProps);
        }
      } catch (e) { /* Ignore parse errors */ }
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
  
  // ============ Get Current Video Directly ============
  
  // Get the currently playing video directly from video element
  window.addEventListener('tiktok-get-current-video', async function(event) {
    const { requestId, videoId } = event.detail;
    console.log('[TikTok DL Injected] Getting current video:', requestId, videoId);
    
    try {
      // Find the video element that's currently playing
      const videos = document.querySelectorAll('video');
      let targetVideo = null;
      
      for (const video of videos) {
        // Check if video is in viewport and playing
        const rect = video.getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight && 
                          rect.width > 0 && rect.height > 0;
        
        if (inViewport && !video.paused && video.readyState >= 2) {
          targetVideo = video;
          break;
        }
        
        // Fallback: any video with valid src
        if (!targetVideo && video.src) {
          targetVideo = video;
        }
      }
      
      if (!targetVideo) {
        throw new Error('No video element found');
      }
      
      const src = targetVideo.src || targetVideo.querySelector('source')?.src;
      console.log('[TikTok DL Injected] Video src:', src);
      
      if (!src) {
        throw new Error('Video has no src');
      }
      
      // If it's a blob URL, we need to capture the video directly
      if (src.startsWith('blob:')) {
        console.log('[TikTok DL Injected] Video uses blob URL, capturing directly...');
        
        // Use captureStream to get the video data
        // First, try to find if we have the original URL stored
        const originalUrl = blobToSourceMap.get(src);
        if (originalUrl) {
          console.log('[TikTok DL Injected] Found original URL for blob:', originalUrl);
          window.dispatchEvent(new CustomEvent('tiktok-current-video-result', {
            detail: { requestId, success: true, videoUrl: originalUrl, method: 'blob-map' }
          }));
          return;
        }
        
        // Try to find URL in our seen videos map that matches this video ID
        if (videoId && seenVideoUrls.has(videoId)) {
          const storedUrl = seenVideoUrls.get(videoId);
          console.log('[TikTok DL Injected] Found stored URL for video ID:', storedUrl);
          window.dispatchEvent(new CustomEvent('tiktok-current-video-result', {
            detail: { requestId, success: true, videoUrl: storedUrl, method: 'seen-map' }
          }));
          return;
        }
        
        // As last resort, we can capture the video using MediaRecorder
        // But this is slow and quality may vary - prefer URL method
        throw new Error('Blob URL - no original source found. Try refreshing page.');
        
      } else {
        // Direct URL - send it
        console.log('[TikTok DL Injected] Direct video URL found');
        window.dispatchEvent(new CustomEvent('tiktok-current-video-result', {
          detail: { requestId, success: true, videoUrl: src, method: 'direct-src' }
        }));
      }
      
    } catch (error) {
      console.error('[TikTok DL Injected] Get current video error:', error);
      window.dispatchEvent(new CustomEvent('tiktok-current-video-result', {
        detail: { requestId, success: false, error: error.message }
      }));
    }
  });
  
  // ============ Track Video Element Sources ============
  
  // Watch for video elements being added and track their sources
  function trackVideoElement(video) {
    // Store original src when set
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (originalSrcDescriptor && !video._tiktokTracked) {
      video._tiktokTracked = true;
      
      // Watch for src changes
      let lastSrc = video.src;
      const checkSrc = () => {
        if (video.src !== lastSrc) {
          lastSrc = video.src;
          console.log('[TikTok DL Injected] Video src changed:', video.src.substring(0, 100));
          
          // If it's a regular URL (not blob), store it
          if (video.src && !video.src.startsWith('blob:')) {
            // Try to extract video ID from current URL
            const urlMatch = window.location.href.match(/\/video\/(\d+)/);
            if (urlMatch) {
              videoSourceMap.set(urlMatch[1], video.src);
              console.log('[TikTok DL Injected] Stored video URL for ID:', urlMatch[1]);
            }
          }
        }
      };
      
      // Check periodically
      const interval = setInterval(checkSrc, 500);
      
      // Clean up when video is removed
      const observer = new MutationObserver((_mutations) => {
        if (!document.body.contains(video)) {
          clearInterval(interval);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  
  // Track existing videos
  document.querySelectorAll('video').forEach(trackVideoElement);
  
  // Watch for new videos
  const videoObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'VIDEO') {
          trackVideoElement(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('video').forEach(trackVideoElement);
        }
      }
    }
  });
  videoObserver.observe(document.body, { childList: true, subtree: true });
  
  // Expose tracked data for debugging
  window.__tiktokVideoSources = {
    seenUrls: seenVideoUrls,
    blobMap: blobToSourceMap,
    videoSources: videoSourceMap
  };
  
  console.log('TikTok Video Downloader: Interceptor injected');
})();
