import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Helper function to create social posts for notable scores
async function createScoreSocialPost(ctx: any, args: {
  gameId: any;
  playerId: any;
  holeNumber: number;
  strokes: number;
  playerName: string;
}) {
  try {
    let shouldCreatePost = false;
    let content = "";
    let postType: "score" | "achievement" = "score";

    // Determine if this score is notable enough for a social post
    if (args.strokes === 1) {
      // Hole in one
      content = `🏌️‍♂️ HOLE IN ONE! ${args.playerName} just aced hole ${args.holeNumber}! 🎉`;
      postType = "achievement";
      shouldCreatePost = true;
    } else if (args.strokes === 2) {
      // Eagle (assuming par 4)
      content = `🦅 Eagle! ${args.playerName} scored ${args.strokes} on hole ${args.holeNumber}!`;
      postType = "achievement";
      shouldCreatePost = true;
    } else if (args.strokes === 3) {
      // Birdie (assuming par 4)
      content = `🐦 Birdie! ${args.playerName} scored ${args.strokes} on hole ${args.holeNumber}!`;
      postType = "achievement";
      shouldCreatePost = true;
    } else {
      // Check if this is the player's first score
      const playerScores = await ctx.db
        .query("scores")
        .withIndex("by_player", (q: any) => q.eq("playerId", args.playerId))
        .collect();
      
      if (playerScores.length === 1) {
        // This is their first score
        content = `⛳ ${args.playerName} just recorded their first score of the round!`;
        postType = "score";
        shouldCreatePost = true;
      }
    }

    if (shouldCreatePost) {
      await ctx.db.insert("socialPosts", {
        gameId: args.gameId,
        playerId: args.playerId,
        type: postType,
        content,
        timestamp: Date.now(),
        reactions: [],
      });
    }
  } catch (error) {
    // Don't throw errors for social post creation - it's not critical
    console.error("Error creating score social post:", error);
  }
}

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

// Real-time game state synchronization query
export const getGameState = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      // Get players with their latest scores
      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Get all scores for the game
      const scores = await ctx.db
        .query("scores")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Calculate current standings
      const playerStandings = players.map(player => {
        const playerScores = scores.filter(score => score.playerId === player._id);
        const totalStrokes = playerScores.reduce((sum, score) => sum + score.strokes, 0);
        const holesPlayed = playerScores.length;
        
        return {
          ...player,
          totalStrokes,
          holesPlayed,
          currentPosition: 0, // Will be calculated below
        };
      }).sort((a, b) => {
        // Sort by total strokes (lower is better), then by holes played (more is better)
        if (a.totalStrokes !== b.totalStrokes) {
          return a.totalStrokes - b.totalStrokes;
        }
        return b.holesPlayed - a.holesPlayed;
      });

      // Assign positions
      playerStandings.forEach((player, index) => {
        player.currentPosition = index + 1;
      });

      return {
        game: {
          id: game._id,
          name: game.name,
          status: game.status,
          format: game.format,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
        },
        players: playerStandings,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Error getting game state:", error);
      throw new ConvexError("Failed to get game state");
    }
  },
});

// Enhanced player management functions
export const addPlayerToGame = mutation({
  args: {
    gameId: v.id("games"),
    name: v.string(),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate game exists and is joinable
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status === "finished") {
        throw new ConvexError("Cannot join a finished game");
      }

      // Validate name
      if (!args.name || args.name.length < 1 || args.name.length > 50) {
        throw new ConvexError("Player name must be between 1 and 50 characters");
      }

      // Check if user/guest is already in this game
      if (args.userId) {
        const existingPlayer = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .first();
        
        if (existingPlayer) {
          throw new ConvexError("User is already in this game");
        }
      }

      if (args.guestId) {
        const existingPlayer = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
          .filter((q) => q.eq(q.field("guestId"), args.guestId))
          .first();
        
        if (existingPlayer) {
          throw new ConvexError("Guest is already in this game");
        }
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
        name: args.name,
        userId: args.userId,
        guestId: args.guestId,
        position: playerCount + 1,
        teamId: args.teamId,
      });

      return playerId;
    } catch (error) {
      console.error("Error adding player to game:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to add player to game");
    }
  },
});

export const removePlayerFromGame = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const player = await ctx.db.get(args.playerId);
      if (!player) {
        throw new ConvexError("Player not found");
      }

      // Check if game is still in waiting status (can only remove players before game starts)
      const game = await ctx.db.get(player.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status !== "waiting") {
        throw new ConvexError("Cannot remove players from an active or finished game");
      }

      // Remove player's scores (if any)
      const playerScores = await ctx.db
        .query("scores")
        .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
        .collect();

      for (const score of playerScores) {
        await ctx.db.delete(score._id);
      }

      // Remove player's photos (if any)
      const playerPhotos = await ctx.db
        .query("photos")
        .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
        .collect();

      for (const photo of playerPhotos) {
        await ctx.db.delete(photo._id);
      }

      // Remove player's social posts (if any)
      const playerPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
        .collect();

      for (const post of playerPosts) {
        await ctx.db.delete(post._id);
      }

      // Remove the player
      await ctx.db.delete(args.playerId);

      return { success: true };
    } catch (error) {
      console.error("Error removing player from game:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to remove player from game");
    }
  },
});

export const updatePlayerPosition = mutation({
  args: {
    playerId: v.id("players"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const player = await ctx.db.get(args.playerId);
      if (!player) {
        throw new ConvexError("Player not found");
      }

      // Validate position
      if (args.newPosition < 1) {
        throw new ConvexError("Position must be greater than 0");
      }

      // Get all players in the game to validate position
      const allPlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", player.gameId))
        .collect();

      if (args.newPosition > allPlayers.length) {
        throw new ConvexError(`Position cannot be greater than ${allPlayers.length}`);
      }

      // Update player position
      await ctx.db.patch(args.playerId, { position: args.newPosition });

      return { success: true };
    } catch (error) {
      console.error("Error updating player position:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to update player position");
    }
  },
});

// Enhanced game status management
export const startGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status !== "waiting") {
        throw new ConvexError("Game can only be started from waiting status");
      }

      // Check if there are players in the game
      const playerCount = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect()
        .then(players => players.length);

      if (playerCount === 0) {
        throw new ConvexError("Cannot start game without players");
      }

      await ctx.db.patch(args.gameId, { 
        status: "active",
        startedAt: Date.now(), // Update start time to when game actually starts
      });

      return { success: true };
    } catch (error) {
      console.error("Error starting game:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to start game");
    }
  },
});

export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status === "finished") {
        throw new ConvexError("Game is already finished");
      }

      await ctx.db.patch(args.gameId, { 
        status: "finished",
        endedAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error finishing game:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to finish game");
    }
  },
});

// Get games by status for monitoring and management
export const getGamesByStatus = query({
  args: {
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("finished")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 50;
      
      const games = await ctx.db
        .query("games")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(limit);

      // Get player counts for each game
      const gamesWithPlayerCounts = await Promise.all(
        games.map(async (game) => {
          const playerCount = await ctx.db
            .query("players")
            .withIndex("by_game", (q) => q.eq("gameId", game._id))
            .collect()
            .then(players => players.length);

          return {
            ...game,
            playerCount,
          };
        })
      );

      return gamesWithPlayerCounts;
    } catch (error) {
      console.error("Error getting games by status:", error);
      throw new ConvexError("Failed to get games by status");
    }
  },
});

// Get player details for a game
export const getGamePlayers = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      // Get additional details for each player
      const playersWithDetails = await Promise.all(
        players.map(async (player) => {
          // Get user details if available
          let userDetails = null;
          if (player.userId) {
            userDetails = await ctx.db.get(player.userId);
          }

          // Get guest details if available
          let guestDetails = null;
          if (player.guestId) {
            guestDetails = await ctx.db.get(player.guestId);
          }

          // Get player's scores
          const scores = await ctx.db
            .query("scores")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();

          const totalStrokes = scores.reduce((sum, score) => sum + score.strokes, 0);
          const holesPlayed = scores.length;

          return {
            ...player,
            userDetails,
            guestDetails,
            totalStrokes,
            holesPlayed,
            scores,
          };
        })
      );

      return playersWithDetails.sort((a, b) => a.position - b.position);
    } catch (error) {
      console.error("Error getting game players:", error);
      throw new ConvexError("Failed to get game players");
    }
  },
});

// Record score for a player
export const recordScore = mutation({
  args: {
    playerId: v.id("players"),
    holeNumber: v.number(),
    strokes: v.number(),
    putts: v.optional(v.number()),
    gpsLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    try {
      // Validate player exists
      const player = await ctx.db.get(args.playerId);
      if (!player) {
        throw new ConvexError("Player not found");
      }

      // Validate game exists and is active
      const game = await ctx.db.get(player.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status === "finished") {
        throw new ConvexError("Cannot record scores for a finished game");
      }

      // Validate hole number
      if (args.holeNumber < 1 || args.holeNumber > 18) {
        throw new ConvexError("Hole number must be between 1 and 18");
      }

      // Validate strokes
      if (args.strokes < 1 || args.strokes > 20) {
        throw new ConvexError("Strokes must be between 1 and 20");
      }

      // Validate putts if provided
      if (args.putts !== undefined && (args.putts < 0 || args.putts > args.strokes)) {
        throw new ConvexError("Putts must be between 0 and total strokes");
      }

      // Check if score already exists for this player and hole
      const existingScore = await ctx.db
        .query("scores")
        .withIndex("by_player_hole", (q) => 
          q.eq("playerId", args.playerId).eq("holeNumber", args.holeNumber)
        )
        .first();

      let scoreId;
      if (existingScore) {
        // Update existing score
        await ctx.db.patch(existingScore._id, {
          strokes: args.strokes,
          putts: args.putts,
          timestamp: Date.now(),
          gpsLocation: args.gpsLocation,
        });
        scoreId = existingScore._id;
      } else {
        // Create new score
        scoreId = await ctx.db.insert("scores", {
          playerId: args.playerId,
          gameId: player.gameId,
          holeNumber: args.holeNumber,
          strokes: args.strokes,
          putts: args.putts,
          timestamp: Date.now(),
          gpsLocation: args.gpsLocation,
        });

        // Auto-create social posts for notable scores (only for new scores)
        await createScoreSocialPost(ctx, {
          gameId: player.gameId,
          playerId: args.playerId,
          holeNumber: args.holeNumber,
          strokes: args.strokes,
          playerName: player.name,
        });
      }

      return scoreId;
    } catch (error) {
      console.error("Error recording score:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to record score");
    }
  },
});

// Get scores for a specific game and hole
export const getHoleScores = query({
  args: {
    gameId: v.id("games"),
    holeNumber: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const game = await ctx.db.get(args.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      // Validate hole number
      if (args.holeNumber < 1 || args.holeNumber > 18) {
        throw new ConvexError("Hole number must be between 1 and 18");
      }

      const scores = await ctx.db
        .query("scores")
        .withIndex("by_game_hole", (q) => 
          q.eq("gameId", args.gameId).eq("holeNumber", args.holeNumber)
        )
        .collect();

      // Get player details for each score
      const scoresWithPlayers = await Promise.all(
        scores.map(async (score) => {
          const player = await ctx.db.get(score.playerId);
          return {
            ...score,
            player,
          };
        })
      );

      return scoresWithPlayers.sort((a, b) => a.strokes - b.strokes);
    } catch (error) {
      console.error("Error getting hole scores:", error);
      throw new ConvexError("Failed to get hole scores");
    }
  },
});

// Delete a score (for corrections)
export const deleteScore = mutation({
  args: {
    scoreId: v.id("scores"),
  },
  handler: async (ctx, args) => {
    try {
      const score = await ctx.db.get(args.scoreId);
      if (!score) {
        throw new ConvexError("Score not found");
      }

      // Check if game is still active (can only delete scores from active games)
      const game = await ctx.db.get(score.gameId);
      if (!game) {
        throw new ConvexError("Game not found");
      }

      if (game.status === "finished") {
        throw new ConvexError("Cannot delete scores from a finished game");
      }

      await ctx.db.delete(args.scoreId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting score:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to delete score");
    }
  },
});

// Alias for addPlayerToGame for compatibility
export const addPlayer = mutation({
  args: {
    gameId: v.id("games"),
    name: v.string(),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await addPlayerToGame(ctx, args);
  },
});

// Get user's active/unfinished games
export const getUserActiveGames = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.id("guests")),
  },
  handler: async (ctx, args) => {
    try {
      if (!args.userId && !args.guestId) {
        return [];
      }

      // Find all players for this user/guest
      let players;
      if (args.userId) {
        players = await ctx.db
          .query("players")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .collect();
      } else if (args.guestId) {
        players = await ctx.db
          .query("players")
          .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
          .collect();
      }

      if (!players || players.length === 0) {
        return [];
      }

      // Get unique game IDs
      const gameIds = Array.from(new Set(players.map(p => p.gameId)));

      // Get games that are still active
      const activeGames = await Promise.all(
        gameIds.map(async (gameId) => {
          const game = await ctx.db.get(gameId);
          if (game && game.status !== "finished") {
            // Get basic game info with player count
            const gamePlayers = await ctx.db
              .query("players")
              .withIndex("by_game", (q) => q.eq("gameId", gameId))
              .collect();

            // Get user's player info in this game
            const userPlayer = players.find(p => p.gameId === gameId);

            return {
              _id: game._id,
              name: game.name,
              status: game.status,
              startedAt: game.startedAt,
              playerCount: gamePlayers.length,
              userPlayer: userPlayer ? {
                _id: userPlayer._id,
                name: userPlayer.name,
                position: userPlayer.position
              } : null
            };
          }
          return null;
        })
      );

      // Filter out null results and sort by most recent
      return activeGames
        .filter(game => game !== null)
        .sort((a, b) => b.startedAt - a.startedAt);
    } catch (error) {
      console.error("Error getting user active games:", error);
      return [];
    }
  },
});