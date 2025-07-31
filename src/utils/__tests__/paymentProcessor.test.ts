import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { paymentProcessor } from '../paymentProcessor';
import { Id } from './mocks/convexTypes';

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
  createPaymentMethod: vi.fn(),
};

const mockLoadStripe = vi.fn().mockResolvedValue(mockStripe);

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: mockLoadStripe,
}));

// Mock Convex client
const mockConvexClient = {
  action: vi.fn(),
  query: vi.fn(),
};

describe('PaymentProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize Stripe successfully', async () => {
      await paymentProcessor.initialize();
      expect(mockLoadStripe).toHaveBeenCalled();
    });

    it('should throw error if Stripe fails to initialize', async () => {
      mockLoadStripe.mockResolvedValueOnce(null);
      
      await expect(paymentProcessor.initialize()).rejects.toThrow(
        'Payment system initialization failed'
      );
    });
  });

  describe('createPaymentIntent', () => {
    const mockOrderId = 'order_123' as Id<"foodOrders">;
    const mockRequest = {
      orderId: mockOrderId,
      paymentMethodId: 'pm_test_123',
      savePaymentMethod: true,
    };

    beforeEach(async () => {
      await paymentProcessor.initialize();
    });

    it('should create payment intent successfully', async () => {
      const mockResponse = {
        status: 'succeeded',
        paymentId: 'pay_123',
        requiresAction: false,
        clientSecret: 'pi_test_client_secret',
      };

      mockConvexClient.action.mockResolvedValue(mockResponse);

      const result = await paymentProcessor.createPaymentIntent(mockConvexClient, mockRequest);

      expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentIntent', {
        orderId: mockOrderId,
        paymentMethodId: 'pm_test_123',
        savePaymentMethod: true,
      });

      expect(result).toEqual({
        success: true,
        paymentId: 'pay_123',
        requiresAction: false,
        clientSecret: 'pi_test_client_secret',
      });
    });

    it('should handle payment intent creation failure', async () => {
      mockConvexClient.action.mockRejectedValue(new Error('Payment failed'));

      const result = await paymentProcessor.createPaymentIntent(mockConvexClient, mockRequest);

      expect(result).toEqual({
        success: false,
        error: 'Payment failed',
      });
    });

    it('should handle requires_action status', async () => {
      const mockResponse = {
        status: 'requires_action',
        paymentId: 'pay_123',
        requiresAction: true,
        clientSecret: 'pi_test_client_secret',
      };

      mockConvexClient.action.mockResolvedValue(mockResponse);

      const result = await paymentProcessor.createPaymentIntent(mockConvexClient, mockRequest);

      expect(result).toEqual({
        success: false,
        paymentId: 'pay_123',
        requiresAction: true,
        clientSecret: 'pi_test_client_secret',
      });
    });
  });

  describe('confirmPayment', () => {
    beforeEach(async () => {
      await paymentProcessor.initialize();
    });

    it('should confirm payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
      };

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
      });

      const result = await paymentProcessor.confirmPayment('pi_test_client_secret');

      expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
        clientSecret: 'pi_test_client_secret',
        redirect: 'if_required',
      });

      expect(result).toEqual({
        success: true,
        paymentId: 'pi_test_123',
        requiresAction: false,
      });
    });

    it('should handle payment confirmation error', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        error: {
          message: 'Your card was declined.',
        },
      });

      const result = await paymentProcessor.confirmPayment('pi_test_client_secret');

      expect(result).toEqual({
        success: false,
        error: 'Your card was declined.',
      });
    });

    it('should handle requires_action status', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'requires_action',
      };

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
      });

      const result = await paymentProcessor.confirmPayment('pi_test_client_secret');

      expect(result).toEqual({
        success: false,
        paymentId: 'pi_test_123',
        requiresAction: true,
      });
    });
  });

  describe('createPaymentMethod', () => {
    const mockCardElement = {
      clear: vi.fn(),
    };

    beforeEach(async () => {
      await paymentProcessor.initialize();
    });

    it('should create payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        type: 'card',
      };

      const mockSavedMethod = {
        id: 'pm_test_123',
        type: 'card' as const,
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      };

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: mockPaymentMethod,
      });

      mockConvexClient.action.mockResolvedValue(mockSavedMethod);

      const result = await paymentProcessor.createPaymentMethod(
        mockConvexClient,
        mockCardElement as any,
        'user_123' as Id<"users">,
        undefined,
        true
      );

      expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
        type: 'card',
        card: mockCardElement,
      });

      expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentMethod', {
        userId: 'user_123',
        guestId: undefined,
        paymentMethodId: 'pm_test_123',
        setAsDefault: true,
      });

      expect(result).toEqual({
        paymentMethod: mockSavedMethod,
      });
    });

    it('should handle payment method creation error', async () => {
      mockStripe.createPaymentMethod.mockResolvedValue({
        error: {
          message: 'Your card number is invalid.',
        },
      });

      const result = await paymentProcessor.createPaymentMethod(
        mockConvexClient,
        mockCardElement as any
      );

      expect(result).toEqual({
        error: 'Your card number is invalid.',
      });
    });
  });

  describe('processRefund', () => {
    const mockRefundRequest = {
      paymentId: 'pay_123' as Id<"payments">,
      amount: 1000,
      reason: 'requested_by_customer' as const,
      notes: 'Customer requested refund',
    };

    it('should process refund successfully', async () => {
      const mockResponse = {
        status: 'succeeded',
        refundId: 'ref_123',
      };

      mockConvexClient.action.mockResolvedValue(mockResponse);

      const result = await paymentProcessor.processRefund(mockConvexClient, mockRefundRequest);

      expect(mockConvexClient.action).toHaveBeenCalledWith('payments:processRefund', {
        paymentId: 'pay_123',
        amount: 1000,
        reason: 'requested_by_customer',
        metadata: {
          initiatedBy: 'user',
          notes: 'Customer requested refund',
        },
      });

      expect(result).toEqual({
        success: true,
        paymentId: 'ref_123',
      });
    });

    it('should handle refund processing error', async () => {
      mockConvexClient.action.mockRejectedValue(new Error('Refund failed'));

      const result = await paymentProcessor.processRefund(mockConvexClient, mockRefundRequest);

      expect(result).toEqual({
        success: false,
        error: 'Refund failed',
      });
    });
  });

  describe('utility functions', () => {
    describe('formatAmount', () => {
      it('should format amount in cents to currency string', () => {
        expect(paymentProcessor.formatAmount(1000)).toBe('$10.00');
        expect(paymentProcessor.formatAmount(1234)).toBe('$12.34');
        expect(paymentProcessor.formatAmount(50)).toBe('$0.50');
      });

      it('should handle different currencies', () => {
        expect(paymentProcessor.formatAmount(1000, 'EUR')).toBe('€10.00');
      });
    });

    describe('validateAmount', () => {
      it('should validate positive amounts', () => {
        expect(paymentProcessor.validateAmount(100)).toBe(true);
        expect(paymentProcessor.validateAmount(999999)).toBe(true);
      });

      it('should reject invalid amounts', () => {
        expect(paymentProcessor.validateAmount(0)).toBe(false);
        expect(paymentProcessor.validateAmount(-100)).toBe(false);
        expect(paymentProcessor.validateAmount(1000000)).toBe(false);
      });
    });

    describe('formatCardDisplay', () => {
      it('should format card payment method', () => {
        const cardMethod = {
          id: 'pm_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
        };

        expect(paymentProcessor.formatCardDisplay(cardMethod)).toBe('💳 •••• 4242');
      });

      it('should format Apple Pay', () => {
        const applePayMethod = {
          id: 'pm_123',
          type: 'apple_pay' as const,
        };

        expect(paymentProcessor.formatCardDisplay(applePayMethod)).toBe('🍎 Apple Pay');
      });

      it('should format Google Pay', () => {
        const googlePayMethod = {
          id: 'pm_123',
          type: 'google_pay' as const,
        };

        expect(paymentProcessor.formatCardDisplay(googlePayMethod)).toBe('🟢 Google Pay');
      });
    });

    describe('getErrorMessage', () => {
      it('should handle string errors', () => {
        expect(paymentProcessor.getErrorMessage('Payment failed')).toBe('Payment failed');
      });

      it('should handle error objects with message', () => {
        const error = new Error('Network error');
        expect(paymentProcessor.getErrorMessage(error)).toBe('Network error');
      });

      it('should handle Stripe error codes', () => {
        const stripeError = { code: 'card_declined' };
        expect(paymentProcessor.getErrorMessage(stripeError)).toBe(
          'Your card was declined. Please try a different payment method.'
        );
      });

      it('should handle unknown errors', () => {
        expect(paymentProcessor.getErrorMessage({})).toBe(
          'An unexpected error occurred. Please try again.'
        );
      });
    });
  });
});