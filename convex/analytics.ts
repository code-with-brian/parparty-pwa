import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get comprehensive course analytics
export const getCourseAnalytics = query({
  args: { 
    courseId: v.id("courses"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get all games at this course
    const allGames = await ctx.db
      .query("games")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Filter by date range if provided
    let filteredGames = allGames;
    if (args.startDate || args.endDate) {
      const startTime = args.startDate ? new Date(args.startDate).getTime() : 0;
      const endTime = args.endDate ? new Date(args.endDate).getTime() : now;
      filteredGames = allGames.filter(game => 
        game.startedAt >= startTime && game.startedAt <= endTime
      );
    }

    // Basic metrics
    const totalGames = filteredGames.length;
    const activeGames = filteredGames.filter(g => g.status === "active").length;
    const finishedGames = filteredGames.filter(g => g.status === "finished").length;
    
    // Recent activity
    const recentGames = allGames.filter(g => g.startedAt >= sevenDaysAgo);
    const last30DaysGames = allGames.filter(g => g.startedAt >= thirtyDaysAgo);

    // Get all players from these games
    const playerPromises = filteredGames.map(game => 
      ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", game._id)).collect()
    );
    const allPlayersArrays = await Promise.all(playerPromises);
    const allPlayers = allPlayersArrays.flat();

    // Player metrics
    const totalPlayers = allPlayers.length;
    const uniqueUsers = new Set(allPlayers.filter(p => p.userId).map(p => p.userId)).size;
    const guestPlayers = allPlayers.filter(p => p.guestId && !p.userId).length;
    const conversionRate = totalPlayers > 0 ? (uniqueUsers / totalPlayers) * 100 : 0;

    // Get F&B orders
    const fbOrders = await ctx.db
      .query("foodOrders")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const filteredOrders = fbOrders.filter(order => {
      if (args.startDate || args.endDate) {
        const startTime = args.startDate ? new Date(args.startDate).getTime() : 0;
        const endTime = args.endDate ? new Date(args.endDate).getTime() : now;
        return order.timestamp >= startTime && order.timestamp <= endTime;
      }
      return true;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    const ordersPerGame = totalGames > 0 ? filteredOrders.length / totalGames : 0;

    // Get sponsor reward redemptions
    const gameIds = filteredGames.map(g => g._id);
    const redemptionPromises = gameIds.map(gameId =>
      ctx.db.query("rewardRedemptions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allRedemptionsArrays = await Promise.all(redemptionPromises);
    const allRedemptions = allRedemptionsArrays.flat();

    // Time-based trends
    const dailyStats = await getDailyStats(ctx, args.courseId, filteredGames, filteredOrders);

    return {
      overview: {
        totalGames,
        activeGames,
        finishedGames,
        totalPlayers,
        uniqueUsers,
        guestPlayers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        ordersPerGame: Math.round(ordersPerGame * 100) / 100,
        totalRedemptions: allRedemptions.length,
      },
      trends: {
        recentGames: recentGames.length,
        last30DaysGames: last30DaysGames.length,
        weekOverWeekGrowth: calculateGrowthRate(recentGames.length, last30DaysGames.length - recentGames.length),
        dailyStats,
      },
      engagement: {
        averagePlayersPerGame: totalGames > 0 ? Math.round((totalPlayers / totalGames) * 100) / 100 : 0,
        fbOrderRate: totalPlayers > 0 ? Math.round((filteredOrders.length / totalPlayers) * 100) : 0,
        rewardRedemptionRate: totalPlayers > 0 ? Math.round((allRedemptions.length / totalPlayers) * 100) : 0,
      },
      lastUpdated: now,
    };
  },
});

// Get sponsor engagement analytics
export const getSponsorEngagementAnalytics = query({
  args: {
    courseId: v.optional(v.id("courses")),
    sponsorId: v.optional(v.id("sponsors")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get relevant games
    let gamesQuery = ctx.db.query("games");
    if (args.courseId) {
      gamesQuery = gamesQuery.withIndex("by_course", (q) => q.eq("courseId", args.courseId));
    }
    
    const allGames = await gamesQuery.collect();
    
    // Filter by date range
    let filteredGames = allGames;
    if (args.startDate || args.endDate) {
      const startTime = args.startDate ? new Date(args.startDate).getTime() : 0;
      const endTime = args.endDate ? new Date(args.endDate).getTime() : now;
      filteredGames = allGames.filter(game => 
        game.startedAt >= startTime && game.startedAt <= endTime
      );
    }

    const gameIds = filteredGames.map(g => g._id);

    // Get all redemptions for these games
    const redemptionPromises = gameIds.map(gameId =>
      ctx.db.query("rewardRedemptions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allRedemptionsArrays = await Promise.all(redemptionPromises);
    const allRedemptions = allRedemptionsArrays.flat();

    // Get sponsor rewards and enrich redemptions
    const enrichedRedemptions = [];
    for (const redemption of allRedemptions) {
      const reward = await ctx.db.get(redemption.rewardId);
      if (reward && (!args.sponsorId || reward.sponsorId === args.sponsorId)) {
        const sponsor = await ctx.db.get(reward.sponsorId);
        enrichedRedemptions.push({
          ...redemption,
          reward,
          sponsor,
        });
      }
    }

    // Calculate sponsor metrics
    const sponsorMetrics = new Map();
    
    for (const redemption of enrichedRedemptions) {
      const sponsorId = redemption.sponsor._id;
      const sponsorName = redemption.sponsor.name;
      
      if (!sponsorMetrics.has(sponsorId)) {
        sponsorMetrics.set(sponsorId, {
          sponsorId,
          sponsorName,
          logo: redemption.sponsor.logo,
          totalRedemptions: 0,
          totalValue: 0,
          rewardTypes: new Map(),
          conversionRate: 0,
          roi: 0,
        });
      }
      
      const metrics = sponsorMetrics.get(sponsorId);
      metrics.totalRedemptions += 1;
      metrics.totalValue += redemption.reward.value;
      
      const rewardType = redemption.reward.type;
      metrics.rewardTypes.set(rewardType, (metrics.rewardTypes.get(rewardType) || 0) + 1);
    }

    // Convert to array and calculate additional metrics
    const sponsorAnalytics = Array.from(sponsorMetrics.values()).map(metrics => ({
      ...metrics,
      rewardTypes: Object.fromEntries(metrics.rewardTypes),
      averageRedemptionValue: metrics.totalRedemptions > 0 ? 
        Math.round((metrics.totalValue / metrics.totalRedemptions) * 100) / 100 : 0,
    }));

    return {
      totalRedemptions: allRedemptions.length,
      totalValue: enrichedRedemptions.reduce((sum, r) => sum + r.reward.value, 0),
      uniqueSponsors: sponsorMetrics.size,
      sponsorBreakdown: sponsorAnalytics,
      topPerformingSponsors: sponsorAnalytics
        .sort((a, b) => b.totalRedemptions - a.totalRedemptions)
        .slice(0, 5),
      lastUpdated: now,
    };
  },
});

// Get player journey analytics
export const getPlayerJourneyAnalytics = query({
  args: {
    courseId: v.optional(v.id("courses")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get relevant games
    let gamesQuery = ctx.db.query("games");
    if (args.courseId) {
      gamesQuery = gamesQuery.withIndex("by_course", (q) => q.eq("courseId", args.courseId));
    }
    
    const allGames = await gamesQuery.collect();
    
    // Filter by date range
    let filteredGames = allGames;
    if (args.startDate || args.endDate) {
      const startTime = args.startDate ? new Date(args.startDate).getTime() : 0;
      const endTime = args.endDate ? new Date(args.endDate).getTime() : now;
      filteredGames = allGames.filter(game => 
        game.startedAt >= startTime && game.startedAt <= endTime
      );
    }

    // Get all players from these games
    const playerPromises = filteredGames.map(game => 
      ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", game._id)).collect()
    );
    const allPlayersArrays = await Promise.all(playerPromises);
    const allPlayers = allPlayersArrays.flat();

    // Analyze player journey stages
    const totalPlayers = allPlayers.length;
    const guestPlayers = allPlayers.filter(p => p.guestId && !p.userId);
    const convertedPlayers = allPlayers.filter(p => p.userId);
    
    // Get guest sessions to understand conversion timing
    const guestIds = guestPlayers.map(p => p.guestId).filter(Boolean);
    const guestSessions = await Promise.all(
      guestIds.map(guestId => ctx.db.get(guestId as Id<"guests">))
    );

    // Calculate conversion metrics
    const conversionRate = totalPlayers > 0 ? (convertedPlayers.length / totalPlayers) * 100 : 0;
    
    // Analyze engagement patterns
    const gameIds = filteredGames.map(g => g._id);
    
    // Get social posts to measure engagement
    const socialPostPromises = gameIds.map(gameId =>
      ctx.db.query("socialPosts").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allSocialPostsArrays = await Promise.all(socialPostPromises);
    const allSocialPosts = allSocialPostsArrays.flat();

    // Get F&B orders to measure monetization
    const fbOrderPromises = gameIds.map(gameId =>
      ctx.db.query("foodOrders").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allFbOrdersArrays = await Promise.all(fbOrderPromises);
    const allFbOrders = allFbOrdersArrays.flat();

    // Get reward redemptions
    const redemptionPromises = gameIds.map(gameId =>
      ctx.db.query("rewardRedemptions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allRedemptionsArrays = await Promise.all(redemptionPromises);
    const allRedemptions = allRedemptionsArrays.flat();

    // Calculate engagement metrics
    const socialEngagementRate = totalPlayers > 0 ? (allSocialPosts.length / totalPlayers) * 100 : 0;
    const fbOrderRate = totalPlayers > 0 ? (allFbOrders.length / totalPlayers) * 100 : 0;
    const rewardRedemptionRate = totalPlayers > 0 ? (allRedemptions.length / totalPlayers) * 100 : 0;

    // Analyze conversion funnel
    const funnelStages = {
      gameJoined: totalPlayers,
      socialEngagement: allSocialPosts.length,
      fbOrders: allFbOrders.length,
      rewardRedemptions: allRedemptions.length,
      accountCreated: convertedPlayers.length,
    };

    return {
      overview: {
        totalPlayers,
        guestPlayers: guestPlayers.length,
        convertedPlayers: convertedPlayers.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      engagement: {
        socialEngagementRate: Math.round(socialEngagementRate * 100) / 100,
        fbOrderRate: Math.round(fbOrderRate * 100) / 100,
        rewardRedemptionRate: Math.round(rewardRedemptionRate * 100) / 100,
        averageSocialPostsPerPlayer: totalPlayers > 0 ? 
          Math.round((allSocialPosts.length / totalPlayers) * 100) / 100 : 0,
      },
      conversionFunnel: funnelStages,
      dropoffRates: {
        gameToSocial: totalPlayers > 0 ? 
          Math.round(((totalPlayers - allSocialPosts.length) / totalPlayers) * 100) : 0,
        socialToOrder: allSocialPosts.length > 0 ? 
          Math.round(((allSocialPosts.length - allFbOrders.length) / allSocialPosts.length) * 100) : 0,
        orderToRedemption: allFbOrders.length > 0 ? 
          Math.round(((allFbOrders.length - allRedemptions.length) / allFbOrders.length) * 100) : 0,
        redemptionToConversion: allRedemptions.length > 0 ? 
          Math.round(((allRedemptions.length - convertedPlayers.length) / allRedemptions.length) * 100) : 0,
      },
      lastUpdated: now,
    };
  },
});

// Get real-time dashboard data
export const getRealTimeDashboard = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    // Get today's games
    const todaysGames = await ctx.db
      .query("games")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.gte(q.field("startedAt"), todayStart))
      .collect();

    const activeGames = todaysGames.filter(g => g.status === "active");
    const finishedGames = todaysGames.filter(g => g.status === "finished");

    // Get today's players
    const playerPromises = todaysGames.map(game => 
      ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", game._id)).collect()
    );
    const allPlayersArrays = await Promise.all(playerPromises);
    const todaysPlayers = allPlayersArrays.flat();

    // Get today's orders
    const todaysOrders = await ctx.db
      .query("foodOrders")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.gte(q.field("timestamp"), todayStart))
      .collect();

    // Get today's redemptions
    const gameIds = todaysGames.map(g => g._id);
    const redemptionPromises = gameIds.map(gameId =>
      ctx.db.query("rewardRedemptions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    );
    const allRedemptionsArrays = await Promise.all(redemptionPromises);
    const todaysRedemptions = allRedemptionsArrays.flat();

    // Calculate revenue
    const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Get recent activity (last 2 hours)
    const twoHoursAgo = now - (2 * 60 * 60 * 1000);
    const recentActivity = [];

    // Recent games
    const recentGames = todaysGames.filter(g => g.startedAt >= twoHoursAgo);
    recentGames.forEach(game => {
      recentActivity.push({
        type: 'game_started',
        timestamp: game.startedAt,
        description: `New game "${game.name}" started`,
        gameId: game._id,
      });
    });

    // Recent orders
    const recentOrders = todaysOrders.filter(o => o.timestamp >= twoHoursAgo);
    recentOrders.forEach(order => {
      recentActivity.push({
        type: 'order_placed',
        timestamp: order.timestamp,
        description: `F&B order placed - $${(order.totalAmount / 100).toFixed(2)}`,
        orderId: order._id,
      });
    });

    // Recent redemptions
    const recentRedemptions = todaysRedemptions.filter(r => r.redeemedAt >= twoHoursAgo);
    recentRedemptions.forEach(redemption => {
      recentActivity.push({
        type: 'reward_redeemed',
        timestamp: redemption.redeemedAt,
        description: 'Sponsor reward redeemed',
        redemptionId: redemption._id,
      });
    });

    // Sort by timestamp
    recentActivity.sort((a, b) => b.timestamp - a.timestamp);

    return {
      today: {
        totalGames: todaysGames.length,
        activeGames: activeGames.length,
        finishedGames: finishedGames.length,
        totalPlayers: todaysPlayers.length,
        totalOrders: todaysOrders.length,
        totalRevenue: todaysRevenue,
        totalRedemptions: todaysRedemptions.length,
      },
      liveActivity: {
        activeGames: activeGames.map(game => ({
          _id: game._id,
          name: game.name,
          startedAt: game.startedAt,
          playerCount: todaysPlayers.filter(p => p.gameId === game._id).length,
        })),
        recentActivity: recentActivity.slice(0, 10),
      },
      lastUpdated: now,
    };
  },
});

// Helper function to calculate daily stats
async function getDailyStats(ctx: any, courseId: Id<"courses">, games: any[], orders: any[]) {
  const dailyStats = new Map();
  
  // Process games
  games.forEach(game => {
    const date = new Date(game.startedAt).toISOString().split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { date, games: 0, revenue: 0, orders: 0 });
    }
    dailyStats.get(date).games += 1;
  });
  
  // Process orders
  orders.forEach(order => {
    const date = new Date(order.timestamp).toISOString().split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { date, games: 0, revenue: 0, orders: 0 });
    }
    const stats = dailyStats.get(date);
    stats.revenue += order.totalAmount;
    stats.orders += 1;
  });
  
  return Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Helper function to calculate growth rate
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Generate automated report
export const generateAutomatedReport = mutation({
  args: {
    courseId: v.id("courses"),
    reportType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    recipientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // This would integrate with an email service
    // For now, we'll just create a report record
    
    const now = Date.now();
    let startDate: number;
    
    switch (args.reportType) {
      case "daily":
        startDate = now - (24 * 60 * 60 * 1000);
        break;
      case "weekly":
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Get analytics data for the period
    const analytics = await ctx.runQuery("analytics:getCourseAnalytics", {
      courseId: args.courseId,
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: new Date(now).toISOString().split('T')[0],
    });
    
    // In a real implementation, this would send an email
    // For now, we'll return the report data
    return {
      reportId: `${args.courseId}-${args.reportType}-${now}`,
      courseId: args.courseId,
      reportType: args.reportType,
      generatedAt: now,
      data: analytics,
      recipientEmail: args.recipientEmail,
      status: "generated",
    };
  },
});