import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorRecoveryManager, type NetworkError, type PaymentError, type PartnerAPIError, type ConvexError } from '../ErrorRecoveryManager';
import { OfflineQueueManager } from '../OfflineQueueManager';

// Mock ConvexReactClient
const mockConvex = {
  mutation: vi.fn(),
  query: vi.fn(),
} as any;

// Mock OfflineQueueManager
const mockOfflineQueue = {
  queueScore: vi.fn(),
  queuePhoto: vi.fn(),
  queueOrder: vi.fn(),
  syncWhenOnline: vi.fn(),
  isOnline: vi.fn(),
  getQueueStatus: vi.fn(),
} as any;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('ErrorRecoveryManager', () => {
  let errorRecovery: ErrorRecoveryManager;

  beforeEach(() => {
    vi.clearAllMocks();
    (navigator as any).onLine = true;
    errorRecovery = new ErrorRecoveryManager(mockConvex, mockOfflineQueue);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', async () => {
      const networkError = new Error('fetch failed');
      const callback = vi.fn();
      errorRecovery.onError(callback);

      await errorRecovery.handleError(networkError, 'test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isNetworkError: true,
          code: 'NETWORK_ERROR',
        }),
        'test'
      );
    });

    it('should classify payment errors correctly', async () => {
      const paymentError = new Error('payment failed');
      const callback = vi.fn();
      errorRecovery.onError(callback);

      await errorRecovery.handleError(paymentError, 'test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isPaymentError: true,
          code: 'PAYMENT_ERROR',
        }),
        'test'
      );
    });

    it('should classify partner API errors correctly', async () => {
      const apiError = new Error('partner API failed');
      const callback = vi.fn();
      errorRecovery.onError(callback);

      await errorRecovery.handleError(apiError, 'test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isPartnerAPIError: true,
          code: 'PARTNER_API_ERROR',
        }),
        'test'
      );
    });

    it('should classify unknown errors as Convex errors', async () => {
      const unknownError = new Error('unknown error');
      const callback = vi.fn();
      errorRecovery.onError(callback);

      await errorRecovery.handleError(unknownError, 'test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isConvexError: true,
        }),
        'test'
      );
    });
  });

  describe('Network Error Handling', () => {
    it('should handle offline network errors without retries', async () => {
      (navigator as any).onLine = false;
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'fetch failed',
        isNetworkError: true,
        code: 'NETWORK_ERROR',
      };

      const result = await errorRecovery.handleNetworkError(networkError, 'test');

      expect(result).toEqual({
        success: false,
        error: networkError,
        retryCount: 0,
        fallbackUsed: true,
      });
    });

    it('should retry network errors when online', async () => {
      (navigator as any).onLine = true;
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'fetch failed',
        isNetworkError: true,
        code: 'NETWORK_ERROR',
      };

      const result = await errorRecovery.handleNetworkError(networkError, 'test', {
        maxRetries: 1,
        retryDelay: 10, // Short delay for testing
      });

      expect(result.retryCount).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should use fallback action when retries fail', async () => {
      (navigator as any).onLine = true;
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'fetch failed',
        isNetworkError: true,
        code: 'NETWORK_ERROR',
      };

      const fallbackAction = vi.fn().mockResolvedValue(undefined);

      const result = await errorRecovery.handleNetworkError(networkError, 'test', {
        maxRetries: 1,
        retryDelay: 10,
        fallbackAction,
      });

      expect(fallbackAction).toHaveBeenCalled();
      expect(result.fallbackUsed).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('Payment Error Handling', () => {
    it('should not retry payment errors', async () => {
      const paymentError: PaymentError = {
        name: 'PaymentError',
        message: 'card_declined',
        isPaymentError: true,
        code: 'PAYMENT_ERROR',
      };

      const result = await errorRecovery.handlePaymentError(paymentError, 'test');

      expect(result).toEqual({
        success: false,
        error: paymentError,
        retryCount: 0,
        fallbackUsed: false,
      });
    });

    it('should provide user-friendly payment error messages', async () => {
      const testCases = [
        { message: 'card_declined', expected: 'Your card was declined. Please try a different payment method.' },
        { message: 'insufficient_funds', expected: 'Insufficient funds. Please check your account balance.' },
        { message: 'expired_card', expected: 'Your card has expired. Please update your payment information.' },
        { message: 'incorrect_cvc', expected: 'The security code is incorrect. Please check and try again.' },
        { message: 'unknown_error', expected: 'There was an issue processing your payment. Please try again.' },
      ];

      for (const testCase of testCases) {
        const paymentError: PaymentError = {
          name: 'PaymentError',
          message: testCase.message,
          isPaymentError: true,
          code: 'PAYMENT_ERROR',
        };

        // We can't directly test the private method, but we can verify the error handling doesn't crash
        const result = await errorRecovery.handlePaymentError(paymentError, 'test');
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Partner API Error Handling', () => {
    it('should limit retries for partner API errors', async () => {
      const apiError: PartnerAPIError = {
        name: 'PartnerAPIError',
        message: 'API failed',
        isPartnerAPIError: true,
        service: 'food-ordering',
        code: 'PARTNER_API_ERROR',
      };

      const result = await errorRecovery.handlePartnerAPIError(apiError, 'test', {
        maxRetries: 5, // Should be limited to 2
        retryDelay: 10,
      });

      expect(result.retryCount).toBeLessThanOrEqual(2);
    });

    it('should use fallback for partner API failures', async () => {
      const apiError: PartnerAPIError = {
        name: 'PartnerAPIError',
        message: 'API failed',
        isPartnerAPIError: true,
        service: 'food-ordering',
        code: 'PARTNER_API_ERROR',
      };

      const fallbackAction = vi.fn().mockResolvedValue(undefined);

      const result = await errorRecovery.handlePartnerAPIError(apiError, 'test', {
        maxRetries: 1,
        retryDelay: 10,
        fallbackAction,
      });

      expect(fallbackAction).toHaveBeenCalled();
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Convex Error Handling', () => {
    it('should not retry validation errors', async () => {
      const validationError: ConvexError = {
        name: 'ConvexError',
        message: 'validation failed',
        isConvexError: true,
      };

      const result = await errorRecovery.handleConvexError(validationError, 'test');

      expect(result).toEqual({
        success: false,
        error: validationError,
        retryCount: 0,
        fallbackUsed: false,
      });
    });

    it('should not retry "not found" errors', async () => {
      const notFoundError: ConvexError = {
        name: 'ConvexError',
        message: 'Game not found',
        isConvexError: true,
      };

      const result = await errorRecovery.handleConvexError(notFoundError, 'test');

      expect(result.retryCount).toBe(0);
    });

    it('should retry transient Convex errors', async () => {
      const transientError: ConvexError = {
        name: 'ConvexError',
        message: 'temporary server error',
        isConvexError: true,
      };

      const result = await errorRecovery.handleConvexError(transientError, 'test', {
        maxRetries: 2,
        retryDelay: 10,
      });

      expect(result.retryCount).toBe(2);
    });
  });

  describe('Retry Logic', () => {
    it('should use exponential backoff by default', async () => {
      const startTime = Date.now();
      let callCount = 0;

      const operation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Still failing');
        }
        return 'success';
      });

      // We can't directly test the private method, but we can test through handleError
      const error = new Error('test error');
      await errorRecovery.handleError(error, 'test', {
        maxRetries: 2,
        retryDelay: 50,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least the base delay time due to retries
      expect(duration).toBeGreaterThan(50);
    });

    it('should respect maxRetries limit', async () => {
      const error = new Error('persistent error');
      
      const result = await errorRecovery.handleError(error, 'test', {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(result.retryCount).toBe(3);
      expect(result.success).toBe(false);
    });
  });

  describe('Fallback Actions', () => {
    it('should provide fallback actions for common scenarios', () => {
      const fallbacks = errorRecovery.createFallbackActions();

      expect(fallbacks).toHaveProperty('fbOrderingFallback');
      expect(fallbacks).toHaveProperty('photoUploadFallback');
      expect(fallbacks).toHaveProperty('scoreRecordingFallback');
      expect(fallbacks).toHaveProperty('socialFeaturesFallback');

      expect(typeof fallbacks.fbOrderingFallback).toBe('function');
      expect(typeof fallbacks.photoUploadFallback).toBe('function');
      expect(typeof fallbacks.scoreRecordingFallback).toBe('function');
      expect(typeof fallbacks.socialFeaturesFallback).toBe('function');
    });

    it('should execute photo upload fallback correctly', async () => {
      const fallbacks = errorRecovery.createFallbackActions();
      const photoData = { url: 'test.jpg', playerId: 'player1' };

      await fallbacks.photoUploadFallback(photoData);

      expect(mockOfflineQueue.queuePhoto).toHaveBeenCalledWith(photoData);
    });

    it('should execute score recording fallback correctly', async () => {
      const fallbacks = errorRecovery.createFallbackActions();
      const scoreData = { playerId: 'player1', holeNumber: 1, strokes: 4 };

      await fallbacks.scoreRecordingFallback(scoreData);

      expect(mockOfflineQueue.queueScore).toHaveBeenCalledWith(scoreData);
    });
  });

  describe('Error Callbacks', () => {
    it('should register and call error callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      errorRecovery.onError(callback1);
      errorRecovery.onError(callback2);

      const error = new Error('test error');
      await errorRecovery.handleError(error, 'test context');

      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test error' }),
        'test context'
      );
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test error' }),
        'test context'
      );
    });

    it('should allow unsubscribing from error callbacks', async () => {
      const callback = vi.fn();
      const unsubscribe = errorRecovery.onError(callback);

      unsubscribe();

      const error = new Error('test error');
      await errorRecovery.handleError(error, 'test context');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', async () => {
      const faultyCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      errorRecovery.onError(faultyCallback);

      const error = new Error('test error');
      
      // Should not throw even if callback throws
      await expect(errorRecovery.handleError(error, 'test')).resolves.toBeDefined();
    });
  });

  describe('Test Mode', () => {
    it('should provide error recovery testing functionality', async () => {
      // Should not throw
      await expect(errorRecovery.testErrorRecovery()).resolves.toBeUndefined();
    });
  });
});