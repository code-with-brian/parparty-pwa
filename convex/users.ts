import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

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