// TikTok Video Downloader - Validation Utilities
// Input validation and security helpers

/**
 * Valid TikTok CDN domains for video URLs
 */
export const VALID_VIDEO_DOMAINS = [
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokcdn-eu.com',
  'tiktokcdn-in.com',
  'muscdn.com',
  'byteoversea.com',
  'bytecdn.cn',
  'tiktok.com',
  'ibyteimg.com'
];

/**
 * Validates if a video URL is from a trusted TikTok CDN
 * @param {string} url - The video URL to validate
 * @returns {boolean} True if the URL is valid and from trusted domain
 */
export function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      console.warn('[Validation] URL must use HTTPS:', url.substring(0, 50));
      return false;
    }
    
    // Check if domain is trusted
    const hostname = parsed.hostname.toLowerCase();
    const isTrusted = VALID_VIDEO_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isTrusted) {
      console.warn('[Validation] Untrusted domain:', hostname);
      return false;
    }
    
    // Check for video file extension
    const hasVideoExtension = parsed.pathname.includes('.mp4') || 
                               parsed.pathname.includes('.webm') ||
                               parsed.pathname.includes('video');
    
    if (!hasVideoExtension) {
      console.warn('[Validation] URL does not appear to be a video:', url.substring(0, 50));
      // Still allow, as some TikTok URLs don't have explicit extensions
    }
    
    return true;
  } catch (error) {
    console.error('[Validation] Invalid URL format:', error.message);
    return false;
  }
}

/**
 * Validates TikTok page URL
 * @param {string} url - The page URL to validate
 * @returns {boolean} True if it's a valid TikTok page
 */
export function isValidTikTokPage(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    return hostname === 'www.tiktok.com' || 
           hostname === 'tiktok.com' ||
           hostname === 'm.tiktok.com' ||
           hostname === 'vm.tiktok.com';
  } catch {
    return false;
  }
}

/**
 * Sanitizes a username for safe display
 * @param {string} username - The username to sanitize
 * @returns {string} Sanitized username
 */
export function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') {
    return 'unknown';
  }
  
  // Remove @ prefix if present and limit length
  return username
    .replace(/^@/, '')
    .replace(/[<>&"']/g, '') // Remove HTML special chars
    .substring(0, 50);
}

/**
 * Sanitizes a video ID
 * @param {string} videoId - The video ID to sanitize
 * @returns {string|null} Sanitized video ID or null if invalid
 */
export function sanitizeVideoId(videoId) {
  if (!videoId || typeof videoId !== 'string') {
    return null;
  }
  
  // TikTok video IDs are typically 19 digits
  const cleaned = videoId.replace(/\D/g, '');
  
  if (cleaned.length < 15 || cleaned.length > 25) {
    console.warn('[Validation] Unusual video ID length:', cleaned.length);
  }
  
  return cleaned || null;
}

/**
 * Sanitizes text for safe HTML display
 * @param {string} text - Text to sanitize
 * @returns {string} Safe text for HTML
 */
export function sanitizeForHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates file size is within acceptable range
 * @param {number} sizeBytes - File size in bytes
 * @param {number} maxMB - Maximum size in MB (default 500MB)
 * @returns {boolean} True if size is acceptable
 */
export function isValidFileSize(sizeBytes, maxMB = 500) {
  if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
    return false;
  }
  
  const maxBytes = maxMB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Creates a safe filename from video data
 * @param {object} videoData - Video data object
 * @returns {string} Safe filename
 */
export function createSafeFilename(videoData) {
  const username = sanitizeUsername(videoData?.username || 'unknown');
  const videoId = sanitizeVideoId(videoData?.videoId) || 'video';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  return `tiktok_@${username}_${videoId}_${timestamp}.mp4`;
}

/**
 * Validates OAuth token format (basic check)
 * @param {string} token - OAuth token
 * @returns {boolean} True if format appears valid
 */
export function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // OAuth tokens are typically at least 50 characters
  return token.length >= 50;
}
