// TikTok Video Downloader - Retry Utilities
// Implements exponential backoff retry logic

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED']
};

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {object} config - Retry configuration
 * @returns {number} - Delay in milliseconds
 */
export function calculateBackoff(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Check if an error is retryable
 * @param {Error|Response} error - The error or response to check
 * @param {object} config - Retry configuration
 * @returns {boolean}
 */
export function isRetryableError(error, config = DEFAULT_RETRY_CONFIG) {
  // HTTP Response with retryable status code
  if (error && typeof error.status === 'number') {
    return config.retryableStatusCodes.includes(error.status);
  }
  
  // Network errors
  if (error && error.code) {
    return config.retryableErrors.includes(error.code);
  }
  
  // Fetch aborted/network errors
  if (error && error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  // AbortError is not retryable (user cancelled)
  if (error && error.name === 'AbortError') {
    return false;
  }
  
  return false;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {object} options - Options
 * @param {object} options.config - Retry configuration
 * @param {Function} options.onRetry - Callback on each retry
 * @param {AbortSignal} options.signal - Abort signal
 * @returns {Promise<any>} - Result of the operation
 */
export async function retryWithBackoff(operation, options = {}) {
  const { 
    config = DEFAULT_RETRY_CONFIG, 
    onRetry = null,
    signal = null 
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Check if aborted
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }
      
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt >= config.maxRetries || !isRetryableError(error, config)) {
        throw error;
      }
      
      // Calculate delay
      const delay = calculateBackoff(attempt, config);
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          delay,
          error
        });
      }
      
      console.log(`[Retry] Attempt ${attempt + 1}/${config.maxRetries} failed, retrying in ${delay}ms...`);
      
      // Wait before retry
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Fetch with automatic retry
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {object} retryOptions - Retry options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryOptions.config };
  
  return retryWithBackoff(async (attempt) => {
    const response = await fetch(url, {
      ...options,
      signal: retryOptions.signal
    });
    
    // Treat non-2xx responses as errors for retry logic
    if (!response.ok && config.retryableStatusCodes.includes(response.status)) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    return response;
  }, {
    config,
    onRetry: retryOptions.onRetry,
    signal: retryOptions.signal
  });
}

/**
 * Create a retry-enabled version of any async function
 * @param {Function} fn - Function to wrap
 * @param {object} config - Retry configuration
 * @returns {Function} - Wrapped function
 */
export function withRetry(fn, config = DEFAULT_RETRY_CONFIG) {
  return async (...args) => {
    return retryWithBackoff(() => fn(...args), { config });
  };
}
