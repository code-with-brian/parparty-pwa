import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameDataCache, type CachedGameData, type CachedGameState } from '../GameDataCache';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Object.keys for localStorage
const originalObjectKeys = Object.keys;
Object.keys = vi.fn().mockImplementation((obj) => {
  if (obj === localStorage) {
    return ['parparty_cached_game_data_game1', 'parparty_cached_game_state_game1', 'other_key'];
  }
  return originalObjectKeys(obj);
});

describe('GameDataCache', () => {
  const mockGameId = 'game1' as Id<"games">;
  const mockPlayerId = 'player1' as Id<"players">;
  const mockCourseId = 'course1' as Id<"courses">;

  const mockGameData: Omit<CachedGameData, 'lastUpdated' | 'version'> = {
    game: {
      _id: mockGameId,
      name: 'Test Game',
      status: 'active',
      format: 'stroke',
      startedAt: Date.now() - 3600000, // 1 hour ago
      courseId: mockCourseId,
    },
    players: [
      {
        _id: mockPlayerId,
        gameId: mockGameId,
        name: 'Test Player',
        position: 1,
      },
    ],
    scores: [
      {
        _id: 'score1' as Id<"scores">,
        playerId: mockPlayerId,
        gameId: mockGameId,
        holeNumber: 1,
        strokes: 4,
        timestamp: Date.now(),
      },
    ],
    photos: [
      {
        _id: 'photo1' as Id<"photos">,
        playerId: mockPlayerId,
        gameId: mockGameId,
        url: 'https://example.com/photo.jpg',
        timestamp: Date.now(),
      },
    ],
    socialPosts: [
      {
        _id: 'post1' as Id<"socialPosts">,
        gameId: mockGameId,
        playerId: mockPlayerId,
        type: 'score',
        content: 'Great shot!',
        timestamp: Date.now(),
      },
    ],
  };

  const mockGameState: Omit<CachedGameState, 'lastUpdated'> = {
    game: {
      id: mockGameId,
      name: 'Test Game',
      status: 'active',
      format: 'stroke',
      startedAt: Date.now() - 3600000,
    },
    players: [
      {
        _id: mockPlayerId,
        name: 'Test Player',
        totalStrokes: 4,
        holesPlayed: 1,
        currentPosition: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Game Data Caching', () => {
    it('should cache game data correctly', () => {
      GameDataCache.cacheGameData(mockGameId, mockGameData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_data_game1',
        expect.stringContaining('"name":"Test Game"')
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toMatchObject({
        ...mockGameData,
        lastUpdated: 1000000,
        version: 1,
      });
    });

    it('should retrieve cached game data', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000, // 1 minute ago (fresh)
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toEqual(cachedData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
    });

    it('should return null for non-existent cached data', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toBeNull();
    });

    it('should clear expired cached data', () => {
      const expiredData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
    });

    it('should clear cached data with version mismatch', () => {
      const oldVersionData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 0, // Old version
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldVersionData));

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
    });
  });

  describe('Game State Caching', () => {
    it('should cache game state correctly', () => {
      GameDataCache.cacheGameState(mockGameId, mockGameState);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_state_game1',
        expect.stringContaining('"name":"Test Game"')
      );

      const savedState = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedState).toMatchObject({
        ...mockGameState,
        lastUpdated: 1000000,
      });
    });

    it('should retrieve cached game state', () => {
      const cachedState: CachedGameState = {
        ...mockGameState,
        lastUpdated: Date.now() - 60000, // 1 minute ago (fresh)
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedState));

      const result = GameDataCache.getCachedGameState(mockGameId);

      expect(result).toEqual(cachedState);
    });

    it('should clear expired game state', () => {
      const expiredState: CachedGameState = {
        ...mockGameState,
        lastUpdated: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredState));

      const result = GameDataCache.getCachedGameState(mockGameId);

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_state_game1');
    });
  });

  describe('Cache Updates', () => {
    it('should update cached scores', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const newScore = {
        _id: 'score2' as Id<"scores">,
        playerId: mockPlayerId,
        gameId: mockGameId,
        holeNumber: 2,
        strokes: 3,
        timestamp: Date.now(),
      };

      GameDataCache.updateCachedScores(mockGameId, newScore);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_data_game1',
        expect.stringContaining('"holeNumber":2')
      );
    });

    it('should replace existing score when updating', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const updatedScore = {
        _id: 'score1' as Id<"scores">,
        playerId: mockPlayerId,
        gameId: mockGameId,
        holeNumber: 1,
        strokes: 5, // Changed from 4 to 5
        timestamp: Date.now(),
      };

      GameDataCache.updateCachedScores(mockGameId, updatedScore);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.scores).toHaveLength(1);
      expect(savedData.scores[0].strokes).toBe(5);
    });

    it('should update cached photos', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const newPhoto = {
        _id: 'photo2' as Id<"photos">,
        playerId: mockPlayerId,
        gameId: mockGameId,
        url: 'https://example.com/photo2.jpg',
        caption: 'Another great shot!',
        timestamp: Date.now(),
      };

      GameDataCache.updateCachedPhotos(mockGameId, newPhoto);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.photos).toHaveLength(2);
      expect(savedData.photos[1].url).toBe('https://example.com/photo2.jpg');
    });

    it('should update cached social posts', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const newPost = {
        _id: 'post2' as Id<"socialPosts">,
        gameId: mockGameId,
        playerId: mockPlayerId,
        type: 'photo' as const,
        content: 'Check out this photo!',
        timestamp: Date.now(),
      };

      GameDataCache.updateCachedSocialPosts(mockGameId, newPost);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.socialPosts).toHaveLength(2);
      expect(savedData.socialPosts[0].content).toBe('Check out this photo!'); // Should be first (newest)
    });

    it('should limit social posts to 50', () => {
      const manyPosts = Array.from({ length: 60 }, (_, i) => ({
        _id: `post${i}` as Id<"socialPosts">,
        gameId: mockGameId,
        playerId: mockPlayerId,
        type: 'custom' as const,
        content: `Post ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const cachedData: CachedGameData = {
        ...mockGameData,
        socialPosts: manyPosts,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const newPost = {
        _id: 'newPost' as Id<"socialPosts">,
        gameId: mockGameId,
        playerId: mockPlayerId,
        type: 'achievement' as const,
        content: 'New achievement!',
        timestamp: Date.now(),
      };

      GameDataCache.updateCachedSocialPosts(mockGameId, newPost);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.socialPosts).toHaveLength(50);
      expect(savedData.socialPosts[0].content).toBe('New achievement!');
    });
  });

  describe('Offline Data Merging', () => {
    it('should merge offline scores and photos', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const offlineScores = [
        {
          playerId: mockPlayerId,
          gameId: mockGameId,
          holeNumber: 3,
          strokes: 6,
          timestamp: Date.now(),
        },
      ];

      const offlinePhotos = [
        {
          playerId: mockPlayerId,
          gameId: mockGameId,
          url: 'offline-photo.jpg',
          timestamp: Date.now(),
        },
      ];

      GameDataCache.mergeOfflineData(mockGameId, offlineScores, offlinePhotos);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.scores).toHaveLength(2); // Original + offline
      expect(savedData.photos).toHaveLength(2); // Original + offline
      expect(savedData.scores[1].holeNumber).toBe(3);
      expect(savedData.photos[1].url).toBe('offline-photo.jpg');
    });

    it('should replace existing scores when merging offline data', () => {
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const offlineScores = [
        {
          playerId: mockPlayerId,
          gameId: mockGameId,
          holeNumber: 1, // Same hole as existing score
          strokes: 7, // Different strokes
          timestamp: Date.now(),
        },
      ];

      GameDataCache.mergeOfflineData(mockGameId, offlineScores, []);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.scores).toHaveLength(1); // Should replace, not add
      expect(savedData.scores[0].strokes).toBe(7); // Should be updated value
    });
  });

  describe('Cache Management', () => {
    it('should clear specific game data', () => {
      GameDataCache.clearCachedGameData(mockGameId);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
    });

    it('should clear specific game state', () => {
      GameDataCache.clearCachedGameState(mockGameId);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_state_game1');
    });

    it('should clear all cached data', () => {
      GameDataCache.clearAllCachedData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_state_game1');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_key');
    });

    it('should check if game data is cached', () => {
      // Mock fresh cached data
      const cachedData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const result = GameDataCache.isGameDataCached(mockGameId);

      expect(result).toBe(true);
    });

    it('should return false for expired cached data', () => {
      // Mock expired cached data
      const expiredData: CachedGameData = {
        ...mockGameData,
        lastUpdated: Date.now() - (6 * 60 * 1000),
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const result = GameDataCache.isGameDataCached(mockGameId);

      expect(result).toBe(false);
    });

    it('should preload game data', () => {
      GameDataCache.preloadGameData(mockGameId, mockGameData, mockGameState);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_data_game1',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_state_game1',
        expect.any(String)
      );
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', () => {
      const mockCachedData = {
        game: mockGameData.game,
        lastUpdated: 900000,
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'parparty_cached_game_data_game1') {
          return JSON.stringify(mockCachedData);
        }
        return null;
      });

      const stats = GameDataCache.getCacheStats();

      expect(stats).toEqual({
        cachedGames: 1,
        totalCacheSize: expect.any(Number),
        oldestCache: 900000,
        newestCache: 900000,
      });
    });

    it('should handle empty cache in statistics', () => {
      // Mock Object.keys to return no cache keys
      Object.keys = vi.fn().mockReturnValue([]);

      const stats = GameDataCache.getCacheStats();

      expect(stats).toEqual({
        cachedGames: 0,
        totalCacheSize: 0,
        oldestCache: null,
        newestCache: null,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = GameDataCache.getCachedGameData(mockGameId);

      expect(result).toBeNull();
    });

    it('should handle setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      // Should not throw
      expect(() => {
        GameDataCache.cacheGameData(mockGameId, mockGameData);
      }).not.toThrow();
    });
  });
});