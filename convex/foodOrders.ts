import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get menu items for a course
export const getMenuItems = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    // For MVP, return a static menu. In production, this would come from course integration
    return [
      {
        id: "beer-1",
        name: "Cold Beer",
        description: "Ice-cold domestic beer",
        price: 6.00,
        category: "beverages",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "beer-2", 
        name: "Craft Beer",
        description: "Local craft beer selection",
        price: 8.00,
        category: "beverages",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "water-1",
        name: "Water Bottle",
        description: "Refreshing bottled water",
        price: 3.00,
        category: "beverages",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "sandwich-1",
        name: "Club Sandwich",
        description: "Turkey, bacon, lettuce, tomato",
        price: 12.00,
        category: "food",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "hot-dog-1",
        name: "Hot Dog",
        description: "All-beef hot dog with fixings",
        price: 8.00,
        category: "food",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "chips-1",
        name: "Chips",
        description: "Crispy potato chips",
        price: 4.00,
        category: "snacks",
        image: "/api/placeholder/150/150",
        available: true,
      },
      {
        id: "energy-bar-1",
        name: "Energy Bar",
        description: "Protein-packed energy bar",
        price: 5.00,
        category: "snacks",
        image: "/api/placeholder/150/150",
        available: true,
      },
    ];
  },
});

// Place a new food order
export const placeOrder = mutation({
  args: {
    playerId: v.id("players"),
    gameId: v.id("games"),
    courseId: v.id("courses"),
    items: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      price: v.number(),
      description: v.optional(v.string()),
    })),
    deliveryLocation: v.union(v.literal("hole"), v.literal("clubhouse"), v.literal("cart")),
    holeNumber: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate total amount
    const totalAmount = args.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create the order
    const orderId = await ctx.db.insert("foodOrders", {
      playerId: args.playerId,
      gameId: args.gameId,
      courseId: args.courseId,
      items: args.items,
      totalAmount,
      status: "pending",
      deliveryLocation: args.deliveryLocation,
      holeNumber: args.holeNumber,
      timestamp: Date.now(),
      specialInstructions: args.specialInstructions,
    });

    // Create a social post about the order
    await ctx.db.insert("socialPosts", {
      gameId: args.gameId,
      playerId: args.playerId,
      type: "order",
      content: `Ordered ${args.items.map(item => `${item.quantity}x ${item.name}`).join(", ")} for delivery to ${args.deliveryLocation}${args.holeNumber ? ` at hole ${args.holeNumber}` : ""}`,
      timestamp: Date.now(),
    });

    return orderId;
  },
});

// Get orders for a game
export const getGameOrders = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("foodOrders")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .collect();

    // Get player names for each order
    const ordersWithPlayerNames = await Promise.all(
      orders.map(async (order) => {
        const player = await ctx.db.get(order.playerId);
        return {
          ...order,
          playerName: player?.name || "Unknown Player",
        };
      })
    );

    return ordersWithPlayerNames;
  },
});

// Get orders for a specific player
export const getPlayerOrders = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("foodOrders")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .order("desc")
      .collect();
  },
});

// Update order status (for course staff)
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("foodOrders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("delivered")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
    });

    // Create a social post for status updates
    if (args.status === "ready" || args.status === "delivered") {
      await ctx.db.insert("socialPosts", {
        gameId: order.gameId,
        playerId: order.playerId,
        type: "order",
        content: `Your order is ${args.status}! ${args.status === "ready" ? "Ready for pickup" : "Delivered"}`,
        timestamp: Date.now(),
      });
    }

    return args.orderId;
  },
});

// Process payment for an order (simplified for MVP)
export const processPayment = mutation({
  args: {
    orderId: v.id("foodOrders"),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // In a real implementation, this would integrate with Stripe
    // For MVP, we'll just mark the payment as processed
    await ctx.db.patch(args.orderId, {
      paymentId: args.paymentId,
      status: "confirmed",
    });

    // Create a social post about successful payment
    await ctx.db.insert("socialPosts", {
      gameId: order.gameId,
      playerId: order.playerId,
      type: "order",
      content: `Payment confirmed! Your order is being prepared.`,
      timestamp: Date.now(),
    });

    return args.orderId;
  },
});

// Cancel an order (only if pending)
export const cancelOrder = mutation({
  args: { orderId: v.id("foodOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending") {
      throw new Error("Can only cancel pending orders");
    }

    await ctx.db.delete(args.orderId);

    // Create a social post about cancellation
    await ctx.db.insert("socialPosts", {
      gameId: order.gameId,
      playerId: order.playerId,
      type: "order",
      content: "Order cancelled",
      timestamp: Date.now(),
    });

    return args.orderId;
  },
});