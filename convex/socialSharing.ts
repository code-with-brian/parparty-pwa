import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Track social shares
export const trackShare = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
    platform: v.string(),
    contentType: v.union(
      v.literal("highlight"),
      v.literal("achievement"),
      v.literal("game_qr"),
      v.literal("referral")
    ),
    contentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create a share record (we'll add this to schema if needed)
    const shareId = await ctx.db.insert("socialPosts", {
      gameId: args.gameId,
      playerId: args.playerId || ("" as Id<"players">), // Temporary fallback
      type: "custom",
      content: `Shared ${args.contentType} on ${args.platform}`,
      timestamp: Date.now(),
    });

    // Update game analytics if needed
    const game = await ctx.db.get(args.gameId);
    if (game) {
      // Could track share metrics here
    }

    return shareId;
  },
});

// Track referral clicks and conversions
export const trackReferral = mutation({
  args: {
    gameId: v.id("games"),
    referrerId: v.string(),
    referrerType: v.union(v.literal("user"), v.literal("guest")),
    action: v.union(v.literal("click"), v.literal("join")),
    guestId: v.optional(v.id("guests")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Create referral tracking record
    const referralId = await ctx.db.insert("socialPosts", {
      gameId: args.gameId,
      playerId: "" as Id<"players">, // Temporary
      type: "custom",
      content: `Referral ${args.action} from ${args.referrerId}`,
      timestamp: Date.now(),
    });

    // If this is a successful join, update referrer stats
    if (args.action === "join") {
      // Find the referrer and update their stats
      // This would be implemented with proper referral tracking tables
    }

    return referralId;
  },
});

// Get referral stats for a user/guest
export const getReferralStats = query({
  args: {
    referrerId: v.string(),
    referrerType: v.union(v.literal("user"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    // Query referral records for this referrer
    // This is a simplified version - would need proper referral tables
    
    return {
      totalReferrals: 0,
      successfulJoins: 0,
      rewardsEarned: 0,
      currentStreak: 0,
    };
  },
});

// Get social proof metrics for content
export const getSocialProof = query({
  args: {
    gameId: v.id("games"),
    contentType: v.union(
      v.literal("highlight"),
      v.literal("game"),
      v.literal("achievement")
    ),
    contentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get share counts, view counts, etc.
    const shares = await ctx.db
      .query("socialPosts")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("content"), `Shared ${args.contentType}`))
      .collect();

    return {
      shareCount: shares.length,
      viewCount: Math.floor(Math.random() * 100) + 10, // Simulated for now
      likeCount: Math.floor(Math.random() * 50) + 5,
      commentCount: Math.floor(Math.random() * 20) + 2,
    };
  },
});

// Update highlight view count
export const incrementHighlightViews = mutation({
  args: {
    highlightId: v.id("highlights"),
  },
  handler: async (ctx, args) => {
    const highlight = await ctx.db.get(args.highlightId);
    if (!highlight) {
      throw new Error("Highlight not found");
    }

    await ctx.db.patch(args.highlightId, {
      viewCount: highlight.viewCount + 1,
    });

    return highlight.viewCount + 1;
  },
});

// Create shareable highlight URL
export const createShareableHighlight = mutation({
  args: {
    highlightId: v.id("highlights"),
  },
  handler: async (ctx, args) => {
    const highlight = await ctx.db.get(args.highlightId);
    if (!highlight) {
      throw new Error("Highlight not found");
    }

    // Generate a shareable URL
    const shareableUrl = `https://parparty.com/highlights/${args.highlightId}`;
    
    await ctx.db.patch(args.highlightId, {
      shareableUrl,
      isPublic: true,
    });

    return shareableUrl;
  },
});

// Get public highlight for sharing
export const getPublicHighlight = query({
  args: {
    highlightId: v.id("highlights"),
  },
  handler: async (ctx, args) => {
    const highlight = await ctx.db.get(args.highlightId);
    
    if (!highlight || !highlight.isPublic) {
      return null;
    }

    // Get associated data
    const game = await ctx.db.get(highlight.gameId);
    const player = await ctx.db.get(highlight.playerId);
    
    if (!game || !player) {
      return null;
    }

    // Get photos
    const photos = await Promise.all(
      highlight.photoIds.map(id => ctx.db.get(id))
    );

    return {
      ...highlight,
      game: {
        name: game.name,
        date: new Date(game.startedAt).toLocaleDateString(),
      },
      player: {
        name: player.name,
        avatar: player.avatar,
      },
      photos: photos.filter(Boolean),
    };
  },
});

// Track achievement shares
export const shareAchievement = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    achievement: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    // Create achievement share post
    const postId = await ctx.db.insert("socialPosts", {
      gameId: args.gameId,
      playerId: args.playerId,
      type: "achievement",
      content: `🏆 ${args.achievement}! Shared on ${args.platform}`,
      timestamp: Date.now(),
    });

    // Track the share
    await ctx.db.insert("socialPosts", {
      gameId: args.gameId,
      playerId: args.playerId,
      type: "custom",
      content: `Shared achievement on ${args.platform}`,
      timestamp: Date.now(),
    });

    return postId;
  },
});

// Get viral game metrics
export const getViralMetrics = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    // Get all social posts for this game
    const socialPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Count different types of engagement
    const shares = socialPosts.filter(post => 
      post.content.includes("Shared") || post.type === "achievement"
    ).length;

    const photos = socialPosts.filter(post => post.type === "photo").length;
    const achievements = socialPosts.filter(post => post.type === "achievement").length;

    // Get player count
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    return {
      totalShares: shares,
      totalPhotos: photos,
      totalAchievements: achievements,
      playerCount: players.length,
      viralScore: shares * 2 + photos + achievements * 3, // Simple viral score
    };
  },
});