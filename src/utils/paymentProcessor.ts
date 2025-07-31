/**
 * Payment processing utilities for F&B orders
 * This is a simplified implementation for MVP - in production would integrate with Stripe
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

export interface PaymentRequest {
  amount: number; // in cents
  currency: string;
  description: string;
  orderId: string;
  customerEmail?: string;
  paymentMethod?: PaymentMethod;
}

class PaymentProcessor {
  private static instance: PaymentProcessor;
  private isInitialized = false;

  static getInstance(): PaymentProcessor {
    if (!PaymentProcessor.instance) {
      PaymentProcessor.instance = new PaymentProcessor();
    }
    return PaymentProcessor.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // In production, this would initialize Stripe or other payment provider
    // For MVP, we'll simulate initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isInitialized = true;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For MVP, simulate successful payment
      // In production, this would make actual API calls to payment provider
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate occasional failures for testing
      if (Math.random() < 0.05) { // 5% failure rate
        return {
          success: false,
          error: 'Payment declined. Please try a different payment method.',
        };
      }

      // Simulate 3D Secure requirement occasionally
      if (Math.random() < 0.1) { // 10% require action
        return {
          success: false,
          requiresAction: true,
          actionUrl: `https://payment-provider.com/3ds/${paymentId}`,
          paymentId,
        };
      }

      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed. Please try again.',
      };
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    try {
      // Simulate refund processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        paymentId: refundId,
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: 'Refund processing failed. Please contact support.',
      };
    }
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    // In production, this would fetch saved payment methods from the backend
    // For MVP, return mock data
    return [
      {
        id: 'pm_card_visa',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
      },
      {
        id: 'pm_apple_pay',
        type: 'apple_pay',
      },
      {
        id: 'pm_google_pay',
        type: 'google_pay',
      },
    ];
  }

  formatAmount(amountInCents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountInCents / 100);
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999; // Max $9,999.99
  }
}

export const paymentProcessor = PaymentProcessor.getInstance();