import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate AI highlights for a game and player
export const generateHighlights = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Get game data
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    // Get player's scores
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get player's photos
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get player's F&B orders
    const orders = await ctx.db
      .query("foodOrders")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get player's social posts
    const socialPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Generate key moments
    const keyMoments = [];

    // Add scoring moments
    const bestScore = Math.min(...scores.map(s => s.strokes));
    const worstScore = Math.max(...scores.map(s => s.strokes));
    
    if (bestScore <= 3) {
      const bestScoreHole = scores.find(s => s.strokes === bestScore);
      keyMoments.push({
        type: "best_shot" as const,
        holeNumber: bestScoreHole?.holeNumber,
        description: `Amazing ${bestScore === 1 ? 'hole-in-one' : bestScore === 2 ? 'eagle' : 'birdie'} on hole ${bestScoreHole?.holeNumber}!`,
        timestamp: bestScoreHole?.timestamp || Date.now(),
      });
    }

    if (worstScore >= 8) {
      const worstScoreHole = scores.find(s => s.strokes === worstScore);
      keyMoments.push({
        type: "worst_shot" as const,
        holeNumber: worstScoreHole?.holeNumber,
        description: `Challenging hole ${worstScoreHole?.holeNumber} with ${worstScore} strokes - part of the golf journey!`,
        timestamp: worstScoreHole?.timestamp || Date.now(),
      });
    }

    // Add F&B order moments
    orders.forEach(order => {
      keyMoments.push({
        type: "order" as const,
        holeNumber: order.holeNumber,
        description: `Refueled with ${order.items.map(item => item.name).join(", ")} ${order.holeNumber ? `at hole ${order.holeNumber}` : "at the clubhouse"}`,
        timestamp: order.timestamp,
      });
    });

    // Add social moments
    const achievementPosts = socialPosts.filter(post => post.type === "achievement");
    achievementPosts.forEach(post => {
      keyMoments.push({
        type: "achievement" as const,
        description: post.content,
        timestamp: post.timestamp,
      });
    });

    // Add photo moments
    photos.forEach(photo => {
      keyMoments.push({
        type: "social_moment" as const,
        holeNumber: photo.holeNumber,
        description: photo.caption || `Great shot captured${photo.holeNumber ? ` on hole ${photo.holeNumber}` : ""}!`,
        timestamp: photo.timestamp,
        photoId: photo._id,
      });
    });

    // Sort moments by timestamp
    keyMoments.sort((a, b) => a.timestamp - b.timestamp);

    // Generate narrative
    const totalStrokes = scores.reduce((sum, score) => sum + score.strokes, 0);
    const holesPlayed = scores.length;
    const averageScore = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : "0";
    
    let narrative = `${player.name}'s round at ${game.name} was memorable! `;
    
    if (holesPlayed > 0) {
      narrative += `Playing ${holesPlayed} holes with an average of ${averageScore} strokes per hole. `;
    }
    
    if (orders.length > 0) {
      narrative += `Stayed fueled with ${orders.length} F&B order${orders.length !== 1 ? 's' : ''} throughout the round. `;
    }
    
    if (photos.length > 0) {
      narrative += `Captured ${photos.length} great moment${photos.length !== 1 ? 's' : ''} to remember. `;
    }
    
    if (keyMoments.some(m => m.type === "best_shot")) {
      narrative += `Had some outstanding shots that made the round special!`;
    } else {
      narrative += `Every round is a learning experience - looking forward to the next one!`;
    }

    // Generate captions for photos
    const captions = photos.map(photo => 
      photo.caption || `Great golf moment${photo.holeNumber ? ` on hole ${photo.holeNumber}` : ""}`
    );

    // Create or update highlights
    const existingHighlight = await ctx.db
      .query("highlights")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .first();

    const highlightData = {
      gameId: args.gameId,
      playerId: args.playerId,
      narrative,
      keyMoments,
      photoIds: photos.map(p => p._id),
      captions,
      generatedAt: Date.now(),
      viewCount: existingHighlight?.viewCount || 0,
      isPublic: true,
    };

    if (existingHighlight) {
      await ctx.db.patch(existingHighlight._id, highlightData);
      return existingHighlight._id;
    } else {
      return await ctx.db.insert("highlights", highlightData);
    }
  },
});

// Get highlights for a player in a game
export const getPlayerHighlights = query({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const highlight = await ctx.db
      .query("highlights")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .first();

    if (!highlight) return null;

    // Get associated photos
    const photos = await Promise.all(
      highlight.photoIds.map(photoId => ctx.db.get(photoId))
    );

    return {
      ...highlight,
      photos: photos.filter(photo => photo !== null),
    };
  },
});

// Get all highlights for a game
export const getGameHighlights = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const highlights = await ctx.db
      .query("highlights")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get player names and photos for each highlight
    const highlightsWithDetails = await Promise.all(
      highlights.map(async (highlight) => {
        const player = await ctx.db.get(highlight.playerId);
        const photos = await Promise.all(
          highlight.photoIds.map(photoId => ctx.db.get(photoId))
        );

        return {
          ...highlight,
          playerName: player?.name || "Unknown Player",
          photos: photos.filter(photo => photo !== null),
        };
      })
    );

    return highlightsWithDetails;
  },
});

// Increment view count for highlights
export const incrementViewCount = mutation({
  args: { highlightId: v.id("highlights") },
  handler: async (ctx, args) => {
    const highlight = await ctx.db.get(args.highlightId);
    if (!highlight) throw new Error("Highlight not found");

    await ctx.db.patch(args.highlightId, {
      viewCount: highlight.viewCount + 1,
    });

    return args.highlightId;
  },
});

// Update highlight sharing URL
export const updateShareableUrl = mutation({
  args: {
    highlightId: v.id("highlights"),
    shareableUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.highlightId, {
      shareableUrl: args.shareableUrl,
    });

    return args.highlightId;
  },
});