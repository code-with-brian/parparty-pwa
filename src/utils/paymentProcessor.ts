/**
 * Payment processing utilities for F&B orders
 * Integrates with Stripe via Convex backend
 */

import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

export interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export interface PaymentRequest {
  orderId: Id<"foodOrders">;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

export interface RefundRequest {
  paymentId: Id<"payments">;
  amount?: number; // in cents, if partial refund
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'order_canceled' | 'other';
  notes?: string;
}

class PaymentProcessor {
  private static instance: PaymentProcessor;
  private stripe: Stripe | null = null;
  private isInitialized = false;

  static getInstance(): PaymentProcessor {
    if (!PaymentProcessor.instance) {
      PaymentProcessor.instance = new PaymentProcessor();
    }
    return PaymentProcessor.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.stripe = await stripePromise;
      if (!this.stripe) {
        throw new Error('Failed to initialize Stripe');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Stripe initialization failed:', error);
      throw new Error('Payment system initialization failed');
    }
  }

  async createPaymentIntent(
    convexClient: any,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await convexClient.action("payments:createPaymentIntent", {
        orderId: request.orderId,
        paymentMethodId: request.paymentMethodId,
        savePaymentMethod: request.savePaymentMethod,
      });

      return {
        success: result.status === "succeeded",
        paymentId: result.paymentId,
        requiresAction: result.requiresAction,
        clientSecret: result.clientSecret,
      };
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  async confirmPayment(
    clientSecret: string,
    paymentElement?: StripeElements | StripeCardElement
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      let result;
      
      if (paymentElement) {
        // Confirm with payment element
        result = await this.stripe.confirmPayment({
          elements: paymentElement as StripeElements,
          confirmParams: {
            return_url: window.location.origin + '/payment/success',
          },
          redirect: 'if_required',
        });
      } else {
        // Confirm with client secret only (for saved payment methods)
        result = await this.stripe.confirmPayment({
          clientSecret,
          redirect: 'if_required',
        });
      }

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Payment confirmation failed',
        };
      }

      return {
        success: result.paymentIntent?.status === 'succeeded',
        paymentId: result.paymentIntent?.id,
        requiresAction: result.paymentIntent?.status === 'requires_action',
      };
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed',
      };
    }
  }

  async createPaymentMethod(
    convexClient: any,
    cardElement: StripeCardElement,
    userId?: Id<"users">,
    guestId?: Id<"guests">,
    setAsDefault = false
  ): Promise<{ paymentMethod?: PaymentMethod; error?: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Create payment method with Stripe
      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error || !paymentMethod) {
        return { error: error?.message || 'Failed to create payment method' };
      }

      // Save payment method via Convex
      const savedMethod = await convexClient.action("payments:createPaymentMethod", {
        userId,
        guestId,
        paymentMethodId: paymentMethod.id,
        setAsDefault,
      });

      return { paymentMethod: savedMethod };
    } catch (error) {
      console.error('Payment method creation failed:', error);
      return { error: error instanceof Error ? error.message : 'Payment method creation failed' };
    }
  }

  async getPaymentMethods(
    convexClient: any,
    userId?: Id<"users">,
    guestId?: Id<"guests">
  ): Promise<PaymentMethod[]> {
    try {
      return await convexClient.query("payments:getPaymentMethods", {
        userId,
        guestId,
      });
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      return [];
    }
  }

  async processRefund(
    convexClient: any,
    request: RefundRequest
  ): Promise<PaymentResult> {
    try {
      const result = await convexClient.action("payments:processRefund", {
        paymentId: request.paymentId,
        amount: request.amount,
        reason: request.reason,
        metadata: {
          initiatedBy: 'user', // Could be 'admin', 'system', etc.
          notes: request.notes,
        },
      });

      return {
        success: result.status === 'succeeded',
        paymentId: result.refundId,
      };
    } catch (error) {
      console.error('Refund processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  async getPaymentAnalytics(
    convexClient: any,
    courseId?: Id<"courses">,
    gameId?: Id<"games">,
    startDate?: string,
    endDate?: string
  ) {
    try {
      return await convexClient.query("payments:getPaymentAnalytics", {
        courseId,
        gameId,
        startDate,
        endDate,
      });
    } catch (error) {
      console.error('Failed to fetch payment analytics:', error);
      return [];
    }
  }

  // Utility functions
  formatAmount(amountInCents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountInCents / 100);
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999; // Max $9,999.99
  }

  getCardBrandIcon(brand?: string): string {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
      case 'american_express':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  }

  formatCardDisplay(paymentMethod: PaymentMethod): string {
    if (paymentMethod.type === 'apple_pay') {
      return '🍎 Apple Pay';
    }
    if (paymentMethod.type === 'google_pay') {
      return '🟢 Google Pay';
    }
    if (paymentMethod.last4 && paymentMethod.brand) {
      return `${this.getCardBrandIcon(paymentMethod.brand)} •••• ${paymentMethod.last4}`;
    }
    return 'Card';
  }

  // Error handling helpers
  getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.code) {
      switch (error.code) {
        case 'card_declined':
          return 'Your card was declined. Please try a different payment method.';
        case 'insufficient_funds':
          return 'Insufficient funds. Please try a different payment method.';
        case 'expired_card':
          return 'Your card has expired. Please try a different payment method.';
        case 'incorrect_cvc':
          return 'Your card\'s security code is incorrect.';
        case 'processing_error':
          return 'An error occurred while processing your payment. Please try again.';
        case 'rate_limit':
          return 'Too many requests. Please wait a moment and try again.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }
    return 'An unexpected error occurred. Please try again.';
  }
}

export const paymentProcessor = PaymentProcessor.getInstance();

// Re-export types for easier importing
export type { PaymentMethod, PaymentResult, PaymentRequest, RefundRequest };