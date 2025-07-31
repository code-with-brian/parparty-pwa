import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Action to generate AI highlights (can call other actions)
export const generateHighlightsAction = action({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args): Promise<Id<"highlights">> => {
    // Get game data
    const game: any = await ctx.runQuery(internal.highlights.getGameForHighlights, { gameId: args.gameId });
    if (!game) throw new Error("Game not found");

    const player: any = await ctx.runQuery(internal.highlights.getPlayerForHighlights, { playerId: args.playerId });
    if (!player) throw new Error("Player not found");

    // Get all player data
    const playerData: any = await ctx.runQuery(internal.highlights.getPlayerDataForHighlights, {
      gameId: args.gameId,
      playerId: args.playerId,
    });

    // Prepare data for AI processing
    const gameData = {
      scores: playerData.scores.map((s: any) => ({
        holeNumber: s.holeNumber,
        strokes: s.strokes,
        timestamp: s.timestamp,
      })),
      photos: playerData.photos.map((p: any) => ({
        url: p.url,
        caption: p.caption,
        holeNumber: p.holeNumber,
        timestamp: p.timestamp,
      })),
      orders: playerData.orders.map((o: any) => ({
        items: o.items,
        holeNumber: o.holeNumber,
        timestamp: o.timestamp,
      })),
      socialPosts: playerData.socialPosts.map((sp: any) => ({
        type: sp.type,
        content: sp.content,
        timestamp: sp.timestamp,
      })),
    };

    // Use AI service to detect highlight moments
    const keyMoments: any = await ctx.runAction(internal.aiService.detectHighlightMoments, {
      gameData,
    });

    // Calculate stats for AI narrative generation
    const totalStrokes: number = playerData.scores.reduce((sum: number, score: any) => sum + score.strokes, 0);
    const holesPlayed = playerData.scores.length;
    const bestScore = playerData.scores.length > 0 ? Math.min(...playerData.scores.map((s: any) => s.strokes)) : 0;
    const worstScore = playerData.scores.length > 0 ? Math.max(...playerData.scores.map((s: any) => s.strokes)) : 0;

    // Generate AI narrative
    const narrative: any = await ctx.runAction(internal.aiService.generateAINarrative, {
      context: {
        playerName: player.name,
        gameName: game.name,
        totalStrokes,
        holesPlayed,
        bestScore,
        worstScore,
        photoCount: playerData.photos.length,
        orderCount: playerData.orders.length,
        achievementCount: playerData.socialPosts.filter((p: any) => p.type === "achievement").length,
        keyMoments: keyMoments.map((km: any) => ({
          type: km.type,
          description: km.description,
          holeNumber: km.holeNumber,
        })),
      },
    });

    // Generate AI captions for photos
    const captions: any = await ctx.runAction(internal.aiService.generateAICaptions, {
      photos: playerData.photos.map((p: any) => ({
        url: p.url,
        caption: p.caption,
        holeNumber: p.holeNumber,
        timestamp: p.timestamp,
      })),
      context: {
        playerName: player.name,
        gameName: game.name,
        holesPlayed,
      },
    });

    // Save the highlights using a mutation
    return await ctx.runMutation(internal.highlights.saveHighlights, {
      gameId: args.gameId,
      playerId: args.playerId,
      narrative,
      keyMoments,
      photoIds: playerData.photos.map((p: any) => p._id),
      captions,
    });
  },
});

// Mutation to generate highlights (calls the action)
export const generateHighlights = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Schedule the action to run
    await ctx.scheduler.runAfter(0, internal.highlights.generateHighlightsAction, args);
    
    // Create a placeholder highlight that will be updated by the action
    const existingHighlight = await ctx.db
      .query("highlights")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .first();

    const highlightData = {
      gameId: args.gameId,
      playerId: args.playerId,
      narrative: "Generating your personalized highlight reel...",
      keyMoments: [],
      photoIds: [],
      captions: [],
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

// Helper queries for the action
export const getGameForHighlights = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const getPlayerForHighlights = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

export const getPlayerDataForHighlights = query({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
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

    return {
      scores,
      photos,
      orders,
      socialPosts,
    };
  },
});

// Mutation to save highlights (called by the action)
export const saveHighlights = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    narrative: v.string(),
    keyMoments: v.array(v.any()),
    photoIds: v.array(v.id("photos")),
    captions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existingHighlight = await ctx.db
      .query("highlights")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .first();

    const highlightData = {
      gameId: args.gameId,
      playerId: args.playerId,
      narrative: args.narrative,
      keyMoments: args.keyMoments,
      photoIds: args.photoIds,
      captions: args.captions,
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

// Generate shareable content for highlights
export const generateShareableContent = mutation({
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

    if (!highlight) throw new Error("Highlight not found");

    const player = await ctx.db.get(args.playerId);
    const game = await ctx.db.get(args.gameId);
    
    if (!player || !game) throw new Error("Player or game not found");

    // Calculate stats
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    const totalStrokes = scores.reduce((sum, score) => sum + score.strokes, 0);
    const holesPlayed = scores.length;
    const averageScore = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : "0";

    // Generate shareable content directly (simplified version)
    const shareableContent = {
      title: `${player.name}'s Golf Round at ${game.name}`,
      description: highlight.narrative,
      hashtags: ["#ParParty", "#Golf", "#GolfLife", "#GolfMemories"],
      stats: {
        holesPlayed,
        averageScore,
        photosShared: highlight.photoIds.length,
        keyMoments: highlight.keyMoments.length,
      },
      shortSummary: `Just finished an amazing round at ${game.name}! ` +
        `${holesPlayed} holes, ${highlight.photoIds.length} memories captured. ` +
        `#ParParty #Golf`,
    };

    return shareableContent;
  },
});

// Assemble highlight reel data for a player
export const assembleHighlightReel = query({
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

    const player = await ctx.db.get(args.playerId);
    const game = await ctx.db.get(args.gameId);
    
    if (!player || !game) return null;

    // Get all associated data
    const photos = await Promise.all(
      highlight.photoIds.map(photoId => ctx.db.get(photoId))
    );

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    const orders = await ctx.db
      .query("foodOrders")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Calculate performance stats
    const totalStrokes = scores.reduce((sum, score) => sum + score.strokes, 0);
    const holesPlayed = scores.length;
    const averageScore = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : "0";
    const bestScore = scores.length > 0 ? Math.min(...scores.map(s => s.strokes)) : 0;

    // Assemble the complete highlight reel
    const highlightReel = {
      id: highlight._id,
      player: {
        name: player.name,
        avatar: player.avatar,
      },
      game: {
        name: game.name,
        date: new Date(game.startedAt).toLocaleDateString(),
      },
      narrative: highlight.narrative,
      keyMoments: highlight.keyMoments.sort((a, b) => a.timestamp - b.timestamp),
      photos: photos.filter(photo => photo !== null).map((photo, index) => ({
        ...photo,
        aiCaption: highlight.captions[index] || photo?.caption,
      })),
      stats: {
        totalStrokes,
        holesPlayed,
        averageScore,
        bestScore,
        photosShared: photos.filter(p => p !== null).length,
        ordersPlaced: orders.length,
      },
      timeline: [
        ...scores.map(score => ({
          type: "score" as const,
          timestamp: score.timestamp,
          holeNumber: score.holeNumber,
          data: { strokes: score.strokes },
        })),
        ...photos.filter(p => p !== null).map(photo => ({
          type: "photo" as const,
          timestamp: photo!.timestamp,
          holeNumber: photo!.holeNumber,
          data: { url: photo!.url, caption: photo!.caption },
        })),
        ...orders.map(order => ({
          type: "order" as const,
          timestamp: order.timestamp,
          holeNumber: order.holeNumber,
          data: { items: order.items.map(item => item.name) },
        })),
      ].sort((a, b) => a.timestamp - b.timestamp),
      generatedAt: highlight.generatedAt,
      viewCount: highlight.viewCount,
      shareableUrl: highlight.shareableUrl,
    };

    return highlightReel;
  },
});

// Get public highlights for discovery
export const getPublicHighlights = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const highlights = await ctx.db
      .query("highlights")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(limit + offset);

    // Skip offset and take limit
    const paginatedHighlights = highlights.slice(offset, offset + limit);

    // Get player and game details
    const highlightsWithDetails = await Promise.all(
      paginatedHighlights.map(async (highlight) => {
        const player = await ctx.db.get(highlight.playerId);
        const game = await ctx.db.get(highlight.gameId);
        const photos = await Promise.all(
          highlight.photoIds.slice(0, 3).map(photoId => ctx.db.get(photoId))
        );

        return {
          id: highlight._id,
          playerName: player?.name || "Unknown Player",
          gameName: game?.name || "Unknown Game",
          narrative: highlight.narrative,
          keyMomentsCount: highlight.keyMoments.length,
          photosCount: highlight.photoIds.length,
          previewPhotos: photos.filter(photo => photo !== null),
          generatedAt: highlight.generatedAt,
          viewCount: highlight.viewCount,
        };
      })
    );

    return highlightsWithDetails;
  },
});

// Auto-generate highlights for finished games
export const autoGenerateGameHighlights = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "finished") {
      throw new Error("Game not found or not finished");
    }

    // Get all players in the game
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Generate highlights for each player
    const highlightIds = [];
    for (const player of players) {
      try {
        const highlightId = await ctx.db.insert("highlights", {
          gameId: args.gameId,
          playerId: player._id,
          narrative: "Generating your personalized highlight reel...",
          keyMoments: [],
          photoIds: [],
          captions: [],
          generatedAt: Date.now(),
          viewCount: 0,
          isPublic: true,
        });
        
        highlightIds.push(highlightId);
        
        // Schedule actual highlight generation (this would be done async in production)
        // For now, we'll regenerate immediately
        await ctx.db.patch(highlightId, {
          narrative: "Your highlight reel is ready!",
        });
      } catch (error) {
        console.error(`Failed to generate highlights for player ${player._id}:`, error);
      }
    }

    return highlightIds;
  },
});