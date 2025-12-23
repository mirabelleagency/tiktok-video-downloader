// Tests for retry utilities
const { 
  calculateBackoff,
  isRetryableError,
  sleep,
  retryWithBackoff,
  DEFAULT_RETRY_CONFIG
} = require('../src/utils/retry.js');

describe('Retry Utilities', () => {
  describe('calculateBackoff', () => {
    test('should calculate initial delay for attempt 0', () => {
      const delay = calculateBackoff(0);
      // Initial delay is 1000ms with ±25% jitter
      expect(delay).toBeGreaterThanOrEqual(750);
      expect(delay).toBeLessThanOrEqual(1250);
    });

    test('should increase delay exponentially', () => {
      const attempt0 = calculateBackoff(0, { ...DEFAULT_RETRY_CONFIG, initialDelay: 1000 });
      const attempt1 = calculateBackoff(1, { ...DEFAULT_RETRY_CONFIG, initialDelay: 1000 });
      const attempt2 = calculateBackoff(2, { ...DEFAULT_RETRY_CONFIG, initialDelay: 1000 });
      
      // Delays should roughly double each time (accounting for jitter)
      expect(attempt1).toBeGreaterThan(attempt0);
      expect(attempt2).toBeGreaterThan(attempt1);
    });

    test('should not exceed maxDelay', () => {
      const maxDelay = 5000;
      const delay = calculateBackoff(10, { ...DEFAULT_RETRY_CONFIG, maxDelay });
      expect(delay).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe('isRetryableError', () => {
    test('should identify retryable HTTP status codes', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 502 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 504 })).toBe(true);
    });

    test('should not retry client errors', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
      expect(isRetryableError({ status: 403 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
    });

    test('should identify retryable network errors', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true);
    });

    test('should not retry abort errors', () => {
      expect(isRetryableError({ name: 'AbortError' })).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe('sleep', () => {
    test('should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90);
    });
  });

  describe('retryWithBackoff', () => {
    test('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce('success');
      
      const config = { ...DEFAULT_RETRY_CONFIG, initialDelay: 10, maxRetries: 2 };
      const result = await retryWithBackoff(operation, { config });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should not retry non-retryable errors', async () => {
      const error = { status: 404 };
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryWithBackoff(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should give up after max retries', async () => {
      const error = { status: 503 };
      const operation = jest.fn().mockRejectedValue(error);
      
      const config = { ...DEFAULT_RETRY_CONFIG, initialDelay: 10, maxRetries: 2 };
      
      await expect(retryWithBackoff(operation, { config })).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce('success');
      
      const onRetry = jest.fn();
      const config = { ...DEFAULT_RETRY_CONFIG, initialDelay: 10, maxRetries: 2 };
      
      await retryWithBackoff(operation, { config, onRetry });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({
        attempt: 1,
        maxRetries: 2,
        delay: expect.any(Number)
      }));
    });

    test('should respect abort signal', async () => {
      const controller = new AbortController();
      const operation = jest.fn().mockResolvedValue('success');
      
      controller.abort();
      
      await expect(
        retryWithBackoff(operation, { signal: controller.signal })
      ).rejects.toThrow('Operation aborted');
    });
  });
});
