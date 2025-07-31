import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

// Create payment intent for an order
export const createPaymentIntent = action({
  args: {
    orderId: v.id("foodOrders"),
    paymentMethodId: v.optional(v.string()),
    savePaymentMethod: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }
    
    // Get the order details
    const order = await ctx.runQuery("foodOrders:getOrder", { orderId: args.orderId });
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending") {
      throw new Error("Order is not in pending status");
    }

    try {
      // Create payment intent with Stripe
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: "usd",
        payment_method: args.paymentMethodId,
        confirmation_method: "manual",
        confirm: !!args.paymentMethodId,
        metadata: {
          orderId: args.orderId,
          gameId: order.gameId,
          playerId: order.playerId,
          courseId: order.courseId,
        },
      };

      // Add setup future usage if saving payment method
      if (args.savePaymentMethod) {
        paymentIntentParams.setup_future_usage = "off_session";
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      // Store payment record in database
      const paymentId = await ctx.runMutation("payments:createPayment", {
        orderId: args.orderId,
        playerId: order.playerId,
        gameId: order.gameId,
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentMethodId: args.paymentMethodId,
        amount: Math.round(order.totalAmount * 100),
        currency: "usd",
        status: paymentIntent.status === "succeeded" ? "succeeded" : 
                paymentIntent.status === "requires_action" ? "requires_action" : "pending",
        metadata: {
          courseId: order.courseId,
          deliveryLocation: order.deliveryLocation,
          holeNumber: order.holeNumber,
        },
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === "requires_action",
        paymentId,
      };
    } catch (error) {
      console.error("Payment intent creation failed:", error);
      throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Confirm payment intent
export const confirmPaymentIntent = action({
  args: {
    paymentIntentId: v.string(),
    paymentMethodId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }
    
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(args.paymentIntentId, {
        payment_method: args.paymentMethodId,
      });

      // Update payment status in database
      await ctx.runMutation("payments:updatePaymentStatus", {
        stripePaymentIntentId: args.paymentIntentId,
        status: paymentIntent.status === "succeeded" ? "succeeded" : 
                paymentIntent.status === "requires_action" ? "requires_action" : 
                paymentIntent.status === "processing" ? "processing" : "failed",
        failureReason: paymentIntent.last_payment_error?.message,
      });

      // If payment succeeded, update order status
      if (paymentIntent.status === "succeeded") {
        const orderId = paymentIntent.metadata.orderId as Id<"foodOrders">;
        await ctx.runMutation("foodOrders:processPayment", {
          orderId,
          paymentId: args.paymentIntentId,
        });
      }

      return {
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === "requires_action",
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      
      // Update payment status to failed
      await ctx.runMutation("payments:updatePaymentStatus", {
        stripePaymentIntentId: args.paymentIntentId,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(`Payment confirmation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Create and attach payment method
export const createPaymentMethod = action({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    paymentMethodId: v.string(),
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }
    
    try {
      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(args.paymentMethodId);

      // Store payment method in database
      const paymentMethodRecord = await ctx.runMutation("payments:savePaymentMethod", {
        userId: args.userId,
        guestId: args.guestId,
        stripePaymentMethodId: args.paymentMethodId,
        type: paymentMethod.type as "card" | "apple_pay" | "google_pay",
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        isDefault: args.setAsDefault || false,
      });

      return paymentMethodRecord;
    } catch (error) {
      console.error("Payment method creation failed:", error);
      throw new Error(`Payment method creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Process refund
export const processRefund = action({
  args: {
    paymentId: v.id("payments"),
    amount: v.optional(v.number()), // in cents, if partial refund
    reason: v.union(
      v.literal("duplicate"),
      v.literal("fraudulent"),
      v.literal("requested_by_customer"),
      v.literal("order_canceled"),
      v.literal("other")
    ),
    metadata: v.optional(v.object({
      initiatedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }
    
    // Get payment details
    const payment = await ctx.runQuery("payments:getPayment", { paymentId: args.paymentId });
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "succeeded") {
      throw new Error("Can only refund successful payments");
    }

    try {
      // Create refund with Stripe
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.stripePaymentIntentId,
        amount: args.amount || payment.amount,
        reason: args.reason === "requested_by_customer" ? "requested_by_customer" : "other",
        metadata: {
          paymentId: args.paymentId,
          orderId: payment.orderId,
          ...(args.metadata || {}),
        },
      };

      const refund = await stripe.refunds.create(refundParams);

      // Store refund record in database
      const refundId = await ctx.runMutation("payments:createRefund", {
        paymentId: args.paymentId,
        orderId: payment.orderId,
        stripeRefundId: refund.id,
        amount: refund.amount,
        reason: args.reason,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        metadata: args.metadata,
      });

      // Update payment analytics
      await ctx.runMutation("payments:updateAnalyticsForRefund", {
        courseId: payment.metadata?.courseId,
        gameId: payment.gameId,
        amount: refund.amount,
      });

      return {
        refundId,
        stripeRefundId: refund.id,
        status: refund.status,
        amount: refund.amount,
      };
    } catch (error) {
      console.error("Refund processing failed:", error);
      throw new Error(`Refund processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Webhook handler for Stripe events
export const handleStripeWebhook = action({
  args: {
    eventType: v.string(),
    eventData: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      switch (args.eventType) {
        case "payment_intent.succeeded":
          await ctx.runMutation("payments:updatePaymentStatus", {
            stripePaymentIntentId: args.eventData.id,
            status: "succeeded",
          });
          
          // Update order status
          const orderId = args.eventData.metadata.orderId as Id<"foodOrders">;
          if (orderId) {
            await ctx.runMutation("foodOrders:processPayment", {
              orderId,
              paymentId: args.eventData.id,
            });
          }
          break;

        case "payment_intent.payment_failed":
          await ctx.runMutation("payments:updatePaymentStatus", {
            stripePaymentIntentId: args.eventData.id,
            status: "failed",
            failureReason: args.eventData.last_payment_error?.message,
          });
          break;

        case "refund.updated":
          await ctx.runMutation("payments:updateRefundStatus", {
            stripeRefundId: args.eventData.id,
            status: args.eventData.status,
            failureReason: args.eventData.failure_reason,
          });
          break;

        default:
          console.log(`Unhandled webhook event: ${args.eventType}`);
      }
    } catch (error) {
      console.error("Webhook processing failed:", error);
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Database mutations for payment management
export const createPayment = mutation({
  args: {
    orderId: v.id("foodOrders"),
    playerId: v.id("players"),
    gameId: v.id("games"),
    stripePaymentIntentId: v.string(),
    stripePaymentMethodId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("requires_action")
    ),
    metadata: v.optional(v.object({
      courseId: v.optional(v.id("courses")),
      deliveryLocation: v.optional(v.string()),
      holeNumber: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("payments", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePaymentStatus = mutation({
  args: {
    stripePaymentIntentId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("requires_action")
    ),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_stripe_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();

    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(payment._id, {
      status: args.status,
      failureReason: args.failureReason,
      updatedAt: Date.now(),
    });

    // Update analytics if payment succeeded
    if (args.status === "succeeded") {
      await updateAnalyticsForPayment(ctx, payment);
    }

    return payment._id;
  },
});

export const savePaymentMethod = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    stripePaymentMethodId: v.string(),
    type: v.union(v.literal("card"), v.literal("apple_pay"), v.literal("google_pay")),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If setting as default, unset other default payment methods
    if (args.isDefault) {
      if (args.userId) {
        const existingDefaults = await ctx.db
          .query("paymentMethods")
          .withIndex("by_user_default", (q) => q.eq("userId", args.userId).eq("isDefault", true))
          .collect();
        
        for (const method of existingDefaults) {
          await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
        }
      } else if (args.guestId) {
        const existingDefaults = await ctx.db
          .query("paymentMethods")
          .withIndex("by_guest_default", (q) => q.eq("guestId", args.guestId).eq("isDefault", true))
          .collect();
        
        for (const method of existingDefaults) {
          await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    return await ctx.db.insert("paymentMethods", {
      userId: args.userId,
      guestId: args.guestId,
      stripePaymentMethodId: args.stripePaymentMethodId,
      type: args.type,
      last4: args.last4,
      brand: args.brand,
      expiryMonth: args.expiryMonth,
      expiryYear: args.expiryYear,
      isDefault: args.isDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createRefund = mutation({
  args: {
    paymentId: v.id("payments"),
    orderId: v.id("foodOrders"),
    stripeRefundId: v.string(),
    amount: v.number(),
    reason: v.union(
      v.literal("duplicate"),
      v.literal("fraudulent"),
      v.literal("requested_by_customer"),
      v.literal("order_canceled"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    metadata: v.optional(v.object({
      initiatedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("refunds", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRefundStatus = mutation({
  args: {
    stripeRefundId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const refund = await ctx.db
      .query("refunds")
      .withIndex("by_stripe_refund", (q) => q.eq("stripeRefundId", args.stripeRefundId))
      .first();

    if (!refund) {
      throw new Error("Refund not found");
    }

    await ctx.db.patch(refund._id, {
      status: args.status,
      failureReason: args.failureReason,
      updatedAt: Date.now(),
    });

    return refund._id;
  },
});

// Query functions
export const getPayment = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

export const getPaymentMethods = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("paymentMethods")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .order("desc")
        .collect();
    } else if (args.guestId) {
      return await ctx.db
        .query("paymentMethods")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .order("desc")
        .collect();
    }
    return [];
  },
});

export const getPaymentAnalytics = query({
  args: {
    courseId: v.optional(v.id("courses")),
    gameId: v.optional(v.id("games")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("paymentAnalytics");

    if (args.courseId) {
      query = query.withIndex("by_course", (q) => q.eq("courseId", args.courseId));
    } else if (args.gameId) {
      query = query.withIndex("by_game", (q) => q.eq("gameId", args.gameId));
    }

    let analytics = await query.collect();

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      analytics = analytics.filter((record) => {
        if (args.startDate && record.date < args.startDate) return false;
        if (args.endDate && record.date > args.endDate) return false;
        return true;
      });
    }

    return analytics;
  },
});

// Helper function to update analytics
async function updateAnalyticsForPayment(ctx: any, payment: any) {
  const date = new Date(payment.createdAt).toISOString().split('T')[0];
  
  // Update course analytics if courseId exists
  if (payment.metadata?.courseId) {
    await updateDailyAnalytics(ctx, {
      courseId: payment.metadata.courseId,
      date,
      amount: payment.amount,
      paymentType: "card", // Default for now
      isSuccess: true,
    });
  }

  // Update game analytics
  await updateDailyAnalytics(ctx, {
    gameId: payment.gameId,
    date,
    amount: payment.amount,
    paymentType: "card", // Default for now
    isSuccess: true,
  });
}

export const updateAnalyticsForRefund = mutation({
  args: {
    courseId: v.optional(v.id("courses")),
    gameId: v.id("games"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split('T')[0];
    
    if (args.courseId) {
      await updateDailyAnalytics(ctx, {
        courseId: args.courseId,
        date,
        amount: 0,
        paymentType: "card",
        isSuccess: false,
        isRefund: true,
        refundAmount: args.amount,
      });
    }

    await updateDailyAnalytics(ctx, {
      gameId: args.gameId,
      date,
      amount: 0,
      paymentType: "card",
      isSuccess: false,
      isRefund: true,
      refundAmount: args.amount,
    });
  },
});

async function updateDailyAnalytics(ctx: any, params: {
  courseId?: Id<"courses">;
  gameId?: Id<"games">;
  date: string;
  amount: number;
  paymentType: string;
  isSuccess: boolean;
  isRefund?: boolean;
  refundAmount?: number;
}) {
  let existingAnalytics;
  
  if (params.courseId) {
    existingAnalytics = await ctx.db
      .query("paymentAnalytics")
      .withIndex("by_course_date", (q) => q.eq("courseId", params.courseId).eq("date", params.date))
      .first();
  } else if (params.gameId) {
    existingAnalytics = await ctx.db
      .query("paymentAnalytics")
      .withIndex("by_game", (q) => q.eq("gameId", params.gameId))
      .filter((q) => q.eq(q.field("date"), params.date))
      .first();
  }

  const now = Date.now();

  if (existingAnalytics) {
    // Update existing analytics
    const updates: any = {
      updatedAt: now,
    };

    if (params.isRefund) {
      updates.refundedTransactions = existingAnalytics.refundedTransactions + 1;
      updates.refundedAmount = existingAnalytics.refundedAmount + (params.refundAmount || 0);
    } else {
      updates.totalTransactions = existingAnalytics.totalTransactions + 1;
      
      if (params.isSuccess) {
        updates.successfulTransactions = existingAnalytics.successfulTransactions + 1;
        updates.totalAmount = existingAnalytics.totalAmount + params.amount;
        updates.averageTransactionAmount = Math.round(
          (existingAnalytics.totalAmount + params.amount) / (existingAnalytics.successfulTransactions + 1)
        );
      } else {
        updates.failedTransactions = existingAnalytics.failedTransactions + 1;
      }

      // Update payment method breakdown
      const breakdown = { ...existingAnalytics.paymentMethodBreakdown };
      if (params.paymentType === "apple_pay") {
        breakdown.applePay += 1;
      } else if (params.paymentType === "google_pay") {
        breakdown.googlePay += 1;
      } else {
        breakdown.card += 1;
      }
      updates.paymentMethodBreakdown = breakdown;
    }

    await ctx.db.patch(existingAnalytics._id, updates);
  } else {
    // Create new analytics record
    const newAnalytics = {
      courseId: params.courseId,
      gameId: params.gameId,
      date: params.date,
      totalTransactions: params.isRefund ? 0 : 1,
      totalAmount: params.isSuccess ? params.amount : 0,
      successfulTransactions: params.isSuccess ? 1 : 0,
      failedTransactions: params.isSuccess ? 0 : 1,
      refundedTransactions: params.isRefund ? 1 : 0,
      refundedAmount: params.refundAmount || 0,
      averageTransactionAmount: params.isSuccess ? params.amount : 0,
      paymentMethodBreakdown: {
        card: params.paymentType === "card" ? 1 : 0,
        applePay: params.paymentType === "apple_pay" ? 1 : 0,
        googlePay: params.paymentType === "google_pay" ? 1 : 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await ctx.db.insert("paymentAnalytics", newAnalytics);
  }
}