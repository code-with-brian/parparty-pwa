import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const convertGuestToUser = mutation({
  args: {
    guestId: v.id("guests"),
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate guest exists
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        throw new ConvexError("Guest session not found");
      }

      // Check if user already exists with this token
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
        .first();

      if (existingUser) {
        throw new ConvexError("User already exists with this account");
      }

      // Create new user account
      const userId = await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        tokenIdentifier: args.tokenIdentifier,
        image: args.image,
      });

      // Migrate guest data to user
      await migrateGuestDataToUser(ctx, args.guestId, userId);

      return { userId, success: true };
    } catch (error) {
      console.error("Error converting guest to user:", error);
      throw new ConvexError("Failed to convert guest to user");
    }
  },
});

export const getGuestConversionData = query({
  args: {
    guestId: v.id("guests"),
  },
  handler: async (ctx, args) => {
    try {
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        throw new ConvexError("Guest session not found");
      }

      // Get all games the guest has participated in
      const playerRecords = await ctx.db
        .query("players")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .collect();

      const gameIds = playerRecords.map(p => p.gameId);
      const games = await Promise.all(gameIds.map(id => ctx.db.get(id)));

      // Get scores for all games
      const allScores = await Promise.all(
        playerRecords.map(async (player) => {
          const scores = await ctx.db
            .query("scores")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, scores };
        })
      );

      // Get photos for all games
      const allPhotos = await Promise.all(
        playerRecords.map(async (player) => {
          const photos = await ctx.db
            .query("photos")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, photos };
        })
      );

      // Get food orders for all games
      const allOrders = await Promise.all(
        playerRecords.map(async (player) => {
          const orders = await ctx.db
            .query("foodOrders")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, orders };
        })
      );

      // Get social posts for all games
      const allSocialPosts = await Promise.all(
        playerRecords.map(async (player) => {
          const posts = await ctx.db
            .query("socialPosts")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, posts };
        })
      );

      // Get highlights for all games
      const allHighlights = await Promise.all(
        playerRecords.map(async (player) => {
          const highlights = await ctx.db
            .query("highlights")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, highlights };
        })
      );

      // Get reward redemptions for all games
      const allRedemptions = await Promise.all(
        playerRecords.map(async (player) => {
          const redemptions = await ctx.db
            .query("rewardRedemptions")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();
          return { playerId: player._id, gameId: player.gameId, redemptions };
        })
      );

      // Calculate summary statistics
      const totalGames = games.filter(g => g !== null).length;
      const totalScores = allScores.reduce((sum, s) => sum + s.scores.length, 0);
      const totalPhotos = allPhotos.reduce((sum, p) => sum + p.photos.length, 0);
      const totalOrders = allOrders.reduce((sum, o) => sum + o.orders.length, 0);
      const totalSocialPosts = allSocialPosts.reduce((sum, p) => sum + p.posts.length, 0);
      const totalHighlights = allHighlights.reduce((sum, h) => sum + h.highlights.length, 0);
      const totalRedemptions = allRedemptions.reduce((sum, r) => sum + r.redemptions.length, 0);

      // Calculate total spending
      const totalSpent = allOrders.reduce((sum, orderGroup) => 
        sum + orderGroup.orders.reduce((orderSum, order) => orderSum + order.totalAmount, 0), 0
      );

      return {
        guest,
        summary: {
          totalGames,
          totalScores,
          totalPhotos,
          totalOrders,
          totalSocialPosts,
          totalHighlights,
          totalRedemptions,
          totalSpent,
          memberSince: guest.createdAt,
        },
        games: games.filter(g => g !== null),
        playerRecords,
        recentActivity: {
          scores: allScores.slice(-5), // Last 5 score entries
          photos: allPhotos.slice(-3), // Last 3 photo uploads
          orders: allOrders.slice(-3), // Last 3 orders
        }
      };
    } catch (error) {
      console.error("Error getting guest conversion data:", error);
      throw new ConvexError("Failed to get guest conversion data");
    }
  },
});

// Helper function to migrate all guest data to user
async function migrateGuestDataToUser(
  ctx: any,
  guestId: Id<"guests">,
  userId: Id<"users">
) {
  try {
    // Get all player records for this guest
    const playerRecords = await ctx.db
      .query("players")
      .withIndex("by_guest", (q: any) => q.eq("guestId", guestId))
      .collect();

    // Update all player records to reference the new user
    for (const player of playerRecords) {
      await ctx.db.patch(player._id, {
        userId: userId,
        guestId: undefined, // Remove guest reference
      });
    }

    // Note: Scores, photos, foodOrders, socialPosts, highlights, and rewardRedemptions
    // are already linked to players, so they automatically become associated with the user
    // through the player records we just updated

    console.log(`Successfully migrated ${playerRecords.length} player records from guest ${guestId} to user ${userId}`);
    
    return { success: true, migratedPlayers: playerRecords.length };
  } catch (error) {
    console.error("Error migrating guest data:", error);
    throw new ConvexError("Failed to migrate guest data");
  }
}

export const previewAccountBenefits = query({
  args: {},
  handler: async (ctx, args) => {
    return {
      benefits: [
        {
          title: "Save Your Golf History",
          description: "Keep track of all your rounds, scores, and improvements over time",
          icon: "📊"
        },
        {
          title: "Photo Memories",
          description: "Store and share all your golf photos and highlight reels",
          icon: "📸"
        },
        {
          title: "Reward History",
          description: "Track your sponsor rewards and redemptions across all courses",
          icon: "🏆"
        },
        {
          title: "Social Connections",
          description: "Connect with friends and build your golf network",
          icon: "👥"
        },
        {
          title: "Course Analytics",
          description: "Get insights into your performance at different courses",
          icon: "📈"
        },
        {
          title: "Priority Access",
          description: "Get early access to new features and exclusive events",
          icon: "⭐"
        }
      ],
      features: [
        "Unlimited game history storage",
        "Advanced scoring analytics",
        "Social sharing and connections",
        "Personalized recommendations",
        "Priority customer support",
        "Exclusive member rewards"
      ]
    };
  },
});

export const checkConversionEligibility = query({
  args: {
    guestId: v.id("guests"),
  },
  handler: async (ctx, args) => {
    try {
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        return { eligible: false, reason: "Guest session not found" };
      }

      // Check if guest has any activity worth converting
      const playerRecords = await ctx.db
        .query("players")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .collect();

      if (playerRecords.length === 0) {
        return { 
          eligible: false, 
          reason: "No game activity found. Play a round first to unlock account creation!" 
        };
      }

      // Check if guest has meaningful activity (scores, photos, etc.)
      let hasActivity = false;
      for (const player of playerRecords) {
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_player", (q) => q.eq("playerId", player._id))
          .first();
        
        if (scores) {
          hasActivity = true;
          break;
        }
      }

      if (!hasActivity) {
        return { 
          eligible: false, 
          reason: "Complete at least one hole to unlock account creation!" 
        };
      }

      return { 
        eligible: true, 
        playerCount: playerRecords.length,
        message: `Ready to save your golf journey! You have activity from ${playerRecords.length} game${playerRecords.length > 1 ? 's' : ''}.`
      };
    } catch (error) {
      console.error("Error checking conversion eligibility:", error);
      return { eligible: false, reason: "Unable to check eligibility" };
    }
  },
});