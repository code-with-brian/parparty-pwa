import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { paymentProcessor } from '../utils/paymentProcessor';
import type { PaymentMethod } from '../utils/paymentProcessor';
// Temporarily disable Convex imports to fix build issues
// import { api } from '../../convex/_generated/api';
// import type { Doc, Id } from '../../convex/_generated/dataModel.d.ts';

// Temporary type definitions
type Id<T> = string;
import { useConvex } from 'convex/react';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

interface PaymentFormProps {
  orderId: Id<"foodOrders">;
  amount: number; // in cents
  userId?: Id<"users">;
  guestId?: Id<"guests">;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  orderId,
  amount,
  userId,
  guestId,
  onSuccess,
  onError,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const convex = useConvex();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [useNewCard, setUseNewCard] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    loadPaymentMethods();
  }, [userId, guestId]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentProcessor.getPaymentMethods(convex, userId, guestId);
      setPaymentMethods(methods);
      
      // Auto-select default payment method
      const defaultMethod = methods.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else if (methods.length === 0) {
        setUseNewCard(true);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      let paymentMethodId = selectedPaymentMethod;

      // Create new payment method if using new card
      if (useNewCard) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { paymentMethod, error } = await paymentProcessor.createPaymentMethod(
          convex,
          cardElement,
          userId,
          guestId,
          saveCard
        );

        if (error || !paymentMethod) {
          throw new Error(error || 'Failed to create payment method');
        }

        paymentMethodId = paymentMethod.id;
      }

      // Create payment intent
      const paymentResult = await paymentProcessor.createPaymentIntent(convex, {
        orderId,
        paymentMethodId,
        savePaymentMethod: saveCard,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Handle payment confirmation if needed
      if (paymentResult.requiresAction && paymentResult.clientSecret) {
        const cardElement = elements.getElement(CardElement);
        const confirmResult = await paymentProcessor.confirmPayment(
          paymentResult.clientSecret,
          cardElement || undefined
        );

        if (!confirmResult.success) {
          throw new Error(confirmResult.error || 'Payment confirmation failed');
        }
      }

      toast.success('Payment successful!');
      onSuccess(paymentResult.paymentId || '');
    } catch (error) {
      const errorMessage = paymentProcessor.getErrorMessage(error);
      toast.error(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <p className="text-sm text-gray-600">
          Total: {paymentProcessor.formatAmount(amount)}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          {paymentMethods.length > 0 && !useNewCard && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Payment Method</label>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">
                      {paymentProcessor.formatCardDisplay(method)}
                      {method.isDefault && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUseNewCard(true)}
                className="w-full"
              >
                Use New Card
              </Button>
            </div>
          )}

          {/* New Card Form */}
          {(useNewCard || paymentMethods.length === 0) && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Card Information</label>
                <div className="mt-1 p-3 border border-gray-300 rounded-md">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="text-blue-600"
                />
                <span className="text-sm">Save card for future purchases</span>
              </label>

              {paymentMethods.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUseNewCard(false)}
                  className="w-full"
                >
                  Use Saved Card
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isProcessing || !stripe || (!selectedPaymentMethod && !useNewCard)}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                `Pay ${paymentProcessor.formatAmount(amount)}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};