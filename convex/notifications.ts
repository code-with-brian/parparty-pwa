import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store push tokens for users
export const storePushToken = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
  },
  handler: async (ctx, args) => {
    const { userId, guestId, token, platform } = args;

    // Store or update push token
    const existing = await ctx.db
      .query("pushTokens")
      .filter((q) => 
        userId ? q.eq(q.field("userId"), userId) : q.eq(q.field("guestId"), guestId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        token,
        platform,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("pushTokens", {
        userId,
        guestId,
        token,
        platform,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Get push tokens for a user or guest
export const getPushTokens = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
  },
  handler: async (ctx, args) => {
    const { userId, guestId } = args;

    return await ctx.db
      .query("pushTokens")
      .filter((q) => 
        userId ? q.eq(q.field("userId"), userId) : q.eq(q.field("guestId"), guestId)
      )
      .collect();
  },
});

// Trigger game event notification
export const notifyGameEvent = mutation({
  args: {
    gameId: v.id("games"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("game_started"),
      v.literal("game_finished"),
      v.literal("score_update"),
      v.literal("achievement"),
      v.literal("social_moment")
    ),
    excludePlayerId: v.optional(v.id("players")),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const { gameId, title, body, type, excludePlayerId, priority = "normal" } = args;

    // Get all players in the game
    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect();

    // Filter out excluded player if specified
    const targetPlayers = excludePlayerId 
      ? players.filter(p => p._id !== excludePlayerId)
      : players;

    // Create notification records for each player
    const notifications = await Promise.all(
      targetPlayers.map(async (player) => {
        return await ctx.db.insert("notifications", {
          gameId,
          playerId: player._id,
          userId: player.userId,
          guestId: player.guestId,
          title,
          body,
          type,
          priority,
          data: {
            gameId,
            url: `/game/${gameId}`,
          },
          read: false,
          createdAt: Date.now(),
        });
      })
    );

    // In a real implementation, you would also trigger actual push notifications here
    // This would involve calling your push notification service (FCM, APNs, etc.)
    
    return notifications;
  },
});

// Trigger F&B order notification
export const notifyOrderUpdate = mutation({
  args: {
    orderId: v.id("foodOrders"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("delivered")
    ),
  },
  handler: async (ctx, args) => {
    const { orderId, status } = args;

    // Get the order details
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get the player who placed the order
    const player = await ctx.db.get(order.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Create status-specific notification content
    const statusMessages = {
      confirmed: {
        title: "🍔 Order Confirmed",
        body: `Your order is being prepared: ${order.items.map(item => item.name).join(', ')}`,
        priority: "normal" as const,
      },
      preparing: {
        title: "👨‍🍳 Order Being Prepared",
        body: `Kitchen is working on your order: ${order.items.map(item => item.name).join(', ')}`,
        priority: "normal" as const,
      },
      ready: {
        title: "✅ Order Ready!",
        body: `Your order is ready for pickup at ${order.deliveryLocation}`,
        priority: "high" as const,
      },
      delivered: {
        title: "🚚 Order Delivered",
        body: `Your order has been delivered to ${order.deliveryLocation}`,
        priority: "high" as const,
      },
    };

    const message = statusMessages[status];

    // Create notification record
    const notificationId = await ctx.db.insert("notifications", {
      gameId: order.gameId,
      playerId: order.playerId,
      userId: player.userId,
      guestId: player.guestId,
      title: message.title,
      body: message.body,
      type: "order_update",
      priority: message.priority,
      data: {
        orderId,
        gameId: order.gameId,
        status,
        url: `/game/${order.gameId}`,
      },
      read: false,
      createdAt: Date.now(),
    });

    // Update order status
    await ctx.db.patch(orderId, { status });

    return notificationId;
  },
});

// Trigger social moment notification
export const notifySocialMoment = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    type: v.union(
      v.literal("photo_shared"),
      v.literal("comment_added"),
      v.literal("reaction_added")
    ),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { gameId, playerId, type, title, body } = args;

    // Get all other players in the game
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect();

    const otherPlayers = allPlayers.filter(p => p._id !== playerId);

    // Create notifications for other players
    const notifications = await Promise.all(
      otherPlayers.map(async (player) => {
        return await ctx.db.insert("notifications", {
          gameId,
          playerId: player._id,
          userId: player.userId,
          guestId: player.guestId,
          title,
          body,
          type: "social_moment",
          priority: "low",
          data: {
            gameId,
            triggerPlayerId: playerId,
            url: `/game/${gameId}`,
          },
          read: false,
          createdAt: Date.now(),
        });
      })
    );

    return notifications;
  },
});

// Trigger achievement notification
export const notifyAchievement = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    achievement: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { gameId, playerId, achievement, description } = args;

    const player = await ctx.db.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Create achievement notification for the player
    const notificationId = await ctx.db.insert("notifications", {
      gameId,
      playerId,
      userId: player.userId,
      guestId: player.guestId,
      title: `🏆 ${achievement}`,
      body: description,
      type: "achievement",
      priority: "high",
      data: {
        gameId,
        achievement,
        url: `/game/${gameId}`,
      },
      read: false,
      createdAt: Date.now(),
    });

    // Also notify other players about the achievement
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect();

    const otherPlayers = allPlayers.filter(p => p._id !== playerId);

    await Promise.all(
      otherPlayers.map(async (otherPlayer) => {
        return await ctx.db.insert("notifications", {
          gameId,
          playerId: otherPlayer._id,
          userId: otherPlayer.userId,
          guestId: otherPlayer.guestId,
          title: `🎉 ${player.name} achieved ${achievement}!`,
          body: description,
          type: "social_moment",
          priority: "normal",
          data: {
            gameId,
            triggerPlayerId: playerId,
            achievement,
            url: `/game/${gameId}`,
          },
          read: false,
          createdAt: Date.now(),
        });
      })
    );

    return notificationId;
  },
});

// Get notifications for a user or guest
export const getNotifications = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, guestId, limit = 50, unreadOnly = false } = args;

    let query = ctx.db.query("notifications");

    if (userId) {
      query = query.filter((q) => q.eq(q.field("userId"), userId));
    } else if (guestId) {
      query = query.filter((q) => q.eq(q.field("guestId"), guestId));
    } else {
      return [];
    }

    if (unreadOnly) {
      query = query.filter((q) => q.eq(q.field("read"), false));
    }

    const notifications = await query
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const { notificationId } = args;

    await ctx.db.patch(notificationId, {
      read: true,
      readAt: Date.now(),
    });

    return notificationId;
  },
});

// Mark all notifications as read for a user/guest
export const markAllNotificationsRead = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
  },
  handler: async (ctx, args) => {
    const { userId, guestId } = args;

    let query = ctx.db.query("notifications");

    if (userId) {
      query = query.filter((q) => q.eq(q.field("userId"), userId));
    } else if (guestId) {
      query = query.filter((q) => q.eq(q.field("guestId"), guestId));
    } else {
      return 0;
    }

    const unreadNotifications = await query
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    await Promise.all(
      unreadNotifications.map(notification =>
        ctx.db.patch(notification._id, {
          read: true,
          readAt: Date.now(),
        })
      )
    );

    return unreadNotifications.length;
  },
});

// Clean up old notifications (older than 30 days)
export const cleanupOldNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    await Promise.all(
      oldNotifications.map(notification =>
        ctx.db.delete(notification._id)
      )
    );

    return oldNotifications.length;
  },
});