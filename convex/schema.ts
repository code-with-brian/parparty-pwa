import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  guests: defineTable({
    deviceId: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_device", ["deviceId"]),

  games: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    courseId: v.optional(v.id("courses")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("finished")),
    format: v.union(v.literal("stroke"), v.literal("match"), v.literal("scramble"), v.literal("best_ball")),
    metadata: v.optional(v.object({
      weather: v.optional(v.string()),
      courseConditions: v.optional(v.string()),
      eventType: v.optional(v.string()),
    })),
  }).index("by_creator", ["createdBy"])
    .index("by_course", ["courseId"])
    .index("by_status", ["status"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    avatar: v.optional(v.string()),
    position: v.number(),
    teamId: v.optional(v.string()),
  }).index("by_game", ["gameId"])
    .index("by_user", ["userId"])
    .index("by_guest", ["guestId"]),

  scores: defineTable({
    playerId: v.id("players"),
    gameId: v.id("games"),
    holeNumber: v.number(),
    strokes: v.number(),
    putts: v.optional(v.number()),
    timestamp: v.number(),
    gpsLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  }).index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_game_hole", ["gameId", "holeNumber"])
    .index("by_player_hole", ["playerId", "holeNumber"]),

  photos: defineTable({
    playerId: v.id("players"),
    gameId: v.id("games"),
    url: v.string(),
    caption: v.optional(v.string()),
    holeNumber: v.optional(v.number()),
    timestamp: v.number(),
    gpsLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  }).index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_game_hole", ["gameId", "holeNumber"]),

  socialPosts: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    type: v.union(
      v.literal("score"),
      v.literal("photo"),
      v.literal("achievement"),
      v.literal("order"),
      v.literal("custom")
    ),
    content: v.string(),
    mediaIds: v.optional(v.array(v.id("photos"))),
    timestamp: v.number(),
    reactions: v.optional(v.array(v.object({
      playerId: v.id("players"),
      type: v.union(v.literal("like"), v.literal("love"), v.literal("laugh"), v.literal("wow")),
      timestamp: v.number(),
    }))),
  }).index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_game_timestamp", ["gameId", "timestamp"]),

  foodOrders: defineTable({
    playerId: v.id("players"),
    gameId: v.id("games"),
    courseId: v.id("courses"),
    items: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      price: v.number(),
      description: v.optional(v.string()),
    })),
    totalAmount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("delivered")
    ),
    deliveryLocation: v.union(v.literal("hole"), v.literal("clubhouse"), v.literal("cart")),
    holeNumber: v.optional(v.number()),
    timestamp: v.number(),
    paymentId: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
  }).index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_course", ["courseId"])
    .index("by_status", ["status"])
    .index("by_game_status", ["gameId", "status"]),

  sponsors: defineTable({
    name: v.string(),
    logo: v.string(),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    rewardBudget: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  sponsorRewards: defineTable({
    sponsorId: v.id("sponsors"),
    name: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("discount"),
      v.literal("product"),
      v.literal("experience"),
      v.literal("credit")
    ),
    value: v.number(),
    imageUrl: v.string(),
    redemptionCode: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxRedemptions: v.optional(v.number()),
    currentRedemptions: v.number(),
    isActive: v.boolean(),
    conditions: v.optional(v.object({
      minScore: v.optional(v.number()),
      maxScore: v.optional(v.number()),
      requiredHoles: v.optional(v.number()),
      gameFormat: v.optional(v.string()),
    })),
    createdAt: v.number(),
  }).index("by_sponsor", ["sponsorId"])
    .index("by_active", ["isActive"])
    .index("by_sponsor_active", ["sponsorId", "isActive"])
    .index("by_expires", ["expiresAt"]),

  rewardRedemptions: defineTable({
    rewardId: v.id("sponsorRewards"),
    playerId: v.id("players"),
    gameId: v.id("games"),
    redemptionCode: v.string(),
    redeemedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("used")),
  }).index("by_reward", ["rewardId"])
    .index("by_player", ["playerId"])
    .index("by_game", ["gameId"])
    .index("by_code", ["redemptionCode"]),

  highlights: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    narrative: v.string(),
    keyMoments: v.array(v.object({
      type: v.union(
        v.literal("best_shot"),
        v.literal("worst_shot"),
        v.literal("achievement"),
        v.literal("social_moment"),
        v.literal("order")
      ),
      holeNumber: v.optional(v.number()),
      description: v.string(),
      timestamp: v.number(),
      photoId: v.optional(v.id("photos")),
    })),
    photoIds: v.array(v.id("photos")),
    captions: v.array(v.string()),
    shareableUrl: v.optional(v.string()),
    generatedAt: v.number(),
    viewCount: v.number(),
    isPublic: v.boolean(),
  }).index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_public", ["isPublic"])
    .index("by_generated", ["generatedAt"]),

  courses: defineTable({
    name: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    partnershipLevel: v.union(v.literal("basic"), v.literal("premium"), v.literal("enterprise")),
    revenueShare: v.number(),
    qrCodes: v.optional(v.array(v.object({
      location: v.string(), // e.g., "tee_1", "clubhouse", "pro_shop"
      code: v.string(),
      isActive: v.boolean(),
    }))),
    fbIntegration: v.optional(v.object({
      providerId: v.string(),
      apiKey: v.optional(v.string()),
      isActive: v.boolean(),
    })),
    analytics: v.optional(v.object({
      totalGames: v.number(),
      totalRevenue: v.number(),
      averageOrderValue: v.number(),
      lastUpdated: v.number(),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_partnership", ["partnershipLevel"])
    .index("by_active", ["isActive"])
    .index("by_city", ["city"])
    .index("by_state", ["state"]),

  // Push notification tokens
  pushTokens: defineTable({
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_token", ["token"]),

  // Notification records
  notifications: defineTable({
    gameId: v.optional(v.id("games")),
    playerId: v.optional(v.id("players")),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("game_started"),
      v.literal("game_finished"),
      v.literal("score_update"),
      v.literal("achievement"),
      v.literal("social_moment"),
      v.literal("order_update")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    data: v.optional(v.object({
      gameId: v.optional(v.id("games")),
      orderId: v.optional(v.id("foodOrders")),
      triggerPlayerId: v.optional(v.id("players")),
      achievement: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_type", ["type"])
    .index("by_read", ["read"])
    .index("by_user_read", ["userId", "read"])
    .index("by_guest_read", ["guestId", "read"])
    .index("by_created", ["createdAt"]),

  // Payment methods for users
  paymentMethods: defineTable({
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    stripePaymentMethodId: v.string(),
    type: v.union(v.literal("card"), v.literal("apple_pay"), v.literal("google_pay")),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_stripe_id", ["stripePaymentMethodId"])
    .index("by_user_default", ["userId", "isDefault"])
    .index("by_guest_default", ["guestId", "isDefault"]),

  // Payment transactions
  payments: defineTable({
    orderId: v.id("foodOrders"),
    playerId: v.id("players"),
    gameId: v.id("games"),
    stripePaymentIntentId: v.string(),
    stripePaymentMethodId: v.optional(v.string()),
    amount: v.number(), // in cents
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("requires_action")
    ),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.object({
      courseId: v.optional(v.id("courses")),
      deliveryLocation: v.optional(v.string()),
      holeNumber: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_order", ["orderId"])
    .index("by_player", ["playerId"])
    .index("by_game", ["gameId"])
    .index("by_stripe_intent", ["stripePaymentIntentId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Payment refunds
  refunds: defineTable({
    paymentId: v.id("payments"),
    orderId: v.id("foodOrders"),
    stripeRefundId: v.string(),
    amount: v.number(), // in cents
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
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.object({
      initiatedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_payment", ["paymentId"])
    .index("by_order", ["orderId"])
    .index("by_stripe_refund", ["stripeRefundId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Payment analytics
  paymentAnalytics: defineTable({
    courseId: v.optional(v.id("courses")),
    gameId: v.optional(v.id("games")),
    date: v.string(), // YYYY-MM-DD format
    totalTransactions: v.number(),
    totalAmount: v.number(), // in cents
    successfulTransactions: v.number(),
    failedTransactions: v.number(),
    refundedTransactions: v.number(),
    refundedAmount: v.number(), // in cents
    averageTransactionAmount: v.number(), // in cents
    paymentMethodBreakdown: v.object({
      card: v.number(),
      applePay: v.number(),
      googlePay: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_course", ["courseId"])
    .index("by_game", ["gameId"])
    .index("by_date", ["date"])
    .index("by_course_date", ["courseId", "date"]),
});