import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all active sponsors
export const getActiveSponsors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sponsors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Query to get sponsor by ID
export const getSponsor = query({
  args: { sponsorId: v.id("sponsors") },
  handler: async (ctx, { sponsorId }) => {
    return await ctx.db.get(sponsorId);
  },
});

// Query to get all rewards for a sponsor
export const getSponsorRewards = query({
  args: { sponsorId: v.id("sponsors") },
  handler: async (ctx, { sponsorId }) => {
    return await ctx.db
      .query("sponsorRewards")
      .withIndex("by_sponsor_active", (q) => 
        q.eq("sponsorId", sponsorId).eq("isActive", true)
      )
      .collect();
  },
});

// Query to get available rewards for a completed game
export const getAvailableRewards = query({
  args: { gameId: v.id("games"), playerId: v.id("players") },
  handler: async (ctx, { gameId, playerId }) => {
    // Get game data to check completion status
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== "finished") {
      return [];
    }

    // Get player data
    const player = await ctx.db.get(playerId);
    if (!player) {
      return [];
    }

    // Get player's scores to calculate total and validate conditions
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect();

    const totalScore = scores.reduce((sum, score) => sum + score.strokes, 0);
    const holesPlayed = scores.length;

    // Get all active rewards
    const allRewards = await ctx.db
      .query("sponsorRewards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter rewards based on conditions and availability
    const availableRewards = [];
    const now = Date.now();

    for (const reward of allRewards) {
      // Check expiration
      if (reward.expiresAt && reward.expiresAt < now) {
        continue;
      }

      // Check max redemptions
      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        continue;
      }

      // Check if player already redeemed this reward
      const existingRedemption = await ctx.db
        .query("rewardRedemptions")
        .withIndex("by_player", (q) => q.eq("playerId", playerId))
        .filter((q) => q.eq(q.field("rewardId"), reward._id))
        .first();

      if (existingRedemption) {
        continue;
      }

      // Check conditions
      if (reward.conditions) {
        const { minScore, maxScore, requiredHoles, gameFormat } = reward.conditions;
        
        if (minScore && totalScore < minScore) continue;
        if (maxScore && totalScore > maxScore) continue;
        if (requiredHoles && holesPlayed < requiredHoles) continue;
        if (gameFormat && game.format !== gameFormat) continue;
      }

      // Get sponsor info
      const sponsor = await ctx.db.get(reward.sponsorId);
      if (sponsor && sponsor.isActive) {
        availableRewards.push({
          ...reward,
          sponsor,
        });
      }
    }

    return availableRewards;
  },
});

// Mutation to redeem a reward
export const redeemReward = mutation({
  args: {
    rewardId: v.id("sponsorRewards"),
    playerId: v.id("players"),
    gameId: v.id("games"),
  },
  handler: async (ctx, { rewardId, playerId, gameId }) => {
    // Validate reward exists and is active
    const reward = await ctx.db.get(rewardId);
    if (!reward || !reward.isActive) {
      throw new Error("Reward not found or inactive");
    }

    // Check if reward is expired
    const now = Date.now();
    if (reward.expiresAt && reward.expiresAt < now) {
      throw new Error("Reward has expired");
    }

    // Check max redemptions
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      throw new Error("Reward redemption limit reached");
    }

    // Check if player already redeemed this reward
    const existingRedemption = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .filter((q) => q.eq(q.field("rewardId"), rewardId))
      .first();

    if (existingRedemption) {
      throw new Error("Reward already redeemed by this player");
    }

    // Validate game is finished
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== "finished") {
      throw new Error("Game must be finished to redeem rewards");
    }

    // Generate unique redemption code
    const redemptionCode = `${reward.sponsorId.slice(-4)}-${playerId.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;

    // Create redemption record
    const redemptionId = await ctx.db.insert("rewardRedemptions", {
      rewardId,
      playerId,
      gameId,
      redemptionCode,
      redeemedAt: now,
      status: "pending",
    });

    // Update reward redemption count
    await ctx.db.patch(rewardId, {
      currentRedemptions: reward.currentRedemptions + 1,
    });

    return {
      redemptionId,
      redemptionCode,
      reward,
    };
  },
});

// Query to get player's redemption history
export const getPlayerRedemptions = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const redemptions = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    // Enrich with reward and sponsor data
    const enrichedRedemptions = [];
    for (const redemption of redemptions) {
      const reward = await ctx.db.get(redemption.rewardId);
      if (reward) {
        const sponsor = await ctx.db.get(reward.sponsorId);
        enrichedRedemptions.push({
          ...redemption,
          reward,
          sponsor,
        });
      }
    }

    return enrichedRedemptions;
  },
});

// Query to get redemption analytics for sponsors
export const getSponsorAnalytics = query({
  args: { sponsorId: v.id("sponsors") },
  handler: async (ctx, { sponsorId }) => {
    const rewards = await ctx.db
      .query("sponsorRewards")
      .withIndex("by_sponsor", (q) => q.eq("sponsorId", sponsorId))
      .collect();

    const analytics = {
      totalRewards: rewards.length,
      activeRewards: rewards.filter(r => r.isActive).length,
      totalRedemptions: 0,
      rewardBreakdown: [] as Array<{
        rewardId: Id<"sponsorRewards">;
        name: string;
        redemptions: number;
        maxRedemptions?: number;
      }>,
    };

    for (const reward of rewards) {
      const redemptions = await ctx.db
        .query("rewardRedemptions")
        .withIndex("by_reward", (q) => q.eq("rewardId", reward._id))
        .collect();

      analytics.totalRedemptions += redemptions.length;
      analytics.rewardBreakdown.push({
        rewardId: reward._id,
        name: reward.name,
        redemptions: redemptions.length,
        maxRedemptions: reward.maxRedemptions,
      });
    }

    return analytics;
  },
});

// Enhanced sponsor ROI and performance analytics
export const getSponsorROIAnalytics = query({
  args: { 
    sponsorId: v.id("sponsors"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");

    const now = Date.now();
    const startTime = args.startDate ? new Date(args.startDate).getTime() : now - (30 * 24 * 60 * 60 * 1000);
    const endTime = args.endDate ? new Date(args.endDate).getTime() : now;

    // Get all rewards for this sponsor
    const rewards = await ctx.db
      .query("sponsorRewards")
      .withIndex("by_sponsor", (q) => q.eq("sponsorId", args.sponsorId))
      .collect();

    // Get redemptions within date range
    const allRedemptions = [];
    for (const reward of rewards) {
      const redemptions = await ctx.db
        .query("rewardRedemptions")
        .withIndex("by_reward", (q) => q.eq("rewardId", reward._id))
        .filter((q) => q.gte(q.field("redeemedAt"), startTime))
        .filter((q) => q.lte(q.field("redeemedAt"), endTime))
        .collect();
      
      for (const redemption of redemptions) {
        allRedemptions.push({ ...redemption, reward });
      }
    }

    // Calculate metrics
    const totalRedemptions = allRedemptions.length;
    const totalRewardValue = allRedemptions.reduce((sum, r) => sum + r.reward.value, 0);
    const averageRewardValue = totalRedemptions > 0 ? totalRewardValue / totalRedemptions : 0;

    // Get unique games and players reached
    const uniqueGames = new Set(allRedemptions.map(r => r.gameId)).size;
    const uniquePlayers = new Set(allRedemptions.map(r => r.playerId)).size;

    // Calculate engagement metrics
    const rewardTypeBreakdown = new Map();
    allRedemptions.forEach(redemption => {
      const type = redemption.reward.type;
      rewardTypeBreakdown.set(type, (rewardTypeBreakdown.get(type) || 0) + 1);
    });

    // Calculate ROI metrics (simplified - would need actual cost data)
    const estimatedCost = totalRewardValue * 0.7; // Assume 70% of reward value is cost
    const estimatedRevenue = uniqueGames * 50; // Assume $50 average revenue per game influenced
    const roi = estimatedCost > 0 ? ((estimatedRevenue - estimatedCost) / estimatedCost) * 100 : 0;

    // Performance over time
    const dailyPerformance = new Map();
    allRedemptions.forEach(redemption => {
      const date = new Date(redemption.redeemedAt).toISOString().split('T')[0];
      if (!dailyPerformance.has(date)) {
        dailyPerformance.set(date, { date, redemptions: 0, value: 0 });
      }
      const day = dailyPerformance.get(date);
      day.redemptions += 1;
      day.value += redemption.reward.value;
    });

    return {
      overview: {
        totalRedemptions,
        totalRewardValue,
        averageRewardValue: Math.round(averageRewardValue * 100) / 100,
        uniqueGames,
        uniquePlayers,
        reachRate: uniquePlayers > 0 ? Math.round((totalRedemptions / uniquePlayers) * 100) / 100 : 0,
      },
      roi: {
        estimatedCost,
        estimatedRevenue,
        roi: Math.round(roi * 100) / 100,
        costPerRedemption: totalRedemptions > 0 ? Math.round((estimatedCost / totalRedemptions) * 100) / 100 : 0,
        revenuePerRedemption: totalRedemptions > 0 ? Math.round((estimatedRevenue / totalRedemptions) * 100) / 100 : 0,
      },
      engagement: {
        rewardTypeBreakdown: Object.fromEntries(rewardTypeBreakdown),
        averageRedemptionsPerGame: uniqueGames > 0 ? Math.round((totalRedemptions / uniqueGames) * 100) / 100 : 0,
        playerRetentionRate: uniquePlayers > 0 ? Math.round((uniqueGames / uniquePlayers) * 100) / 100 : 0,
      },
      performance: {
        dailyStats: Array.from(dailyPerformance.values()).sort((a, b) => a.date.localeCompare(b.date)),
        topPerformingRewards: rewards
          .map(reward => ({
            ...reward,
            redemptions: allRedemptions.filter(r => r.rewardId === reward._id).length,
            totalValue: allRedemptions.filter(r => r.rewardId === reward._id).reduce((sum, r) => sum + r.reward.value, 0),
          }))
          .sort((a, b) => b.redemptions - a.redemptions)
          .slice(0, 5),
      },
      lastUpdated: now,
    };
  },
});

// Get sponsor performance comparison
export const getSponsorPerformanceComparison = query({
  args: {
    courseId: v.optional(v.id("courses")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startTime = args.startDate ? new Date(args.startDate).getTime() : now - (30 * 24 * 60 * 60 * 1000);
    const endTime = args.endDate ? new Date(args.endDate).getTime() : now;

    // Get all active sponsors
    const sponsors = await ctx.db
      .query("sponsors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const sponsorPerformance = [];

    for (const sponsor of sponsors) {
      // Get sponsor's rewards
      const rewards = await ctx.db
        .query("sponsorRewards")
        .withIndex("by_sponsor_active", (q) => q.eq("sponsorId", sponsor._id).eq("isActive", true))
        .collect();

      // Get redemptions for this sponsor within date range
      let totalRedemptions = 0;
      let totalValue = 0;
      const uniqueGames = new Set();
      const uniquePlayers = new Set();

      for (const reward of rewards) {
        const redemptions = await ctx.db
          .query("rewardRedemptions")
          .withIndex("by_reward", (q) => q.eq("rewardId", reward._id))
          .filter((q) => q.gte(q.field("redeemedAt"), startTime))
          .filter((q) => q.lte(q.field("redeemedAt"), endTime))
          .collect();

        // Filter by course if specified
        let filteredRedemptions = redemptions;
        if (args.courseId) {
          const gamePromises = redemptions.map(r => ctx.db.get(r.gameId));
          const games = await Promise.all(gamePromises);
          filteredRedemptions = redemptions.filter((_, index) => 
            games[index] && games[index].courseId === args.courseId
          );
        }

        totalRedemptions += filteredRedemptions.length;
        totalValue += filteredRedemptions.length * reward.value;
        filteredRedemptions.forEach(r => {
          uniqueGames.add(r.gameId);
          uniquePlayers.add(r.playerId);
        });
      }

      const averageRewardValue = totalRedemptions > 0 ? totalValue / totalRedemptions : 0;
      const reachRate = uniquePlayers.size > 0 ? totalRedemptions / uniquePlayers.size : 0;

      sponsorPerformance.push({
        sponsor,
        metrics: {
          totalRedemptions,
          totalValue,
          averageRewardValue: Math.round(averageRewardValue * 100) / 100,
          uniqueGames: uniqueGames.size,
          uniquePlayers: uniquePlayers.size,
          reachRate: Math.round(reachRate * 100) / 100,
          activeRewards: rewards.length,
        },
      });
    }

    // Sort by total redemptions
    sponsorPerformance.sort((a, b) => b.metrics.totalRedemptions - a.metrics.totalRedemptions);

    return {
      sponsors: sponsorPerformance,
      summary: {
        totalSponsors: sponsors.length,
        totalRedemptions: sponsorPerformance.reduce((sum, s) => sum + s.metrics.totalRedemptions, 0),
        totalValue: sponsorPerformance.reduce((sum, s) => sum + s.metrics.totalValue, 0),
        averageRedemptionsPerSponsor: sponsors.length > 0 ? 
          Math.round((sponsorPerformance.reduce((sum, s) => sum + s.metrics.totalRedemptions, 0) / sponsors.length) * 100) / 100 : 0,
      },
      lastUpdated: now,
    };
  },
});

// Mutation to create a new sponsor
export const createSponsor = mutation({
  args: {
    name: v.string(),
    logo: v.string(),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    rewardBudget: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sponsors", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Mutation to create a new sponsor reward
export const createSponsorReward = mutation({
  args: {
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
    conditions: v.optional(v.object({
      minScore: v.optional(v.number()),
      maxScore: v.optional(v.number()),
      requiredHoles: v.optional(v.number()),
      gameFormat: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sponsorRewards", {
      ...args,
      currentRedemptions: 0,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});