import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Upload a photo
export const uploadPhoto = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    url: v.string(),
    caption: v.optional(v.string()),
    holeNumber: v.optional(v.number()),
    gpsLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    try {
      // Validate game exists
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      // Validate player exists and is in the game
      const player = await ctx.db.get(args.playerId);
      if (!player || player.gameId !== args.gameId) {
        throw new ConvexError("Player not found or not in this game");
      }

      // Validate URL
      if (!args.url || args.url.length > 1000) {
        throw new ConvexError("Invalid photo URL");
      }

      // Validate caption if provided
      if (args.caption && args.caption.length > 200) {
        throw new ConvexError("Caption must be 200 characters or less");
      }

      // Validate hole number if provided
      if (args.holeNumber && (args.holeNumber < 1 || args.holeNumber > 18)) {
        throw new ConvexError("Hole number must be between 1 and 18");
      }

      const photoId = await ctx.db.insert("photos", {
        playerId: args.playerId,
        gameId: args.gameId,
        url: args.url,
        caption: args.caption,
        holeNumber: args.holeNumber,
        timestamp: Date.now(),
        gpsLocation: args.gpsLocation,
      });

      return photoId;
    } catch (error) {
      console.error("Error uploading photo:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to upload photo");
    }
  },
});

// Get photos for a game
export const getGamePhotos = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 50;

      const photos = await ctx.db
        .query("photos")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .order("desc")
        .take(limit);

      // Get player details for each photo
      const photosWithPlayers = await Promise.all(
        photos.map(async (photo) => {
          const player = await ctx.db.get(photo.playerId);
          return {
            ...photo,
            player,
          };
        })
      );

      return photosWithPlayers;
    } catch (error) {
      console.error("Error getting game photos:", error);
      throw new ConvexError("Failed to get game photos");
    }
  },
});

// Get photos for a specific player
export const getPlayerPhotos = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;

      const photos = await ctx.db
        .query("photos")
        .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
        .order("desc")
        .take(limit);

      return photos;
    } catch (error) {
      console.error("Error getting player photos:", error);
      throw new ConvexError("Failed to get player photos");
    }
  },
});

// Get photos for a specific hole in a game
export const getHolePhotos = query({
  args: {
    gameId: v.id("games"),
    holeNumber: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate hole number
      if (args.holeNumber < 1 || args.holeNumber > 18) {
        throw new ConvexError("Hole number must be between 1 and 18");
      }

      const photos = await ctx.db
        .query("photos")
        .withIndex("by_game_hole", (q) => 
          q.eq("gameId", args.gameId).eq("holeNumber", args.holeNumber)
        )
        .order("desc")
        .collect();

      // Get player details for each photo
      const photosWithPlayers = await Promise.all(
        photos.map(async (photo) => {
          const player = await ctx.db.get(photo.playerId);
          return {
            ...photo,
            player,
          };
        })
      );

      return photosWithPlayers;
    } catch (error) {
      console.error("Error getting hole photos:", error);
      throw new ConvexError("Failed to get hole photos");
    }
  },
});

// Update photo caption
export const updatePhotoCaption = mutation({
  args: {
    photoId: v.id("photos"),
    playerId: v.id("players"),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const photo = await ctx.db.get(args.photoId);
      if (!photo) {
        throw new ConvexError("Photo not found");
      }

      // Only the photo owner can update the caption
      if (photo.playerId !== args.playerId) {
        throw new ConvexError("You can only edit your own photos");
      }

      // Validate caption
      if (args.caption.length > 200) {
        throw new ConvexError("Caption must be 200 characters or less");
      }

      await ctx.db.patch(args.photoId, { caption: args.caption });

      return { success: true };
    } catch (error) {
      console.error("Error updating photo caption:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to update photo caption");
    }
  },
});

// Delete a photo
export const deletePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const photo = await ctx.db.get(args.photoId);
      if (!photo) {
        throw new ConvexError("Photo not found");
      }

      // Only the photo owner can delete it
      if (photo.playerId !== args.playerId) {
        throw new ConvexError("You can only delete your own photos");
      }

      // Delete associated social posts
      const socialPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_game", (q) => q.eq("gameId", photo.gameId))
        .filter((q) => q.eq(q.field("type"), "photo"))
        .collect();

      for (const post of socialPosts) {
        if (post.mediaIds?.includes(args.photoId)) {
          // Remove photo from media IDs or delete post if it's the only media
          const updatedMediaIds = post.mediaIds.filter(id => id !== args.photoId);
          if (updatedMediaIds.length === 0) {
            await ctx.db.delete(post._id);
          } else {
            await ctx.db.patch(post._id, { mediaIds: updatedMediaIds });
          }
        }
      }

      await ctx.db.delete(args.photoId);

      return { success: true };
    } catch (error) {
      console.error("Error deleting photo:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to delete photo");
    }
  },
});

// Get photo details with metadata
export const getPhotoDetails = query({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    try {
      const photo = await ctx.db.get(args.photoId);
      if (!photo) {
        return null;
      }

      // Get player details
      const player = await ctx.db.get(photo.playerId);

      // Get game details
      const game = await ctx.db.get(photo.gameId);

      // Get associated social posts
      const socialPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_game", (q) => q.eq("gameId", photo.gameId))
        .filter((q) => q.eq(q.field("type"), "photo"))
        .collect();

      const associatedPosts = socialPosts.filter(post => 
        post.mediaIds?.includes(args.photoId)
      );

      return {
        ...photo,
        player,
        game,
        associatedPosts,
      };
    } catch (error) {
      console.error("Error getting photo details:", error);
      throw new ConvexError("Failed to get photo details");
    }
  },
});