import type { Id } from "../../convex/_generated/dataModel";

export interface CachedGameData {
  game: {
    _id: Id<"games">;
    name: string;
    status: "waiting" | "active" | "finished";
    format: "stroke" | "match" | "scramble" | "best_ball";
    startedAt: number;
    endedAt?: number;
    courseId?: Id<"courses">;
  };
  players: Array<{
    _id: Id<"players">;
    gameId: Id<"games">;
    name: string;
    userId?: Id<"users">;
    guestId?: Id<"guests">;
    position: number;
    teamId?: string;
  }>;
  scores: Array<{
    _id: Id<"scores">;
    playerId: Id<"players">;
    gameId: Id<"games">;
    holeNumber: number;
    strokes: number;
    putts?: number;
    timestamp: number;
  }>;
  photos: Array<{
    _id: Id<"photos">;
    playerId: Id<"players">;
    gameId: Id<"games">;
    url: string;
    caption?: string;
    holeNumber?: number;
    timestamp: number;
  }>;
  socialPosts: Array<{
    _id: Id<"socialPosts">;
    gameId: Id<"games">;
    playerId: Id<"players">;
    type: "score" | "photo" | "achievement" | "order" | "custom";
    content: string;
    timestamp: number;
  }>;
  lastUpdated: number;
  version: number;
}

export interface CachedGameState {
  game: {
    id: Id<"games">;
    name: string;
    status: "waiting" | "active" | "finished";
    format: "stroke" | "match" | "scramble" | "best_ball";
    startedAt: number;
    endedAt?: number;
  };
  players: Array<{
    _id: Id<"players">;
    name: string;
    totalStrokes: number;
    holesPlayed: number;
    currentPosition: number;
  }>;
  lastUpdated: number;
}

export class GameDataCache {
  private static readonly GAME_DATA_KEY = "parparty_cached_game_data";
  private static readonly GAME_STATE_KEY = "parparty_cached_game_state";
  private static readonly CACHE_VERSION = 1;
  private static readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Cache game data for offline access
   */
  public static cacheGameData(gameId: Id<"games">, gameData: Omit<CachedGameData, 'lastUpdated' | 'version'>): void {
    try {
      const cachedData: CachedGameData = {
        ...gameData,
        lastUpdated: Date.now(),
        version: GameDataCache.CACHE_VERSION,
      };

      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`Cached game data for game ${gameId}`);
    } catch (error) {
      console.error('Error caching game data:', error);
    }
  }

  /**
   * Get cached game data
   */
  public static getCachedGameData(gameId: Id<"games">): CachedGameData | null {
    try {
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      const stored = localStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const cachedData: CachedGameData = JSON.parse(stored);
      
      // Check version compatibility
      if (cachedData.version !== GameDataCache.CACHE_VERSION) {
        console.log('Cache version mismatch, clearing cached data');
        GameDataCache.clearCachedGameData(gameId);
        return null;
      }

      // Check if cache is expired
      const age = Date.now() - cachedData.lastUpdated;
      if (age > GameDataCache.CACHE_EXPIRY_MS) {
        console.log('Cache expired, clearing cached data');
        GameDataCache.clearCachedGameData(gameId);
        return null;
      }

      return cachedData;
    } catch (error) {
      console.error('Error reading cached game data:', error);
      return null;
    }
  }

  /**
   * Cache game state for offline access
   */
  public static cacheGameState(gameId: Id<"games">, gameState: Omit<CachedGameState, 'lastUpdated'>): void {
    try {
      const cachedState: CachedGameState = {
        ...gameState,
        lastUpdated: Date.now(),
      };

      const cacheKey = `${GameDataCache.GAME_STATE_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedState));
      
      console.log(`Cached game state for game ${gameId}`);
    } catch (error) {
      console.error('Error caching game state:', error);
    }
  }

  /**
   * Get cached game state
   */
  public static getCachedGameState(gameId: Id<"games">): CachedGameState | null {
    try {
      const cacheKey = `${GameDataCache.GAME_STATE_KEY}_${gameId}`;
      const stored = localStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const cachedState: CachedGameState = JSON.parse(stored);
      
      // Check if cache is expired
      const age = Date.now() - cachedState.lastUpdated;
      if (age > GameDataCache.CACHE_EXPIRY_MS) {
        console.log('Game state cache expired, clearing cached data');
        GameDataCache.clearCachedGameState(gameId);
        return null;
      }

      return cachedState;
    } catch (error) {
      console.error('Error reading cached game state:', error);
      return null;
    }
  }

  /**
   * Update cached game data with new scores
   */
  public static updateCachedScores(gameId: Id<"games">, newScore: {
    _id: Id<"scores">;
    playerId: Id<"players">;
    gameId: Id<"games">;
    holeNumber: number;
    strokes: number;
    putts?: number;
    timestamp: number;
  }): void {
    try {
      const cachedData = GameDataCache.getCachedGameData(gameId);
      if (!cachedData) {
        return;
      }

      // Update or add the score
      const existingScoreIndex = cachedData.scores.findIndex(
        score => score.playerId === newScore.playerId && score.holeNumber === newScore.holeNumber
      );

      if (existingScoreIndex >= 0) {
        cachedData.scores[existingScoreIndex] = newScore;
      } else {
        cachedData.scores.push(newScore);
      }

      cachedData.lastUpdated = Date.now();
      
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`Updated cached score for game ${gameId}`);
    } catch (error) {
      console.error('Error updating cached scores:', error);
    }
  }

  /**
   * Update cached game data with new photo
   */
  public static updateCachedPhotos(gameId: Id<"games">, newPhoto: {
    _id: Id<"photos">;
    playerId: Id<"players">;
    gameId: Id<"games">;
    url: string;
    caption?: string;
    holeNumber?: number;
    timestamp: number;
  }): void {
    try {
      const cachedData = GameDataCache.getCachedGameData(gameId);
      if (!cachedData) {
        return;
      }

      // Add the new photo
      cachedData.photos.push(newPhoto);
      cachedData.lastUpdated = Date.now();
      
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`Updated cached photos for game ${gameId}`);
    } catch (error) {
      console.error('Error updating cached photos:', error);
    }
  }

  /**
   * Update cached game data with new social post
   */
  public static updateCachedSocialPosts(gameId: Id<"games">, newPost: {
    _id: Id<"socialPosts">;
    gameId: Id<"games">;
    playerId: Id<"players">;
    type: "score" | "photo" | "achievement" | "order" | "custom";
    content: string;
    timestamp: number;
  }): void {
    try {
      const cachedData = GameDataCache.getCachedGameData(gameId);
      if (!cachedData) {
        return;
      }

      // Add the new social post
      cachedData.socialPosts.unshift(newPost); // Add to beginning for chronological order
      
      // Keep only the most recent 50 posts
      if (cachedData.socialPosts.length > 50) {
        cachedData.socialPosts = cachedData.socialPosts.slice(0, 50);
      }

      cachedData.lastUpdated = Date.now();
      
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`Updated cached social posts for game ${gameId}`);
    } catch (error) {
      console.error('Error updating cached social posts:', error);
    }
  }

  /**
   * Merge offline data with cached data
   */
  public static mergeOfflineData(gameId: Id<"games">, offlineScores: any[], offlinePhotos: any[]): void {
    try {
      const cachedData = GameDataCache.getCachedGameData(gameId);
      if (!cachedData) {
        return;
      }

      // Merge offline scores
      offlineScores.forEach(offlineScore => {
        const existingScoreIndex = cachedData.scores.findIndex(
          score => score.playerId === offlineScore.playerId && score.holeNumber === offlineScore.holeNumber
        );

        const scoreData = {
          _id: `offline_${Date.now()}_${Math.random()}` as Id<"scores">,
          playerId: offlineScore.playerId,
          gameId: offlineScore.gameId,
          holeNumber: offlineScore.holeNumber,
          strokes: offlineScore.strokes,
          putts: offlineScore.putts,
          timestamp: offlineScore.timestamp,
        };

        if (existingScoreIndex >= 0) {
          cachedData.scores[existingScoreIndex] = scoreData;
        } else {
          cachedData.scores.push(scoreData);
        }
      });

      // Merge offline photos
      offlinePhotos.forEach(offlinePhoto => {
        const photoData = {
          _id: `offline_${Date.now()}_${Math.random()}` as Id<"photos">,
          playerId: offlinePhoto.playerId,
          gameId: offlinePhoto.gameId,
          url: offlinePhoto.url,
          caption: offlinePhoto.caption,
          holeNumber: offlinePhoto.holeNumber,
          timestamp: offlinePhoto.timestamp,
        };

        cachedData.photos.push(photoData);
      });

      cachedData.lastUpdated = Date.now();
      
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`Merged offline data for game ${gameId}`);
    } catch (error) {
      console.error('Error merging offline data:', error);
    }
  }

  /**
   * Clear cached game data
   */
  public static clearCachedGameData(gameId: Id<"games">): void {
    try {
      const cacheKey = `${GameDataCache.GAME_DATA_KEY}_${gameId}`;
      localStorage.removeItem(cacheKey);
      console.log(`Cleared cached game data for game ${gameId}`);
    } catch (error) {
      console.error('Error clearing cached game data:', error);
    }
  }

  /**
   * Clear cached game state
   */
  public static clearCachedGameState(gameId: Id<"games">): void {
    try {
      const cacheKey = `${GameDataCache.GAME_STATE_KEY}_${gameId}`;
      localStorage.removeItem(cacheKey);
      console.log(`Cleared cached game state for game ${gameId}`);
    } catch (error) {
      console.error('Error clearing cached game state:', error);
    }
  }

  /**
   * Clear all cached data
   */
  public static clearAllCachedData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(GameDataCache.GAME_DATA_KEY) || 
            key.startsWith(GameDataCache.GAME_STATE_KEY)) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cleared all cached game data');
    } catch (error) {
      console.error('Error clearing all cached data:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public static getCacheStats(): {
    cachedGames: number;
    totalCacheSize: number;
    oldestCache: number | null;
    newestCache: number | null;
  } {
    try {
      const keys = Object.keys(localStorage);
      const gameDataKeys = keys.filter(key => key.startsWith(GameDataCache.GAME_DATA_KEY));
      
      let totalSize = 0;
      let oldestCache: number | null = null;
      let newestCache: number | null = null;

      gameDataKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          
          try {
            const parsed = JSON.parse(data);
            const timestamp = parsed.lastUpdated;
            
            if (oldestCache === null || timestamp < oldestCache) {
              oldestCache = timestamp;
            }
            if (newestCache === null || timestamp > newestCache) {
              newestCache = timestamp;
            }
          } catch (parseError) {
            // Ignore parse errors for stats
          }
        }
      });

      return {
        cachedGames: gameDataKeys.length,
        totalCacheSize: totalSize,
        oldestCache,
        newestCache,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        cachedGames: 0,
        totalCacheSize: 0,
        oldestCache: null,
        newestCache: null,
      };
    }
  }

  /**
   * Check if game data is cached and fresh
   */
  public static isGameDataCached(gameId: Id<"games">): boolean {
    const cachedData = GameDataCache.getCachedGameData(gameId);
    return cachedData !== null;
  }

  /**
   * Check if game state is cached and fresh
   */
  public static isGameStateCached(gameId: Id<"games">): boolean {
    const cachedState = GameDataCache.getCachedGameState(gameId);
    return cachedState !== null;
  }

  /**
   * Preload game data for offline access
   */
  public static preloadGameData(gameId: Id<"games">, gameData: any, gameState: any): void {
    try {
      GameDataCache.cacheGameData(gameId, gameData);
      GameDataCache.cacheGameState(gameId, gameState);
      console.log(`Preloaded game data for offline access: ${gameId}`);
    } catch (error) {
      console.error('Error preloading game data:', error);
    }
  }
}