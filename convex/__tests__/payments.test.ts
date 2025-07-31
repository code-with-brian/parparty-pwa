import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../_generated/api';
import schema from '../schema';
import { Id } from '../_generated/dataModel';

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    confirm: vi.fn(),
  },
  paymentMethods: {
    retrieve: vi.fn(),
  },
  refunds: {
    create: vi.fn(),
  },
};

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock environment variable
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

describe('Payment Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const t = convexTest(schema);

      // Create test data
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });
      });

      const courseId = await t.run(async (ctx) => {
        return await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          courseId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });
      });

      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });
      });

      const orderId = await t.run(async (ctx) => {
        return await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [
            {
              name: 'Beer',
              quantity: 2,
              price: 6.00,
              description: 'Cold beer',
            },
          ],
          totalAmount: 12.00,
          status: 'pending',
          deliveryLocation: 'hole',
          holeNumber: 5,
          timestamp: Date.now(),
        });
      });

      // Mock Stripe response
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        status: 'requires_confirmation',
        metadata: {
          orderId,
          gameId,
          playerId,
          courseId,
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Test the action
      const result = await t.action(api.payments.createPaymentIntent, {
        orderId,
        paymentMethodId: 'pm_test_123',
        savePaymentMethod: true,
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1200, // $12.00 in cents
        currency: 'usd',
        payment_method: 'pm_test_123',
        confirmation_method: 'manual',
        confirm: true,
        setup_future_usage: 'off_session',
        metadata: {
          orderId,
          gameId,
          playerId,
          courseId,
        },
      });

      expect(result).toEqual({
        paymentIntentId: 'pi_test_123',
        clientSecret: 'pi_test_123_secret',
        status: 'requires_confirmation',
        requiresAction: false,
        paymentId: expect.any(String),
      });

      // Verify payment record was created
      const payments = await t.run(async (ctx) => {
        return await ctx.db.query('payments').collect();
      });

      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        orderId,
        playerId,
        gameId,
        stripePaymentIntentId: 'pi_test_123',
        stripePaymentMethodId: 'pm_test_123',
        amount: 1200,
        currency: 'usd',
        status: 'pending',
      });
    });

    it('should handle order not found', async () => {
      const t = convexTest(schema);
      const nonExistentOrderId = 'invalid_order_id' as Id<'foodOrders'>;

      await expect(
        t.action(api.payments.createPaymentIntent, {
          orderId: nonExistentOrderId,
        })
      ).rejects.toThrow('Order not found');
    });

    it('should handle non-pending order', async () => {
      const t = convexTest(schema);

      // Create test data with confirmed order
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });
      });

      const courseId = await t.run(async (ctx) => {
        return await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const gameId = await t.run(async (ctx) => {
        return await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });
      });

      const playerId = await t.run(async (ctx) => {
        return await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });
      });

      const orderId = await t.run(async (ctx) => {
        return await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'confirmed', // Already confirmed
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });
      });

      await expect(
        t.action(api.payments.createPaymentIntent, {
          orderId,
        })
      ).rejects.toThrow('Order is not in pending status');
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent successfully', async () => {
      const t = convexTest(schema);

      // Create test payment record
      const paymentId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });

        const courseId = await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });

        const gameId = await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });

        const playerId = await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });

        const orderId = await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'pending',
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });

        return await ctx.db.insert('payments', {
          orderId,
          playerId,
          gameId,
          stripePaymentIntentId: 'pi_test_123',
          amount: 600,
          currency: 'usd',
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Mock Stripe response
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        metadata: {
          orderId: 'order_123',
        },
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

      // Test the action
      const result = await t.action(api.payments.confirmPaymentIntent, {
        paymentIntentId: 'pi_test_123',
        paymentMethodId: 'pm_test_456',
      });

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_456',
      });

      expect(result).toEqual({
        status: 'succeeded',
        requiresAction: false,
        clientSecret: undefined,
      });

      // Verify payment status was updated
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });

      expect(payment?.status).toBe('succeeded');
    });

    it('should handle payment confirmation failure', async () => {
      const t = convexTest(schema);

      // Create test payment record
      await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });

        const courseId = await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });

        const gameId = await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });

        const playerId = await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });

        const orderId = await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'pending',
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });

        return await ctx.db.insert('payments', {
          orderId,
          playerId,
          gameId,
          stripePaymentIntentId: 'pi_test_123',
          amount: 600,
          currency: 'usd',
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Mock Stripe error
      mockStripe.paymentIntents.confirm.mockRejectedValue(
        new Error('Your card was declined.')
      );

      await expect(
        t.action(api.payments.confirmPaymentIntent, {
          paymentIntentId: 'pi_test_123',
        })
      ).rejects.toThrow('Payment confirmation failed: Your card was declined.');
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const t = convexTest(schema);

      // Create test data
      const { paymentId, orderId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });

        const courseId = await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });

        const gameId = await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });

        const playerId = await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });

        const orderId = await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'confirmed',
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });

        const paymentId = await ctx.db.insert('payments', {
          orderId,
          playerId,
          gameId,
          stripePaymentIntentId: 'pi_test_123',
          amount: 600,
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            courseId,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { paymentId, orderId };
      });

      // Mock Stripe response
      const mockRefund = {
        id: 'ref_test_123',
        amount: 600,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Test the action
      const result = await t.action(api.payments.processRefund, {
        paymentId,
        reason: 'requested_by_customer',
        metadata: {
          initiatedBy: 'admin',
          notes: 'Customer requested refund',
        },
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 600,
        reason: 'requested_by_customer',
        metadata: {
          paymentId,
          orderId,
          initiatedBy: 'admin',
          notes: 'Customer requested refund',
        },
      });

      expect(result).toEqual({
        refundId: expect.any(String),
        stripeRefundId: 'ref_test_123',
        status: 'succeeded',
        amount: 600,
      });

      // Verify refund record was created
      const refunds = await t.run(async (ctx) => {
        return await ctx.db.query('refunds').collect();
      });

      expect(refunds).toHaveLength(1);
      expect(refunds[0]).toMatchObject({
        paymentId,
        orderId,
        stripeRefundId: 'ref_test_123',
        amount: 600,
        reason: 'requested_by_customer',
        status: 'succeeded',
      });
    });

    it('should handle payment not found', async () => {
      const t = convexTest(schema);
      const nonExistentPaymentId = 'invalid_payment_id' as Id<'payments'>;

      await expect(
        t.action(api.payments.processRefund, {
          paymentId: nonExistentPaymentId,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Payment not found');
    });

    it('should handle non-succeeded payment', async () => {
      const t = convexTest(schema);

      // Create test data with failed payment
      const paymentId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });

        const courseId = await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });

        const gameId = await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });

        const playerId = await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });

        const orderId = await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'pending',
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });

        return await ctx.db.insert('payments', {
          orderId,
          playerId,
          gameId,
          stripePaymentIntentId: 'pi_test_123',
          amount: 600,
          currency: 'usd',
          status: 'failed', // Failed payment
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.action(api.payments.processRefund, {
          paymentId,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Can only refund successful payments');
    });
  });

  describe('payment analytics', () => {
    it('should update analytics when payment succeeds', async () => {
      const t = convexTest(schema);

      // Create test data
      const { paymentId, courseId, gameId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          tokenIdentifier: 'test_token',
        });

        const courseId = await ctx.db.insert('courses', {
          name: 'Test Course',
          address: '123 Golf St',
          partnershipLevel: 'basic',
          revenueShare: 0.1,
          isActive: true,
          createdAt: Date.now(),
        });

        const gameId = await ctx.db.insert('games', {
          name: 'Test Game',
          createdBy: userId,
          startedAt: Date.now(),
          status: 'active',
          format: 'stroke',
        });

        const playerId = await ctx.db.insert('players', {
          gameId,
          name: 'Test Player',
          userId,
          position: 1,
        });

        const orderId = await ctx.db.insert('foodOrders', {
          playerId,
          gameId,
          courseId,
          items: [{ name: 'Beer', quantity: 1, price: 6.00 }],
          totalAmount: 6.00,
          status: 'pending',
          deliveryLocation: 'hole',
          timestamp: Date.now(),
        });

        const paymentId = await ctx.db.insert('payments', {
          orderId,
          playerId,
          gameId,
          stripePaymentIntentId: 'pi_test_123',
          amount: 600,
          currency: 'usd',
          status: 'pending',
          metadata: {
            courseId,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { paymentId, courseId, gameId };
      });

      // Update payment to succeeded
      await t.run(async (ctx) => {
        await ctx.db.patch(paymentId, { status: 'succeeded' });
      });

      // Trigger analytics update
      await t.mutation(api.payments.updatePaymentStatus, {
        stripePaymentIntentId: 'pi_test_123',
        status: 'succeeded',
      });

      // Check analytics were created
      const analytics = await t.run(async (ctx) => {
        return await ctx.db.query('paymentAnalytics').collect();
      });

      expect(analytics.length).toBeGreaterThan(0);
      
      const courseAnalytics = analytics.find(a => a.courseId === courseId);
      expect(courseAnalytics).toBeDefined();
      expect(courseAnalytics?.totalTransactions).toBe(1);
      expect(courseAnalytics?.successfulTransactions).toBe(1);
      expect(courseAnalytics?.totalAmount).toBe(600);
      expect(courseAnalytics?.averageTransactionAmount).toBe(600);
    });
  });
});