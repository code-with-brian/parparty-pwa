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
import { paymentProcessor, PaymentMethod } from '../utils/paymentProcessor';
import { Id } from '../../convex/_generated/dataModel';
import { useConvex } from 'convex/react';
import toast from 'react-hot-toast';
import { Trash2, Plus, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

interface PaymentMethodManagerProps {
  userId?: Id<"users">;
  guestId?: Id<"guests">;
  onMethodAdded?: (method: PaymentMethod) => void;
  onMethodRemoved?: (methodId: string) => void;
}

const PaymentMethodManagerContent: React.FC<PaymentMethodManagerProps> = ({
  userId,
  guestId,
  onMethodAdded,
  onMethodRemoved,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const convex = useConvex();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, [userId, guestId]);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await paymentProcessor.getPaymentMethods(convex, userId, guestId);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card element not found');
      return;
    }

    setIsAdding(true);

    try {
      const { paymentMethod, error } = await paymentProcessor.createPaymentMethod(
        convex,
        cardElement,
        userId,
        guestId,
        setAsDefault || paymentMethods.length === 0 // Set as default if it's the first card
      );

      if (error || !paymentMethod) {
        throw new Error(error || 'Failed to add payment method');
      }

      toast.success('Payment method added successfully');
      setShowAddForm(false);
      setSetAsDefault(false);
      
      // Clear the card element
      cardElement.clear();
      
      // Reload payment methods
      await loadPaymentMethods();
      
      if (onMethodAdded) {
        onMethodAdded(paymentMethod);
      }
    } catch (error) {
      const errorMessage = paymentProcessor.getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      // In a real implementation, you'd call a Convex mutation to deactivate the payment method
      // For now, we'll just remove it from the local state
      setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
      toast.success('Payment method removed');
      
      if (onMethodRemoved) {
        onMethodRemoved(methodId);
      }
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      // In a real implementation, you'd call a Convex mutation to update the default
      // For now, we'll just update the local state
      setPaymentMethods(prev => 
        prev.map(m => ({ ...m, isDefault: m.id === methodId }))
      );
      toast.success('Default payment method updated');
    } catch (error) {
      console.error('Failed to update default payment method:', error);
      toast.error('Failed to update default payment method');
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Payment Methods</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Payment Methods */}
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {paymentProcessor.getCardBrandIcon(method.brand)}
                  </span>
                  <div>
                    <div className="font-medium">
                      {paymentProcessor.formatCardDisplay(method)}
                    </div>
                    {method.expiryMonth && method.expiryYear && (
                      <div className="text-sm text-gray-500">
                        Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </div>
                    )}
                  </div>
                  {method.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemovePaymentMethod(method.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No payment methods saved</p>
          </div>
        )}

        {/* Add New Payment Method */}
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        ) : (
          <form onSubmit={handleAddPaymentMethod} className="space-y-4 p-4 border border-gray-200 rounded-lg">
            <div>
              <label className="text-sm font-medium">Card Information</label>
              <div className="mt-1 p-3 border border-gray-300 rounded-md">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="text-blue-600"
              />
              <span className="text-sm">Set as default payment method</span>
            </label>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setSetAsDefault(false);
                }}
                disabled={isAdding}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdding || !stripe}
                className="flex-1"
              >
                {isAdding ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </div>
                ) : (
                  'Add Card'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodManagerContent {...props} />
    </Elements>
  );
};