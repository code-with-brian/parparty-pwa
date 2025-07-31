import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Create a social post
export const createSocialPost = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    type: v.union(
      v.literal("score"),
      v.literal("photo"),
      v.literal("achievement"),
      v.literal("order"),
      v.literal("custom")
    ),
    content: v.string(),
    mediaIds: v.optional(v.array(v.id("photos"))),
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

      // Validate content
      if (!args.content || args.content.length > 500) {
        throw new ConvexError("Content must be between 1 and 500 characters");
      }

      // Validate media IDs if provided
      if (args.mediaIds) {
        for (const mediaId of args.mediaIds) {
          const photo = await ctx.db.get(mediaId);
          if (!photo || photo.gameId !== args.gameId) {
            throw new ConvexError("Invalid media ID or media not from this game");
          }
        }
      }

      const postId = await ctx.db.insert("socialPosts", {
        gameId: args.gameId,
        playerId: args.playerId,
        type: args.type,
        content: args.content,
        mediaIds: args.mediaIds,
        timestamp: Date.now(),
        reactions: [],
      });

      return postId;
    } catch (error) {
      console.error("Error creating social post:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to create social post");
    }
  },
});

// Get social posts for a game (real-time feed)
export const getGameSocialFeed = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 50;

      const posts = await ctx.db
        .query("socialPosts")
        .withIndex("by_game_timestamp", (q) => q.eq("gameId", args.gameId))
        .order("desc")
        .take(limit);

      // Get player and media details for each post
      const postsWithDetails = await Promise.all(
        posts.map(async (post) => {
          const player = await ctx.db.get(post.playerId);
          
          let mediaDetails: any[] = [];
          if (post.mediaIds) {
            mediaDetails = await Promise.all(
              post.mediaIds.map(async (mediaId) => {
                return await ctx.db.get(mediaId);
              })
            );
          }

          return {
            ...post,
            player,
            media: mediaDetails.filter(Boolean),
          };
        })
      );

      return postsWithDetails;
    } catch (error) {
      console.error("Error getting social feed:", error);
      throw new ConvexError("Failed to get social feed");
    }
  },
});

// Add reaction to a social post
export const addReaction = mutation({
  args: {
    postId: v.id("socialPosts"),
    playerId: v.id("players"),
    reactionType: v.union(v.literal("like"), v.literal("love"), v.literal("laugh"), v.literal("wow")),
  },
  handler: async (ctx, args) => {
    try {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }

      // Validate player exists and is in the same game
      const player = await ctx.db.get(args.playerId);
      if (!player || player.gameId !== post.gameId) {
        throw new ConvexError("Player not found or not in this game");
      }

      const reactions = post.reactions || [];
      
      // Check if player already reacted
      const existingReactionIndex = reactions.findIndex(r => r.playerId === args.playerId);
      
      if (existingReactionIndex >= 0) {
        // Update existing reaction
        reactions[existingReactionIndex] = {
          playerId: args.playerId,
          type: args.reactionType,
          timestamp: Date.now(),
        };
      } else {
        // Add new reaction
        reactions.push({
          playerId: args.playerId,
          type: args.reactionType,
          timestamp: Date.now(),
        });
      }

      await ctx.db.patch(args.postId, { reactions });

      return { success: true };
    } catch (error) {
      console.error("Error adding reaction:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to add reaction");
    }
  },
});

// Remove reaction from a social post
export const removeReaction = mutation({
  args: {
    postId: v.id("socialPosts"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }

      // Validate player exists and is in the same game
      const player = await ctx.db.get(args.playerId);
      if (!player || player.gameId !== post.gameId) {
        throw new ConvexError("Player not found or not in this game");
      }

      const reactions = (post.reactions || []).filter(r => r.playerId !== args.playerId);

      await ctx.db.patch(args.postId, { reactions });

      return { success: true };
    } catch (error) {
      console.error("Error removing reaction:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to remove reaction");
    }
  },
});

// Auto-create social posts for achievements and notable moments
export const createAchievementPost = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    achievementType: v.union(
      v.literal("hole_in_one"),
      v.literal("eagle"),
      v.literal("birdie"),
      v.literal("first_score"),
      v.literal("best_hole"),
      v.literal("worst_hole"),
      v.literal("round_complete")
    ),
    holeNumber: v.optional(v.number()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate game and player
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      const player = await ctx.db.get(args.playerId);
      if (!player || player.gameId !== args.gameId) {
        throw new ConvexError("Player not found or not in this game");
      }

      // Generate achievement content based on type
      let content = "";
      switch (args.achievementType) {
        case "hole_in_one":
          content = `🏌️‍♂️ HOLE IN ONE! ${player.name} just aced hole ${args.holeNumber}! 🎉`;
          break;
        case "eagle":
          content = `🦅 Eagle! ${player.name} scored ${args.score} on hole ${args.holeNumber}!`;
          break;
        case "birdie":
          content = `🐦 Birdie! ${player.name} scored ${args.score} on hole ${args.holeNumber}!`;
          break;
        case "first_score":
          content = `⛳ ${player.name} just recorded their first score of the round!`;
          break;
        case "best_hole":
          content = `🔥 ${player.name} just had their best hole with ${args.score} strokes on hole ${args.holeNumber}!`;
          break;
        case "worst_hole":
          content = `😅 ${player.name} had a tough hole ${args.holeNumber} with ${args.score} strokes - happens to the best of us!`;
          break;
        case "round_complete":
          content = `🏁 ${player.name} just finished their round! Great job out there!`;
          break;
        default:
          content = `🎯 ${player.name} achieved something special!`;
      }

      const postId = await ctx.db.insert("socialPosts", {
        gameId: args.gameId,
        playerId: args.playerId,
        type: "achievement",
        content,
        timestamp: Date.now(),
        reactions: [],
      });

      return postId;
    } catch (error) {
      console.error("Error creating achievement post:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to create achievement post");
    }
  },
});

// Create social post for photo sharing
export const createPhotoPost = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    photoId: v.id("photos"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate photo exists and belongs to the game
      const photo = await ctx.db.get(args.photoId);
      if (!photo || photo.gameId !== args.gameId) {
        throw new ConvexError("Photo not found or not from this game");
      }

      // Validate player
      const player = await ctx.db.get(args.playerId);
      if (!player || player.gameId !== args.gameId) {
        throw new ConvexError("Player not found or not in this game");
      }

      const content = args.caption || `${player.name} shared a photo from the round!`;

      const postId = await ctx.db.insert("socialPosts", {
        gameId: args.gameId,
        playerId: args.playerId,
        type: "photo",
        content,
        mediaIds: [args.photoId],
        timestamp: Date.now(),
        reactions: [],
      });

      return postId;
    } catch (error) {
      console.error("Error creating photo post:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to create photo post");
    }
  },
});

// Delete a social post (only by the author)
export const deleteSocialPost = mutation({
  args: {
    postId: v.id("socialPosts"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }

      // Only the author can delete their post
      if (post.playerId !== args.playerId) {
        throw new ConvexError("You can only delete your own posts");
      }

      await ctx.db.delete(args.postId);

      return { success: true };
    } catch (error) {
      console.error("Error deleting social post:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to delete social post");
    }
  },
});

// Get reaction summary for a post
export const getPostReactions = query({
  args: {
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    try {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }

      const reactions = post.reactions || [];
      
      // Group reactions by type
      const reactionCounts = reactions.reduce((acc, reaction) => {
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get player details for reactions
      const reactionsWithPlayers = await Promise.all(
        reactions.map(async (reaction) => {
          const player = await ctx.db.get(reaction.playerId);
          return {
            ...reaction,
            player,
          };
        })
      );

      return {
        counts: reactionCounts,
        total: reactions.length,
        reactions: reactionsWithPlayers,
      };
    } catch (error) {
      console.error("Error getting post reactions:", error);
      throw new ConvexError("Failed to get post reactions");
    }
  },
});

// Alias for createSocialPost for compatibility
export const createPost = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    type: v.union(
      v.literal("score"),
      v.literal("photo"),
      v.literal("achievement"),
      v.literal("order"),
      v.literal("custom")
    ),
    content: v.string(),
    mediaIds: v.optional(v.array(v.id("photos"))),
  },
  handler: async (ctx, args) => {
    return await createSocialPost(ctx, args);
  },
});