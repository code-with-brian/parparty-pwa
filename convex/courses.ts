import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new course
export const createCourse = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    partnershipLevel: v.union(v.literal("basic"), v.literal("premium"), v.literal("enterprise")),
    revenueShare: v.number(),
  },
  handler: async (ctx, args) => {
    const courseId = await ctx.db.insert("courses", {
      ...args,
      qrCodes: [],
      analytics: {
        totalGames: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        lastUpdated: Date.now(),
      },
      isActive: true,
      createdAt: Date.now(),
    });

    return courseId;
  },
});

// Get course by ID
export const getCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.courseId);
  },
});

// Get all active courses
export const getActiveCourses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("courses")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get courses by city/state for discovery
export const getCoursesByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query("courses").withIndex("by_active", (q) => q.eq("isActive", true));
    
    const courses = await query.collect();
    
    return courses.filter(course => {
      if (args.city && course.city !== args.city) return false;
      if (args.state && course.state !== args.state) return false;
      return true;
    });
  },
});

// Generate QR code for course location
export const generateQRCode = mutation({
  args: {
    courseId: v.id("courses"),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    const qrCode = {
      location: args.location,
      code: `parparty://course/${args.courseId}?location=${args.location}&timestamp=${Date.now()}`,
      isActive: true,
    };

    const existingQRCodes = course.qrCodes || [];
    const updatedQRCodes = [...existingQRCodes, qrCode];

    await ctx.db.patch(args.courseId, {
      qrCodes: updatedQRCodes,
    });

    return qrCode;
  },
});

// Get live events/games at a course
export const getCourseEvents = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const activeGames = await ctx.db
      .query("games")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.neq(q.field("status"), "finished"))
      .collect();

    const recentFinishedGames = await ctx.db
      .query("games")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("status"), "finished"))
      .order("desc")
      .take(10);

    return {
      activeGames,
      recentFinishedGames,
      totalActiveGames: activeGames.length,
    };
  },
});

// Update course analytics
export const updateCourseAnalytics = mutation({
  args: {
    courseId: v.id("courses"),
    gameCompleted: v.optional(v.boolean()),
    orderValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    const currentAnalytics = course.analytics || {
      totalGames: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      lastUpdated: Date.now(),
    };

    const updatedAnalytics = { ...currentAnalytics };

    if (args.gameCompleted) {
      updatedAnalytics.totalGames += 1;
    }

    if (args.orderValue) {
      updatedAnalytics.totalRevenue += args.orderValue;
      updatedAnalytics.averageOrderValue = 
        updatedAnalytics.totalRevenue / Math.max(updatedAnalytics.totalGames, 1);
    }

    updatedAnalytics.lastUpdated = Date.now();

    await ctx.db.patch(args.courseId, {
      analytics: updatedAnalytics,
    });

    return updatedAnalytics;
  },
});

// Get course guestbook (recent social activity)
export const getCourseGuestbook = query({
  args: { 
    courseId: v.id("courses"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get recent games at this course
    const recentGames = await ctx.db
      .query("games")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .take(50);

    const gameIds = recentGames.map(game => game._id);
    
    // Get social posts from these games
    const socialPosts = [];
    for (const gameId of gameIds) {
      const posts = await ctx.db
        .query("socialPosts")
        .withIndex("by_game_timestamp", (q) => q.eq("gameId", gameId))
        .order("desc")
        .take(5);
      socialPosts.push(...posts);
    }

    // Sort by timestamp and limit
    const sortedPosts = socialPosts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Enrich with player and game data
    const enrichedPosts = await Promise.all(
      sortedPosts.map(async (post) => {
        const player = await ctx.db.get(post.playerId);
        const game = await ctx.db.get(post.gameId);
        return {
          ...post,
          player,
          game,
        };
      })
    );

    return enrichedPosts;
  },
});