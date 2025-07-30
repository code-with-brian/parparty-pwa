import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const createGuestSession = mutation({
  args: {
    deviceId: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate deviceId format
    if (!args.deviceId || args.deviceId.length < 10) {
      throw new ConvexError("Invalid device ID format");
    }

    // Validate name if provided
    if (args.name && (args.name.length < 1 || args.name.length > 50)) {
      throw new ConvexError("Name must be between 1 and 50 characters");
    }

    try {
      // Check if guest session already exists for this device
      const existingGuest = await ctx.db
        .query("guests")
        .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
        .first();

      if (existingGuest) {
        // Update name if provided and different
        if (args.name && args.name !== existingGuest.name) {
          await ctx.db.patch(existingGuest._id, { name: args.name });
        }
        return existingGuest._id;
      }

      // Create new guest session
      const guestId = await ctx.db.insert("guests", {
        deviceId: args.deviceId,
        name: args.name,
        createdAt: Date.now(),
      });

      return guestId;
    } catch (error) {
      console.error("Error creating guest session:", error);
      throw new ConvexError("Failed to create guest session");
    }
  },
});

export const resumeSession = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate deviceId format
    if (!args.deviceId || args.deviceId.length < 10) {
      throw new ConvexError("Invalid device ID format");
    }

    try {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
        .first();

      return guest;
    } catch (error) {
      console.error("Error resuming guest session:", error);
      throw new ConvexError("Failed to resume guest session");
    }
  },
});

export const updateGuestName = mutation({
  args: {
    guestId: v.id("guests"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate name
    if (!args.name || args.name.length < 1 || args.name.length > 50) {
      throw new ConvexError("Name must be between 1 and 50 characters");
    }

    try {
      // Check if guest exists
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        throw new ConvexError("Guest session not found");
      }

      // Update the name
      await ctx.db.patch(args.guestId, { name: args.name });
      
      return args.guestId;
    } catch (error) {
      console.error("Error updating guest name:", error);
      throw new ConvexError("Failed to update guest name");
    }
  },
});

export const validateGuestSession = query({
  args: {
    guestId: v.id("guests"),
  },
  handler: async (ctx, args) => {
    try {
      const guest = await ctx.db.get(args.guestId);
      
      if (!guest) {
        return { valid: false, reason: "Guest session not found" };
      }

      // Check if session is not too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const sessionAge = Date.now() - guest.createdAt;
      
      if (sessionAge > maxAge) {
        return { valid: false, reason: "Guest session expired" };
      }

      return { valid: true, guest };
    } catch (error) {
      console.error("Error validating guest session:", error);
      return { valid: false, reason: "Validation error" };
    }
  },
});

export const joinGameAsGuest = mutation({
  args: {
    gameId: v.id("games"),
    guestId: v.id("guests"),
  },
  handler: async (ctx, args) => {
    try {
      // Validate guest exists
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        throw new ConvexError("Guest session not found");
      }

      // Validate game exists
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      // Check if guest is already in this game
      const existingPlayer = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .filter((q) => q.eq(q.field("guestId"), args.guestId))
        .first();

      if (existingPlayer) {
        return existingPlayer._id;
      }

      // Get current player count to set position
      const playerCount = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect()
        .then(players => players.length);

      // Create player entry
      const playerId = await ctx.db.insert("players", {
        gameId: args.gameId,
        name: guest.name || "Guest Player",
        guestId: args.guestId,
        position: playerCount + 1,
      });

      return playerId;
    } catch (error) {
      console.error("Error joining game as guest:", error);
      throw new ConvexError("Failed to join game as guest");
    }
  },
});