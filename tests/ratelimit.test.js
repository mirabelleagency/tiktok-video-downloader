/**
 * Rate Limiter Tests
 */

const { 
  RateLimiter, 
  rateLimiters, 
  withRateLimit, 
  canMakeRequest, 
  getWaitTimeForService 
} = require('../src/utils/ratelimit');

describe('Rate Limiter', () => {
  describe('RateLimiter Class', () => {
    test('should create limiter with default options', () => {
      const limiter = new RateLimiter();
      expect(limiter.tokensPerInterval).toBe(10);
      expect(limiter.interval).toBe(1000);
      expect(limiter.maxTokens).toBe(10);
      expect(limiter.tokens).toBe(10);
    });

    test('should create limiter with custom options', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 5,
        interval: 500,
        maxTokens: 20
      });
      expect(limiter.tokensPerInterval).toBe(5);
      expect(limiter.interval).toBe(500);
      expect(limiter.maxTokens).toBe(20);
    });

    test('should consume tokens successfully', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      
      expect(limiter.tryConsume(1)).toBe(true);
      expect(limiter.tokens).toBe(9);
      
      expect(limiter.tryConsume(5)).toBe(true);
      expect(limiter.tokens).toBe(4);
    });

    test('should fail to consume when insufficient tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 3 });
      
      expect(limiter.tryConsume(5)).toBe(false);
      expect(limiter.tokens).toBe(3);
    });

    test('should refill tokens over time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 50,
        maxTokens: 10
      });
      
      limiter.tryConsume(10);
      expect(limiter.tokens).toBe(0);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      limiter.refill();
      
      expect(limiter.tokens).toBeGreaterThanOrEqual(10);
    });

    test('should not exceed maxTokens on refill', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 10,
        maxTokens: 5
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      limiter.refill();
      
      expect(limiter.tokens).toBeLessThanOrEqual(5);
    });

    test('should calculate correct wait time when empty', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 1000,
        maxTokens: 5
      });
      
      // Full - no wait
      expect(limiter.getWaitTime()).toBe(0);
      
      // Empty - must wait
      limiter.tokens = 0;
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(1000);
    });

    test('should reset to max tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      
      limiter.tryConsume(10);
      expect(limiter.tokens).toBe(0);
      
      limiter.reset();
      expect(limiter.tokens).toBe(10);
    });

    test('should get current token count with refill', () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      limiter.tryConsume(5);
      
      const tokens = limiter.getTokens();
      expect(tokens).toBeGreaterThanOrEqual(5);
    });
  });

  describe('waitForToken', () => {
    test('should resolve immediately when tokens available', async () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      const start = Date.now();
      
      await limiter.waitForToken();
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
      expect(limiter.tokens).toBe(9);
    });

    test('should wait and consume when no tokens', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 50,
        maxTokens: 1
      });
      
      limiter.tryConsume(1);
      expect(limiter.tokens).toBe(0);
      
      const start = Date.now();
      await limiter.waitForToken();
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    test('should respect abort signal', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 10000,
        maxTokens: 1
      });
      
      limiter.tryConsume(1);
      
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);
      
      await expect(limiter.waitForToken(controller.signal))
        .rejects.toThrow('Rate limit wait aborted');
    });
  });

  describe('Pre-configured Limiters', () => {
    test('should have googleDrive limiter configured', () => {
      expect(rateLimiters.googleDrive).toBeInstanceOf(RateLimiter);
      expect(rateLimiters.googleDrive.maxTokens).toBe(100);
    });

    test('should have googleSheets limiter configured', () => {
      expect(rateLimiters.googleSheets).toBeInstanceOf(RateLimiter);
      expect(rateLimiters.googleSheets.maxTokens).toBe(10);
    });

    test('should have videoFetch limiter configured', () => {
      expect(rateLimiters.videoFetch).toBeInstanceOf(RateLimiter);
      expect(rateLimiters.videoFetch.maxTokens).toBe(20);
    });
  });

  describe('withRateLimit Wrapper', () => {
    test('should wrap function with rate limiting', async () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      const mockFn = jest.fn().mockResolvedValue('result');
      
      const wrapped = withRateLimit(mockFn, limiter);
      const result = await wrapped('arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(limiter.tokens).toBe(9);
    });

    test('should preserve this context', async () => {
      const limiter = new RateLimiter({ maxTokens: 10 });
      const obj = {
        value: 42,
        getValue: function() { return this.value; }
      };
      
      obj.getValue = withRateLimit(obj.getValue, limiter);
      const result = await obj.getValue();
      
      expect(result).toBe(42);
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      // Reset limiters
      Object.values(rateLimiters).forEach(l => l.reset());
    });

    test('canMakeRequest should return true when tokens available', () => {
      expect(canMakeRequest('googleDrive')).toBe(true);
      expect(canMakeRequest('googleSheets')).toBe(true);
      expect(canMakeRequest('videoFetch')).toBe(true);
    });

    test('canMakeRequest should return true for unknown service', () => {
      expect(canMakeRequest('unknown')).toBe(true);
    });

    test('getWaitTimeForService should return 0 when tokens available', () => {
      expect(getWaitTimeForService('googleDrive')).toBe(0);
    });

    test('getWaitTimeForService should return 0 for unknown service', () => {
      expect(getWaitTimeForService('unknown')).toBe(0);
    });
  });
});
