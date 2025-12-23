// TikTok Video Downloader - Network Status Utilities
// Handles offline detection and network state management

/**
 * Network status state
 */
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let listeners = [];

/**
 * Check if the browser is currently online
 * @returns {boolean}
 */
export function checkOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true; // Assume online in non-browser environments
  }
  return navigator.onLine;
}

/**
 * Get current online status
 * @returns {boolean}
 */
export function getOnlineStatus() {
  return isOnline;
}

/**
 * Add a listener for network status changes
 * @param {Function} callback - Called with (isOnline: boolean)
 * @returns {Function} - Unsubscribe function
 */
export function onNetworkStatusChange(callback) {
  listeners.push(callback);
  
  return () => {
    listeners = listeners.filter(fn => fn !== callback);
  };
}

/**
 * Notify all listeners of network status change
 * @param {boolean} online - New online status
 */
function notifyListeners(online) {
  listeners.forEach(callback => {
    try {
      callback(online);
    } catch (error) {
      console.error('[Network] Error in status change listener:', error);
    }
  });
}

/**
 * Initialize network status monitoring
 * Sets up event listeners for online/offline events
 */
export function initNetworkMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }
  
  const handleOnline = () => {
    isOnline = true;
    console.log('[Network] Connection restored');
    notifyListeners(true);
  };
  
  const handleOffline = () => {
    isOnline = false;
    console.log('[Network] Connection lost');
    notifyListeners(false);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Wait for network to come back online
 * @param {number} timeout - Maximum time to wait in ms (default: 30s)
 * @returns {Promise<boolean>} - Resolves true if online, false if timeout
 */
export function waitForOnline(timeout = 30000) {
  if (isOnline) {
    return Promise.resolve(true);
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onNetworkStatusChange((online) => {
      if (online) {
        unsubscribe();
        clearTimeout(timeoutId);
        resolve(true);
      }
    });
    
    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeout);
  });
}

/**
 * Check if a specific URL/API is reachable
 * Uses a lightweight HEAD request
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in ms (default: 5s)
 * @returns {Promise<boolean>}
 */
export async function checkConnectivity(url = 'https://www.google.com/generate_204', timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // We only care if the request succeeds, not the response content
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Check TikTok API connectivity
 * @returns {Promise<boolean>}
 */
export async function checkTikTokConnectivity() {
  return checkConnectivity('https://www.tiktok.com', 5000);
}

/**
 * Check Google API connectivity
 * @returns {Promise<boolean>}
 */
export async function checkGoogleConnectivity() {
  return checkConnectivity('https://www.googleapis.com', 5000);
}

/**
 * Get detailed network status
 * @returns {Promise<object>}
 */
export async function getNetworkStatus() {
  const [tiktokReachable, googleReachable] = await Promise.all([
    checkTikTokConnectivity(),
    checkGoogleConnectivity()
  ]);
  
  return {
    online: isOnline,
    browserOnline: checkOnlineStatus(),
    tiktokReachable,
    googleReachable,
    timestamp: Date.now()
  };
}

/**
 * Offline-aware operation wrapper
 * Checks network before executing and provides friendly error
 * @param {Function} operation - Async operation to execute
 * @param {string} operationName - Name for error messages
 * @returns {Promise<any>}
 */
export async function executeOnlineOnly(operation, operationName = 'Operation') {
  if (!checkOnlineStatus()) {
    throw new OfflineError(`${operationName} requires an internet connection`);
  }
  
  try {
    return await operation();
  } catch (error) {
    // Re-check if we went offline during the operation
    if (!checkOnlineStatus() && isNetworkError(error)) {
      throw new OfflineError(`${operationName} failed - you appear to be offline`);
    }
    throw error;
  }
}

/**
 * Check if an error is likely a network-related error
 * @param {Error} error
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (!error) return false;
  
  // Network error indicators
  const networkErrorMessages = [
    'network',
    'fetch',
    'offline',
    'internet',
    'connection',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND'
  ];
  
  const errorString = (error.message || '').toLowerCase() + ' ' + (error.code || '').toLowerCase();
  return networkErrorMessages.some(msg => errorString.includes(msg.toLowerCase()));
}

/**
 * Custom error class for offline errors
 */
export class OfflineError extends Error {
  constructor(message = 'No internet connection') {
    super(message);
    this.name = 'OfflineError';
    this.isOfflineError = true;
  }
}
