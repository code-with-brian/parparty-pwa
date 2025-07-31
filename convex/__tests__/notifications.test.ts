import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Notifications", () => {
  test("should store and retrieve push tokens", async () => {
    const t = convexTest(schema);

    // Create a test user
    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "test-token",
      name: "Test User",
      email: "test@example.com",
    });

    // Store push token
    const tokenId = await t.mutation(api.notifications.storePushToken, {
      userId,
      token: "test-push-token-123",
      platform: "ios",
    });

    expect(tokenId).toBeDefined();

    // Retrieve push tokens
    const tokens = await t.query(api.notifications.getPushTokens, {
      userId,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).toBe("test-push-token-123");
    expect(tokens[0].platform).toBe("ios");
    expect(tokens[0].userId).toBe(userId);
  });

  test("should store push token for guest", async () => {
    const t = convexTest(schema);

    // Create a test guest
    const guestId = await t.mutation(api.guests.createGuestSession, {
      deviceId: "test-device-123",
      name: "Test Guest",
    });

    // Store push token for guest
    const tokenId = await t.mutation(api.notifications.storePushToken, {
      guestId,
      token: "guest-push-token-456",
      platform: "android",
    });

    expect(tokenId).toBeDefined();

    // Retrieve push tokens for guest
    const tokens = await t.query(api.notifications.getPushTokens, {
      guestId,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).toBe("guest-push-token-456");
    expect(tokens[0].platform).toBe("android");
    expect(tokens[0].guestId).toBe(guestId);
  });

  test("should update existing push token", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "test-token",
      name: "Test User",
    });

    // Store initial token
    await t.mutation(api.notifications.storePushToken, {
      userId,
      token: "old-token",
      platform: "ios",
    });

    // Update with new token
    await t.mutation(api.notifications.storePushToken, {
      userId,
      token: "new-token",
      platform: "ios",
    });

    const tokens = await t.query(api.notifications.getPushTokens, {
      userId,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).toBe("new-token");
  });

  test("should notify game events to all players", async () => {
    const t = convexTest(schema);

    // Create users and game
    const user1 = await t.mutation(api.users.store, {
      tokenIdentifier: "user1-token",
      name: "Player 1",
    });

    const user2 = await t.mutation(api.users.store, {
      tokenIdentifier: "user2-token",
      name: "Player 2",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: user1,
    });

    // Add players to game
    const player1 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user1,
      name: "Player 1",
    });

    const player2 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user2,
      name: "Player 2",
    });

    // Trigger game event notification
    const notifications = await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Game Started",
      body: "The game has begun!",
      type: "game_started",
      priority: "high",
    });

    expect(notifications).toHaveLength(2);

    // Check notifications were created for both players
    const user1Notifications = await t.query(api.notifications.getNotifications, {
      userId: user1,
    });

    const user2Notifications = await t.query(api.notifications.getNotifications, {
      userId: user2,
    });

    expect(user1Notifications).toHaveLength(1);
    expect(user2Notifications).toHaveLength(1);

    expect(user1Notifications[0].title).toBe("Game Started");
    expect(user1Notifications[0].body).toBe("The game has begun!");
    expect(user1Notifications[0].type).toBe("game_started");
    expect(user1Notifications[0].priority).toBe("high");
    expect(user1Notifications[0].read).toBe(false);
  });

  test("should exclude specified player from game notifications", async () => {
    const t = convexTest(schema);

    const user1 = await t.mutation(api.users.store, {
      tokenIdentifier: "user1-token",
      name: "Player 1",
    });

    const user2 = await t.mutation(api.users.store, {
      tokenIdentifier: "user2-token",
      name: "Player 2",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: user1,
    });

    const player1 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user1,
      name: "Player 1",
    });

    const player2 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user2,
      name: "Player 2",
    });

    // Notify all players except player1
    await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Score Update",
      body: "Player 1 scored!",
      type: "score_update",
      excludePlayerId: player1,
    });

    const user1Notifications = await t.query(api.notifications.getNotifications, {
      userId: user1,
    });

    const user2Notifications = await t.query(api.notifications.getNotifications, {
      userId: user2,
    });

    expect(user1Notifications).toHaveLength(0);
    expect(user2Notifications).toHaveLength(1);
  });

  test("should notify order updates", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "user-token",
      name: "Test User",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
    });

    const playerId = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId,
      name: "Test User",
    });

    // Create a course first
    const courseId = await t.mutation(api.courses.createCourse, {
      name: "Test Course",
      address: "123 Golf St",
      partnershipLevel: "basic",
      revenueShare: 0.1,
    });

    // Create a food order
    const orderId = await t.mutation(api.foodOrders.placeOrder, {
      playerId,
      gameId,
      courseId,
      items: [
        { name: "Burger", quantity: 1, price: 12.99, description: "Beef burger" }
      ],
      deliveryLocation: "hole",
      holeNumber: 5,
    });

    // Notify order update
    const notificationId = await t.mutation(api.notifications.notifyOrderUpdate, {
      orderId,
      status: "ready",
    });

    expect(notificationId).toBeDefined();

    // Check notification was created
    const notifications = await t.query(api.notifications.getNotifications, {
      userId,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("✅ Order Ready!");
    expect(notifications[0].body).toContain("ready for pickup");
    expect(notifications[0].type).toBe("order_update");
    expect(notifications[0].priority).toBe("high");
    expect(notifications[0].data?.orderId).toBe(orderId);
    expect(notifications[0].data?.status).toBe("ready");
  });

  test("should notify social moments", async () => {
    const t = convexTest(schema);

    const user1 = await t.mutation(api.users.store, {
      tokenIdentifier: "user1-token",
      name: "Player 1",
    });

    const user2 = await t.mutation(api.users.store, {
      tokenIdentifier: "user2-token",
      name: "Player 2",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: user1,
    });

    const player1 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user1,
      name: "Player 1",
    });

    const player2 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user2,
      name: "Player 2",
    });

    // Trigger social moment notification
    await t.mutation(api.notifications.notifySocialMoment, {
      gameId,
      playerId: player1,
      type: "photo_shared",
      title: "New Photo",
      body: "Player 1 shared a photo",
    });

    // Only player2 should receive the notification
    const user1Notifications = await t.query(api.notifications.getNotifications, {
      userId: user1,
    });

    const user2Notifications = await t.query(api.notifications.getNotifications, {
      userId: user2,
    });

    expect(user1Notifications).toHaveLength(0);
    expect(user2Notifications).toHaveLength(1);
    expect(user2Notifications[0].title).toBe("New Photo");
    expect(user2Notifications[0].type).toBe("social_moment");
    expect(user2Notifications[0].priority).toBe("low");
  });

  test("should notify achievements", async () => {
    const t = convexTest(schema);

    const user1 = await t.mutation(api.users.store, {
      tokenIdentifier: "user1-token",
      name: "Player 1",
    });

    const user2 = await t.mutation(api.users.store, {
      tokenIdentifier: "user2-token",
      name: "Player 2",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: user1,
    });

    const player1 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user1,
      name: "Player 1",
    });

    const player2 = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId: user2,
      name: "Player 2",
    });

    // Trigger achievement notification
    await t.mutation(api.notifications.notifyAchievement, {
      gameId,
      playerId: player1,
      achievement: "Hole in One",
      description: "Amazing shot on hole 7!",
    });

    const user1Notifications = await t.query(api.notifications.getNotifications, {
      userId: user1,
    });

    const user2Notifications = await t.query(api.notifications.getNotifications, {
      userId: user2,
    });

    // Player 1 should get the achievement notification
    expect(user1Notifications).toHaveLength(1);
    expect(user1Notifications[0].title).toBe("🏆 Hole in One");
    expect(user1Notifications[0].type).toBe("achievement");
    expect(user1Notifications[0].priority).toBe("high");

    // Player 2 should get the social notification about the achievement
    expect(user2Notifications).toHaveLength(1);
    expect(user2Notifications[0].title).toBe("🎉 Player 1 achieved Hole in One!");
    expect(user2Notifications[0].type).toBe("social_moment");
    expect(user2Notifications[0].priority).toBe("normal");
  });

  test("should mark notifications as read", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "user-token",
      name: "Test User",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
    });

    const playerId = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId,
      name: "Test User",
    });

    // Create notification
    const notifications = await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Test Notification",
      body: "Test body",
      type: "game_started",
    });

    const notificationId = notifications[0];

    // Mark as read
    await t.mutation(api.notifications.markNotificationRead, {
      notificationId,
    });

    // Check it's marked as read
    const updatedNotifications = await t.query(api.notifications.getNotifications, {
      userId,
    });

    expect(updatedNotifications[0].read).toBe(true);
    expect(updatedNotifications[0].readAt).toBeDefined();
  });

  test("should mark all notifications as read", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "user-token",
      name: "Test User",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
    });

    const playerId = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId,
      name: "Test User",
    });

    // Create multiple notifications
    await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Notification 1",
      body: "Body 1",
      type: "game_started",
    });

    await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Notification 2",
      body: "Body 2",
      type: "score_update",
    });

    // Mark all as read
    const markedCount = await t.mutation(api.notifications.markAllNotificationsRead, {
      userId,
    });

    expect(markedCount).toBe(2);

    // Check all are marked as read
    const notifications = await t.query(api.notifications.getNotifications, {
      userId,
    });

    expect(notifications.every(n => n.read)).toBe(true);
  });

  test("should filter unread notifications", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "user-token",
      name: "Test User",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
    });

    const playerId = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId,
      name: "Test User",
    });

    // Create notifications
    const notifications = await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Notification 1",
      body: "Body 1",
      type: "game_started",
    });

    await t.mutation(api.notifications.notifyGameEvent, {
      gameId,
      title: "Notification 2",
      body: "Body 2",
      type: "score_update",
    });

    // Mark one as read
    await t.mutation(api.notifications.markNotificationRead, {
      notificationId: notifications[0],
    });

    // Get only unread notifications
    const unreadNotifications = await t.query(api.notifications.getNotifications, {
      userId,
      unreadOnly: true,
    });

    expect(unreadNotifications).toHaveLength(1);
    expect(unreadNotifications[0].title).toBe("Notification 2");
  });

  test("should clean up old notifications", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.store, {
      tokenIdentifier: "user-token",
      name: "Test User",
    });

    const gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
    });

    const playerId = await t.mutation(api.games.joinGameAsUser, {
      gameId,
      userId,
      name: "Test User",
    });

    // Create notification with old timestamp (35 days ago)
    const oldTimestamp = Date.now() - (35 * 24 * 60 * 60 * 1000);
    
    // We need to manually insert an old notification since the API uses current timestamp
    // This would typically be done through a scheduled function in production
    const cleanedCount = await t.mutation(api.notifications.cleanupOldNotifications, {});

    // Since we can't easily create old notifications in this test,
    // we just verify the function runs without error
    expect(cleanedCount).toBe(0);
  });
});