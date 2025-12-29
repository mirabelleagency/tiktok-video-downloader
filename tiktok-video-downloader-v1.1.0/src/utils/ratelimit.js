/**
 * Rate Limiting Utilities
 * Implements token bucket algorithm for API rate limiting
 */

/**
 * Token bucket rate limiter
 * @param {Object} config - Configuration options
 * @param {number} config.tokensPerInterval - Number of tokens to add per interval
 * @param {number} config.interval - Interval in milliseconds
 * @param {number} config.maxTokens - Maximum tokens in bucket
 */
class RateLimiter {
  constructor({ tokensPerInterval = 10, interval = 1000, maxTokens = 10 } = {}) {
    this.tokensPerInterval = tokensPerInterval;
    this.interval = interval;
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.interval) * this.tokensPerInterval;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Try to consume a token
   * @param {number} count - Number of tokens to consume
   * @returns {boolean} - Whether tokens were consumed
   */
  tryConsume(count = 1) {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    
    return false;
  }

  /**
   * Get time until next token is available
   * @returns {number} - Milliseconds until next token
   */
  getWaitTime() {
    this.refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.tokensPerInterval * this.interval);
  }

  /**
   * Wait for a token to become available, then consume it
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {Promise<void>}
   */
  async waitForToken(signal) {
    const waitTime = this.getWaitTime();
    
    if (waitTime > 0) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, waitTime);
        
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Rate limit wait aborted'));
          });
        }
      });
    }
    
    if (!this.tryConsume()) {
      // Recursive call if token still not available (edge case)
      return this.waitForToken(signal);
    }
  }

  /**
   * Get current token count
   * @returns {number}
   */
  getTokens() {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Pre-configured rate limiters for different API services
 */
const rateLimiters = {
  // Google Drive API: 12,000 queries per 100 seconds per user
  googleDrive: new RateLimiter({
    tokensPerInterval: 100,
    interval: 1000,
    maxTokens: 100
  }),
  
  // Google Sheets API: 100 requests per 100 seconds per user
  googleSheets: new RateLimiter({
    tokensPerInterval: 1,
    interval: 1000,
    maxTokens: 10
  }),
  
  // TikTok video fetching: conservative limit
  videoFetch: new RateLimiter({
    tokensPerInterval: 5,
    interval: 1000,
    maxTokens: 20
  })
};

/**
 * Wrap a function with rate limiting
 * @param {Function} fn - Function to wrap
 * @param {RateLimiter} limiter - Rate limiter to use
 * @returns {Function} - Rate-limited function
 */
function withRateLimit(fn, limiter) {
  return async function rateLimitedFunction(...args) {
    await limiter.waitForToken();
    return fn.apply(this, args);
  };
}

/**
 * Check if we can make an API call without waiting
 * @param {string} service - Service name ('googleDrive', 'googleSheets', 'videoFetch')
 * @returns {boolean}
 */
function canMakeRequest(service) {
  const limiter = rateLimiters[service];
  if (!limiter) {
    console.warn(`[RateLimit] Unknown service: ${service}`);
    return true;
  }
  return limiter.getTokens() >= 1;
}

/**
 * Get wait time for next available request
 * @param {string} service - Service name
 * @returns {number} - Milliseconds to wait
 */
function getWaitTimeForService(service) {
  const limiter = rateLimiters[service];
  if (!limiter) {
    return 0;
  }
  return limiter.getWaitTime();
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RateLimiter,
    rateLimiters,
    withRateLimit,
    canMakeRequest,
    getWaitTimeForService
  };
}
