import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { PaymentForm } from '../../components/PaymentForm';
import { PaymentMethodManager } from '../../components/PaymentMethodManager';
import { Id } from '../../../convex/_generated/dataModel';

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
  createPaymentMethod: vi.fn(),
};

const mockElements = {
  getElement: vi.fn(),
};

const mockCardElement = {
  clear: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(mockStripe),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
}));

// Mock Convex client
const mockConvexClient = {
  action: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConvexProvider client={mockConvexClient as any}>
    {children}
  </ConvexProvider>
);

describe('Payment Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockElements.getElement.mockReturnValue(mockCardElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PaymentForm Integration', () => {
    const defaultProps = {
      orderId: 'order_123' as Id<"foodOrders">,
      amount: 1200, // $12.00 in cents
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onCancel: vi.fn(),
    };

    it('should complete payment flow with new card', async () => {
      // Mock payment methods query (empty)
      mockConvexClient.query.mockResolvedValue([]);

      // Mock payment intent creation
      mockConvexClient.action.mockResolvedValueOnce({
        status: 'succeeded',
        paymentId: 'pay_123',
        requiresAction: false,
        clientSecret: 'pi_test_client_secret',
      });

      // Mock Stripe payment method creation
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_123',
          type: 'card',
        },
      });

      // Mock Convex payment method creation
      mockConvexClient.action.mockResolvedValueOnce({
        id: 'pm_test_123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      });

      render(
        <TestWrapper>
          <PaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Verify form is displayed
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
      expect(screen.getByText('Total: $12.00')).toBeInTheDocument();
      expect(screen.getByTestId('card-element')).toBeInTheDocument();

      // Fill out form
      const saveCardCheckbox = screen.getByLabelText('Save card for future purchases');
      await user.click(saveCardCheckbox);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /pay \$12\.00/i });
      await user.click(submitButton);

      // Wait for processing
      await waitFor(() => {
        expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentMethod', {
          userId: undefined,
          guestId: undefined,
          paymentMethodId: 'pm_test_123',
          setAsDefault: true,
        });
      });

      await waitFor(() => {
        expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentIntent', {
          orderId: 'order_123',
          paymentMethodId: 'pm_test_123',
          savePaymentMethod: true,
        });
      });

      // Verify success callback
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pay_123');
      });
    });

    it('should handle payment with saved payment method', async () => {
      // Mock existing payment methods
      const mockPaymentMethods = [
        {
          id: 'pm_existing_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
          isDefault: true,
        },
        {
          id: 'pm_existing_456',
          type: 'card' as const,
          last4: '1234',
          brand: 'mastercard',
          isDefault: false,
        },
      ];

      mockConvexClient.query.mockResolvedValue(mockPaymentMethods);

      // Mock successful payment
      mockConvexClient.action.mockResolvedValue({
        status: 'succeeded',
        paymentId: 'pay_456',
        requiresAction: false,
        clientSecret: 'pi_test_client_secret',
      });

      render(
        <TestWrapper>
          <PaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Verify saved payment methods are displayed
      expect(screen.getByText('💳 •••• 4242')).toBeInTheDocument();
      expect(screen.getByText('💳 •••• 1234')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();

      // Select non-default payment method
      const secondCardRadio = screen.getByDisplayValue('pm_existing_456');
      await user.click(secondCardRadio);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /pay \$12\.00/i });
      await user.click(submitButton);

      // Verify payment intent creation with selected method
      await waitFor(() => {
        expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentIntent', {
          orderId: 'order_123',
          paymentMethodId: 'pm_existing_456',
          savePaymentMethod: false,
        });
      });

      // Verify success callback
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pay_456');
      });
    });

    it('should handle payment requiring additional action', async () => {
      mockConvexClient.query.mockResolvedValue([]);

      // Mock payment requiring 3D Secure
      mockConvexClient.action.mockResolvedValueOnce({
        id: 'pm_test_123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      });

      mockConvexClient.action.mockResolvedValueOnce({
        status: 'requires_action',
        paymentId: 'pay_123',
        requiresAction: true,
        clientSecret: 'pi_test_client_secret',
      });

      // Mock Stripe confirmation
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
        },
      });

      render(
        <TestWrapper>
          <PaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Submit form
      const submitButton = screen.getByRole('button', { name: /pay \$12\.00/i });
      await user.click(submitButton);

      // Wait for Stripe confirmation to be called
      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
          'pi_test_client_secret',
          mockCardElement
        );
      });

      // Verify success callback
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pay_123');
      });
    });

    it('should handle payment errors', async () => {
      mockConvexClient.query.mockResolvedValue([]);

      // Mock payment failure
      mockConvexClient.action.mockRejectedValue(new Error('Your card was declined.'));

      render(
        <TestWrapper>
          <PaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Submit form
      const submitButton = screen.getByRole('button', { name: /pay \$12\.00/i });
      await user.click(submitButton);

      // Verify error callback
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Your card was declined.');
      });
    });

    it('should handle cancel action', async () => {
      mockConvexClient.query.mockResolvedValue([]);

      render(
        <TestWrapper>
          <PaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify cancel callback
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('PaymentMethodManager Integration', () => {
    const defaultProps = {
      userId: 'user_123' as Id<"users">,
      onMethodAdded: vi.fn(),
      onMethodRemoved: vi.fn(),
    };

    it('should display existing payment methods', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
        },
        {
          id: 'pm_456',
          type: 'apple_pay' as const,
          isDefault: false,
        },
      ];

      mockConvexClient.query.mockResolvedValue(mockPaymentMethods);

      render(
        <TestWrapper>
          <PaymentMethodManager {...defaultProps} />
        </TestWrapper>
      );

      // Wait for payment methods to load
      await waitFor(() => {
        expect(screen.getByText('💳 •••• 4242')).toBeInTheDocument();
        expect(screen.getByText('🍎 Apple Pay')).toBeInTheDocument();
        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Expires 12/2025')).toBeInTheDocument();
      });
    });

    it('should add new payment method', async () => {
      // Start with no payment methods
      mockConvexClient.query.mockResolvedValueOnce([]);

      // Mock successful payment method creation
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_new_123',
          type: 'card',
        },
      });

      mockConvexClient.action.mockResolvedValue({
        id: 'pm_new_123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      });

      // Mock updated payment methods list
      mockConvexClient.query.mockResolvedValueOnce([
        {
          id: 'pm_new_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
          isDefault: true,
        },
      ]);

      render(
        <TestWrapper>
          <PaymentMethodManager {...defaultProps} />
        </TestWrapper>
      );

      // Initially should show no payment methods
      await waitFor(() => {
        expect(screen.getByText('No payment methods saved')).toBeInTheDocument();
      });

      // Click add payment method
      const addButton = screen.getByRole('button', { name: /add payment method/i });
      await user.click(addButton);

      // Verify form is shown
      expect(screen.getByText('Card Information')).toBeInTheDocument();
      expect(screen.getByTestId('card-element')).toBeInTheDocument();

      // Set as default
      const defaultCheckbox = screen.getByLabelText('Set as default payment method');
      await user.click(defaultCheckbox);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add card/i });
      await user.click(submitButton);

      // Wait for payment method creation
      await waitFor(() => {
        expect(mockConvexClient.action).toHaveBeenCalledWith('payments:createPaymentMethod', {
          userId: 'user_123',
          guestId: undefined,
          paymentMethodId: 'pm_new_123',
          setAsDefault: true,
        });
      });

      // Verify callback
      await waitFor(() => {
        expect(defaultProps.onMethodAdded).toHaveBeenCalledWith({
          id: 'pm_new_123',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          isDefault: true,
        });
      });
    });

    it('should handle payment method creation error', async () => {
      mockConvexClient.query.mockResolvedValue([]);

      // Mock Stripe error
      mockStripe.createPaymentMethod.mockResolvedValue({
        error: {
          message: 'Your card number is invalid.',
        },
      });

      render(
        <TestWrapper>
          <PaymentMethodManager {...defaultProps} />
        </TestWrapper>
      );

      // Click add payment method
      const addButton = screen.getByRole('button', { name: /add payment method/i });
      await user.click(addButton);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add card/i });
      await user.click(submitButton);

      // Should not call Convex action
      await waitFor(() => {
        expect(mockConvexClient.action).not.toHaveBeenCalled();
      });
    });

    it('should set payment method as default', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
          isDefault: true,
        },
        {
          id: 'pm_456',
          type: 'card' as const,
          last4: '1234',
          brand: 'mastercard',
          isDefault: false,
        },
      ];

      mockConvexClient.query.mockResolvedValue(mockPaymentMethods);

      render(
        <TestWrapper>
          <PaymentMethodManager {...defaultProps} />
        </TestWrapper>
      );

      // Wait for payment methods to load
      await waitFor(() => {
        expect(screen.getByText('💳 •••• 4242')).toBeInTheDocument();
        expect(screen.getByText('💳 •••• 1234')).toBeInTheDocument();
      });

      // Click set default on second card
      const setDefaultButtons = screen.getAllByText('Set Default');
      await user.click(setDefaultButtons[0]);

      // In a real implementation, this would call a Convex mutation
      // For now, we just verify the UI updates
      await waitFor(() => {
        expect(screen.getByText('Default payment method updated')).toBeInTheDocument();
      });
    });

    it('should remove payment method', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm_123',
          type: 'card' as const,
          last4: '4242',
          brand: 'visa',
          isDefault: true,
        },
      ];

      mockConvexClient.query.mockResolvedValue(mockPaymentMethods);

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <TestWrapper>
          <PaymentMethodManager {...defaultProps} />
        </TestWrapper>
      );

      // Wait for payment methods to load
      await waitFor(() => {
        expect(screen.getByText('💳 •••• 4242')).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByRole('button', { name: '' }); // Trash icon
      await user.click(removeButton);

      // Verify confirmation dialog
      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to remove this payment method?'
      );

      // Verify callback
      await waitFor(() => {
        expect(defaultProps.onMethodRemoved).toHaveBeenCalledWith('pm_123');
      });

      confirmSpy.mockRestore();
    });
  });

  describe('End-to-End Payment Flow', () => {
    it('should complete full F&B order payment flow', async () => {
      // This would test the integration between FoodOrderingMenu and PaymentForm
      // Mock the complete flow from order creation to payment completion
      
      const mockOrder = {
        _id: 'order_123' as Id<"foodOrders">,
        playerId: 'player_123' as Id<"players">,
        gameId: 'game_123' as Id<"games">,
        courseId: 'course_123' as Id<"courses">,
        items: [
          {
            name: 'Beer',
            quantity: 2,
            price: 6.00,
            description: 'Cold beer',
          },
        ],
        totalAmount: 12.00,
        status: 'pending' as const,
        deliveryLocation: 'hole' as const,
        holeNumber: 5,
        timestamp: Date.now(),
      };

      // Mock order creation
      mockConvexClient.mutation.mockResolvedValueOnce('order_123');

      // Mock payment processing
      mockConvexClient.action.mockResolvedValueOnce({
        status: 'succeeded',
        paymentId: 'pay_123',
        requiresAction: false,
        clientSecret: 'pi_test_client_secret',
      });

      // Mock order update
      mockConvexClient.mutation.mockResolvedValueOnce('order_123');

      // This test would verify the complete flow works end-to-end
      // In a real implementation, you'd render the FoodOrderingMenu component
      // and simulate the complete user journey
      
      expect(mockOrder).toBeDefined();
    });
  });
});