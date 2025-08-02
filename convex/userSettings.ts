import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Default settings for new users
const DEFAULT_SETTINGS = {
  // Appearance settings
  theme: "dark" as const,
  accentColor: "cyan",
  fontSize: "medium" as const,
  animationLevel: "full" as const,
  soundEffects: true,
  compactMode: false,
  showAnimatedBackgrounds: true,
  highContrast: false,
  // Privacy settings
  profileVisibility: "public" as const,
  gameActivity: "friends" as const,
  statsVisible: true,
  achievementsVisible: true,
  allowFriendRequests: true,
  allowGameInvites: true,
  showOnlineStatus: true,
  dataSharing: false,
  // Notification preferences
  pushNotificationsEnabled: true,
  notificationTypes: {
    gameUpdates: true,
    socialActivity: true,
    achievements: true,
    marketing: false,
  },
};

// Get user settings with fallback to defaults
export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      return DEFAULT_SETTINGS;
    }

    return {
      theme: settings.theme,
      accentColor: settings.accentColor,
      fontSize: settings.fontSize,
      animationLevel: settings.animationLevel,
      soundEffects: settings.soundEffects,
      compactMode: settings.compactMode,
      showAnimatedBackgrounds: settings.showAnimatedBackgrounds,
      highContrast: settings.highContrast,
      profileVisibility: settings.profileVisibility,
      gameActivity: settings.gameActivity,
      statsVisible: settings.statsVisible,
      achievementsVisible: settings.achievementsVisible,
      allowFriendRequests: settings.allowFriendRequests,
      allowGameInvites: settings.allowGameInvites,
      showOnlineStatus: settings.showOnlineStatus,
      dataSharing: settings.dataSharing,
      pushNotificationsEnabled: settings.pushNotificationsEnabled,
      notificationTypes: settings.notificationTypes,
    };
  },
});

// Update appearance settings
export const updateAppearanceSettings = mutation({
  args: {
    userId: v.id("users"),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    accentColor: v.optional(v.string()),
    fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    animationLevel: v.optional(v.union(v.literal("none"), v.literal("reduced"), v.literal("full"))),
    soundEffects: v.optional(v.boolean()),
    compactMode: v.optional(v.boolean()),
    showAnimatedBackgrounds: v.optional(v.boolean()),
    highContrast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Check if settings exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new settings with defaults + updates
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULT_SETTINGS,
        ...updates,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Update privacy settings
export const updatePrivacySettings = mutation({
  args: {
    userId: v.id("users"),
    profileVisibility: v.optional(v.union(v.literal("public"), v.literal("friends"), v.literal("private"))),
    gameActivity: v.optional(v.union(v.literal("public"), v.literal("friends"), v.literal("private"))),
    statsVisible: v.optional(v.boolean()),
    achievementsVisible: v.optional(v.boolean()),
    allowFriendRequests: v.optional(v.boolean()),
    allowGameInvites: v.optional(v.boolean()),
    showOnlineStatus: v.optional(v.boolean()),
    dataSharing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Check if settings exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new settings with defaults + updates
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULT_SETTINGS,
        ...updates,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Update notification settings
export const updateNotificationSettings = mutation({
  args: {
    userId: v.id("users"),
    pushNotificationsEnabled: v.optional(v.boolean()),
    notificationTypes: v.optional(v.object({
      gameUpdates: v.boolean(),
      socialActivity: v.boolean(),
      achievements: v.boolean(),
      marketing: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Check if settings exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new settings with defaults + updates
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULT_SETTINGS,
        ...updates,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Bulk update all settings at once
export const updateAllSettings = mutation({
  args: {
    userId: v.id("users"),
    // Appearance settings
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    accentColor: v.optional(v.string()),
    fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    animationLevel: v.optional(v.union(v.literal("none"), v.literal("reduced"), v.literal("full"))),
    soundEffects: v.optional(v.boolean()),
    compactMode: v.optional(v.boolean()),
    showAnimatedBackgrounds: v.optional(v.boolean()),
    highContrast: v.optional(v.boolean()),
    // Privacy settings
    profileVisibility: v.optional(v.union(v.literal("public"), v.literal("friends"), v.literal("private"))),
    gameActivity: v.optional(v.union(v.literal("public"), v.literal("friends"), v.literal("private"))),
    statsVisible: v.optional(v.boolean()),
    achievementsVisible: v.optional(v.boolean()),
    allowFriendRequests: v.optional(v.boolean()),
    allowGameInvites: v.optional(v.boolean()),
    showOnlineStatus: v.optional(v.boolean()),
    dataSharing: v.optional(v.boolean()),
    // Notification preferences
    pushNotificationsEnabled: v.optional(v.boolean()),
    notificationTypes: v.optional(v.object({
      gameUpdates: v.boolean(),
      socialActivity: v.boolean(),
      achievements: v.boolean(),
      marketing: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Check if settings exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new settings with defaults + updates
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULT_SETTINGS,
        ...updates,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Reset settings to defaults
export const resetSettingsToDefaults = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings to defaults
      await ctx.db.patch(existingSettings._id, {
        ...DEFAULT_SETTINGS,
        updatedAt: now,
      });
    } else {
      // Create new settings with defaults
      await ctx.db.insert("userSettings", {
        userId: args.userId,
        ...DEFAULT_SETTINGS,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get settings for multiple users (useful for privacy checks)
export const getMultipleUserSettings = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const settingsMap = new Map();
    
    for (const userId of args.userIds) {
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
        
      settingsMap.set(userId, settings || DEFAULT_SETTINGS);
    }
    
    return Object.fromEntries(settingsMap);
  },
});