import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Helper function to check if a user profile should be visible to the requesting user
const canViewProfile = async (
  ctx: any,
  targetUserId: Id<"users">,
  requestingUserId?: Id<"users">
) => {
  // Get target user's privacy settings
  const targetSettings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", targetUserId))
    .first();

  if (!targetSettings) {
    // No privacy settings found, default to public visibility
    return { canView: true, showStats: true, showAchievements: true };
  }

  // Public profiles are always visible
  if (targetSettings.profileVisibility === "public") {
    return {
      canView: true,
      showStats: targetSettings.statsVisible,
      showAchievements: targetSettings.achievementsVisible,
    };
  }

  // Private profiles are only visible to the owner
  if (targetSettings.profileVisibility === "private") {
    const isOwner = targetUserId === requestingUserId;
    return {
      canView: isOwner,
      showStats: isOwner ? targetSettings.statsVisible : false,
      showAchievements: isOwner ? targetSettings.achievementsVisible : false,
    };
  }

  // Friends-only profiles
  if (targetSettings.profileVisibility === "friends") {
    if (!requestingUserId) {
      return { canView: false, showStats: false, showAchievements: false };
    }
    
    if (targetUserId === requestingUserId) {
      return {
        canView: true,
        showStats: targetSettings.statsVisible,
        showAchievements: targetSettings.achievementsVisible,
      };
    }

    // TODO: Implement friend relationship check
    // For now, treat as public since we don't have a friends system yet
    return {
      canView: true,
      showStats: targetSettings.statsVisible,
      showAchievements: targetSettings.achievementsVisible,
    };
  }

  return { canView: false, showStats: false, showAchievements: false };
};

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
        .first();

      if (existingUser) {
        return existingUser._id;
      }

      // Create new user
      const userId = await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        tokenIdentifier: args.tokenIdentifier,
        image: args.image,
      });

      return userId;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new ConvexError("Failed to create user");
    }
  },
});

export const getByToken = query({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
        .first();

      return user;
    } catch (error) {
      console.error("Error getting user by token:", error);
      throw new ConvexError("Failed to get user");
    }
  },
});

// Store/update user (alias for create for compatibility)
export const store = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await create(ctx, args);
  },
});

// Create a test user for development
export const createTestUser = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const tokenIdentifier = `test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      const userId = await ctx.db.insert("users", {
        name: args.name,
        tokenIdentifier,
      });

      return userId;
    } catch (error) {
      console.error("Error creating test user:", error);
      throw new ConvexError("Failed to create test user");
    }
  },
});

// Get user profile with privacy controls
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return null;
      }

      const visibility = await canViewProfile(ctx, args.userId, args.requestingUserId);
      
      if (!visibility.canView) {
        return null; // User profile is private and requester can't view it
      }

      // Return user data with privacy controls applied
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        // Only include stats and achievements if allowed by privacy settings
        showStats: visibility.showStats,
        showAchievements: visibility.showAchievements,
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw new ConvexError("Failed to get user profile");
    }
  },
});

// Get multiple user profiles (useful for leaderboards, game participants, etc.)
export const getMultipleUserProfiles = query({
  args: {
    userIds: v.array(v.id("users")),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    try {
      const profiles = await Promise.all(
        args.userIds.map(async (userId) => {
          const user = await ctx.db.get(userId);
          if (!user) return null;

          const visibility = await canViewProfile(ctx, userId, args.requestingUserId);
          
          if (!visibility.canView) {
            return {
              _id: userId,
              name: "Private User",
              isPrivate: true,
              showStats: false,
              showAchievements: false,
            };
          }

          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            showStats: visibility.showStats,
            showAchievements: visibility.showAchievements,
            isPrivate: false,
          };
        })
      );

      return profiles.filter(Boolean);
    } catch (error) {
      console.error("Error getting multiple user profiles:", error);
      throw new ConvexError("Failed to get user profiles");
    }
  },
});