import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const createGame = mutation({
  args: {
    name: v.string(),
    createdBy: v.id("users"),
    courseId: v.optional(v.id("courses")),
    format: v.optional(v.union(v.literal("stroke"), v.literal("match"), v.literal("scramble"), v.literal("best_ball"))),
  },
  handler: async (ctx, args) => {
    // Validate name
    if (!args.name || args.name.length < 1 || args.name.length > 100) {
      throw new ConvexError("Game name must be between 1 and 100 characters");
    }

    try {
      const gameId = await ctx.db.insert("games", {
        name: args.name,
        createdBy: args.createdBy,
        courseId: args.courseId,
        startedAt: Date.now(),
        status: "waiting",
        format: args.format || "stroke",
        metadata: {
          eventType: "casual",
        },
      });

      return gameId;
    } catch (error) {
      console.error("Error creating game:", error);
      throw new ConvexError("Failed to create game");
    }
  },
});

export const getGameData = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      // Get game data
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      // Get players
      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Get scores for all players
      const scores = await ctx.db
        .query("scores")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Get photos
      const photos = await ctx.db
        .query("photos")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Get social posts
      const socialPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .order("desc")
        .take(50); // Limit to recent posts

      return {
        game,
        players,
        scores,
        photos,
        socialPosts,
      };
    } catch (error) {
      console.error("Error getting game data:", error);
      throw new ConvexError("Failed to get game data");
    }
  },
});

export const validateGameId = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      
      if (!game) {
        return { valid: false, reason: "Game not found" };
      }

      // Check if game is still joinable
      if (game.status === "finished") {
        return { valid: false, reason: "Game has already finished" };
      }

      return { 
        valid: true, 
        game: {
          id: game._id,
          name: game.name,
          status: game.status,
          format: game.format,
          startedAt: game.startedAt,
          playerCount: await ctx.db
            .query("players")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect()
            .then(players => players.length),
        }
      };
    } catch (error) {
      console.error("Error validating game ID:", error);
      return { valid: false, reason: "Validation error" };
    }
  },
});

export const updateGameStatus = mutation({
  args: {
    gameId: v.id("games"),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("finished")),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      await ctx.db.patch(args.gameId, { 
        status: args.status,
        ...(args.status === "finished" && { endedAt: Date.now() })
      });

      return args.gameId;
    } catch (error) {
      console.error("Error updating game status:", error);
      throw new ConvexError("Failed to update game status");
    }
  },
});

export const getGamePreview = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        return null;
      }

      // Get player count
      const playerCount = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect()
        .then(players => players.length);

      // Get course info if available
      let courseInfo = null;
      if (game.courseId) {
        courseInfo = await ctx.db.get(game.courseId);
      }

      return {
        id: game._id,
        name: game.name,
        status: game.status,
        format: game.format,
        startedAt: game.startedAt,
        playerCount,
        course: courseInfo ? {
          name: courseInfo.name,
          address: courseInfo.address,
        } : null,
        canJoin: game.status !== "finished",
      };
    } catch (error) {
      console.error("Error getting game preview:", error);
      return null;
    }
  },
});