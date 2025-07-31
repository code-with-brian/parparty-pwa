import { ConvexReactClient } from "convex/react";
import { OfflineQueueManager } from "./OfflineQueueManager";

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError: true;
}

export interface PaymentError extends Error {
  code?: string;
  paymentIntentId?: string;
  isPaymentError: true;
}

export interface PartnerAPIError extends Error {
  service?: string;
  endpoint?: string;
  status?: number;
  isPartnerAPIError: true;
}

export interface ConvexError extends Error {
  isConvexError: true;
}

export type RecoverableError = NetworkError | PaymentError | PartnerAPIError | ConvexError;

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  fallbackAction?: () => Promise<void>;
  userNotification?: string;
}

export interface ErrorRecoveryResult {
  success: boolean;
  error?: Error;
  retryCount: number;
  fallbackUsed: boolean;
}

export class ErrorRecoveryManager {
  private convex: ConvexReactClient;
  private offlineQueue: OfflineQueueManager;
  private errorCallbacks: Array<(error: RecoverableError, context?: string) => void> = [];

  constructor(convex: ConvexReactClient, offlineQueue: OfflineQueueManager) {
    this.convex = convex;
    this.offlineQueue = offlineQueue;
  }

  /**
   * Register callback for error notifications
   */
  public onError(callback: (error: RecoverableError, context?: string) => void): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all error callbacks
   */
  private notifyError(error: RecoverableError, context?: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error, context);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): RecoverableError {
    const message = error.message || '';
    
    // Network errors
    if (message.includes('fetch') || 
        message.includes('network') ||
        message.includes('offline') ||
        !navigator.onLine) {
      return {
        ...error,
        isNetworkError: true,
        code: 'NETWORK_ERROR'
      } as NetworkError;
    }

    // Payment errors
    if (message.includes('payment') || 
        message.includes('stripe') ||
        message.includes('card')) {
      return {
        ...error,
        isPaymentError: true,
        code: 'PAYMENT_ERROR'
      } as PaymentError;
    }

    // Partner API errors
    if (message.includes('partner') || 
        message.includes('external') ||
        message.includes('API')) {
      return {
        ...error,
        isPartnerAPIError: true,
        code: 'PARTNER_API_ERROR'
      } as PartnerAPIError;
    }

    // Convex errors
    return {
      ...error,
      isConvexError: true
    } as ConvexError;
  }

  /**
   * Handle network errors with offline fallback
   */
  public async handleNetworkError(
    error: NetworkError,
    context?: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult> {
    console.log(`Handling network error in context: ${context}`, error);
    
    this.notifyError(error, context);

    // If offline, don't retry - let offline queue handle it
    if (!navigator.onLine) {
      console.log('Device is offline, relying on offline queue');
      return {
        success: false,
        error,
        retryCount: 0,
        fallbackUsed: true
      };
    }

    // Try to recover with retries
    const result = await this.retryWithBackoff(
      async () => {
        // This would be the original operation that failed
        // For now, just check if we're back online
        if (!navigator.onLine) {
          throw new Error('Still offline');
        }
        return true;
      },
      options
    );

    if (!result.success && options.fallbackAction) {
      try {
        await options.fallbackAction();
        return {
          success: true,
          error: undefined,
          retryCount: result.retryCount,
          fallbackUsed: true
        };
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError);
      }
    }

    return result;
  }

  /**
   * Handle payment errors with user-friendly recovery
   */
  public async handlePaymentError(
    error: PaymentError,
    context?: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult> {
    console.log(`Handling payment error in context: ${context}`, error);
    
    this.notifyError(error, context);

    // Payment errors usually require user intervention
    // Don't auto-retry, but provide clear feedback
    const userMessage = this.getPaymentErrorMessage(error);
    
    if (options.userNotification) {
      // Show user-friendly error message
      console.log('Payment error notification:', userMessage);
    }

    // For payment errors, we typically don't auto-retry
    // Instead, we guide the user to fix the issue
    return {
      success: false,
      error,
      retryCount: 0,
      fallbackUsed: false
    };
  }

  /**
   * Handle partner API errors with graceful degradation
   */
  public async handlePartnerAPIError(
    error: PartnerAPIError,
    context?: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult> {
    console.log(`Handling partner API error in context: ${context}`, error);
    
    this.notifyError(error, context);

    // Try to recover with limited retries
    const result = await this.retryWithBackoff(
      async () => {
        // This would be the original partner API call
        // For now, just simulate a retry
        throw error; // Still failing
      },
      {
        ...options,
        maxRetries: Math.min(options.maxRetries || 2, 2) // Limit partner API retries
      }
    );

    if (!result.success) {
      // Provide graceful degradation
      console.log(`Partner API ${error.service} unavailable, using fallback`);
      
      if (options.fallbackAction) {
        try {
          await options.fallbackAction();
          return {
            success: true,
            error: undefined,
            retryCount: result.retryCount,
            fallbackUsed: true
          };
        } catch (fallbackError) {
          console.error('Partner API fallback failed:', fallbackError);
        }
      }
    }

    return result;
  }

  /**
   * Handle Convex errors with appropriate recovery
   */
  public async handleConvexError(
    error: ConvexError,
    context?: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult> {
    console.log(`Handling Convex error in context: ${context}`, error);
    
    this.notifyError(error, context);

    // Check if this is a validation error (don't retry)
    const message = error.message || '';
    if (message.includes('validation') || 
        message.includes('invalid') ||
        message.includes('not found')) {
      return {
        success: false,
        error,
        retryCount: 0,
        fallbackUsed: false
      };
    }

    // Try to recover with retries for transient errors
    const result = await this.retryWithBackoff(
      async () => {
        // This would be the original Convex operation
        // For now, just simulate a retry
        throw error; // Still failing
      },
      options
    );

    return result;
  }

  /**
   * Generic error handler that classifies and routes to specific handlers
   */
  public async handleError(
    error: Error,
    context?: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult> {
    const classifiedError = this.classifyError(error);

    if ('isNetworkError' in classifiedError) {
      return this.handleNetworkError(classifiedError, context, options);
    } else if ('isPaymentError' in classifiedError) {
      return this.handlePaymentError(classifiedError, context, options);
    } else if ('isPartnerAPIError' in classifiedError) {
      return this.handlePartnerAPIError(classifiedError, context, options);
    } else {
      return this.handleConvexError(classifiedError, context, options);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult & { result?: T }> {
    const maxRetries = options.maxRetries || 3;
    const baseDelay = options.retryDelay || 1000;
    const useExponentialBackoff = options.exponentialBackoff !== false;

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          retryCount: attempt,
          fallbackUsed: false,
          result
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = useExponentialBackoff 
            ? baseDelay * Math.pow(2, attempt)
            : baseDelay;
          
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      retryCount: maxRetries,
      fallbackUsed: false
    };
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly payment error message
   */
  private getPaymentErrorMessage(error: PaymentError): string {
    const message = error.message || '';
    if (message.includes('card_declined')) {
      return 'Your card was declined. Please try a different payment method.';
    } else if (message.includes('insufficient_funds')) {
      return 'Insufficient funds. Please check your account balance.';
    } else if (message.includes('expired_card')) {
      return 'Your card has expired. Please update your payment information.';
    } else if (message.includes('incorrect_cvc')) {
      return 'The security code is incorrect. Please check and try again.';
    } else {
      return 'There was an issue processing your payment. Please try again.';
    }
  }

  /**
   * Create fallback actions for common scenarios
   */
  public createFallbackActions() {
    return {
      // Fallback for F&B ordering when partner API is down
      fbOrderingFallback: async () => {
        console.log('F&B ordering unavailable, showing offline message');
        // Could show a message to users about ordering at the clubhouse
      },

      // Fallback for photo upload when storage is unavailable
      photoUploadFallback: async (photoData: any) => {
        console.log('Photo upload unavailable, storing locally');
        // Store photo locally for later upload
        this.offlineQueue.queuePhoto(photoData);
      },

      // Fallback for score recording when Convex is unavailable
      scoreRecordingFallback: async (scoreData: any) => {
        console.log('Score recording unavailable, queuing for later');
        this.offlineQueue.queueScore(scoreData);
      },

      // Fallback for social features when unavailable
      socialFeaturesFallback: async () => {
        console.log('Social features temporarily unavailable');
        // Could disable social features temporarily
      }
    };
  }

  /**
   * Test error recovery system
   */
  public async testErrorRecovery(): Promise<void> {
    console.log('Testing error recovery system...');

    // Test network error
    try {
      await this.handleNetworkError({
        name: 'NetworkError',
        message: 'Network request failed',
        isNetworkError: true,
        code: 'NETWORK_ERROR'
      }, 'test');
    } catch (error) {
      console.log('Network error test completed');
    }

    // Test payment error
    try {
      await this.handlePaymentError({
        name: 'PaymentError',
        message: 'card_declined',
        isPaymentError: true,
        code: 'PAYMENT_ERROR'
      }, 'test');
    } catch (error) {
      console.log('Payment error test completed');
    }

    console.log('Error recovery system test completed');
  }
}