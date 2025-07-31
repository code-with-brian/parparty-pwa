import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProvider } from 'convex/react';
import { OfflineQueueManager } from '../../lib/OfflineQueueManager';
import { ErrorRecoveryManager } from '../../lib/ErrorRecoveryManager';
import { GameDataCache } from '../../lib/GameDataCache';
import { GuestSessionManager } from '../../lib/GuestSessionManager';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock ConvexReactClient
const mockConvex = {
  mutation: vi.fn(),
  query: vi.fn(),
  subscribe: vi.fn(),
} as any;

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

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window events
const eventListeners: { [key: string]: Function[] } = {};
const mockAddEventListener = vi.fn((event: string, callback: Function) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
});

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

// Helper to trigger network events
const triggerNetworkEvent = (event: 'online' | 'offline') => {
  (navigator as any).onLine = event === 'online';
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback());
  }
};

// Test component that uses offline functionality
const TestOfflineComponent: React.FC<{
  offlineQueue: OfflineQueueManager;
  errorRecovery: ErrorRecoveryManager;
  guestSession: GuestSessionManager;
}> = ({ offlineQueue, errorRecovery, guestSession }) => {
  const [status, setStatus] = React.useState('online');
  const [queueStatus, setQueueStatus] = React.useState(offlineQueue.getQueueStatus());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = offlineQueue.onOnlineStatusChange((isOnline) => {
      setStatus(isOnline ? 'online' : 'offline');
      setQueueStatus(offlineQueue.getQueueStatus());
    });

    const unsubscribeError = errorRecovery.onError((error, context) => {
      setError(`${context}: ${error.message}`);
    });

    return () => {
      unsubscribe();
      unsubscribeError();
    };
  }, [offlineQueue, errorRecovery]);

  const handleRecordScore = async () => {
    try {
      await guestSession.recordScore(
        'player1' as Id<"players">,
        'game1' as Id<"games">,
        1,
        4
      );
    } catch (err) {
      setError(`Score recording failed: ${(err as Error).message}`);
    }
  };

  const handleUploadPhoto = async () => {
    try {
      await guestSession.uploadPhoto(
        'player1' as Id<"players">,
        'game1' as Id<"games">,
        'https://example.com/photo.jpg',
        'Great shot!'
      );
    } catch (err) {
      setError(`Photo upload failed: ${(err as Error).message}`);
    }
  };

  const handleSync = async () => {
    try {
      await guestSession.syncOfflineData();
    } catch (err) {
      setError(`Sync failed: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <div data-testid="network-status">{status}</div>
      <div data-testid="queue-length">{queueStatus.queueLength}</div>
      <div data-testid="cached-scores">{queueStatus.cachedScores}</div>
      <div data-testid="cached-photos">{queueStatus.cachedPhotos}</div>
      {error && <div data-testid="error-message">{error}</div>}
      
      <button onClick={handleRecordScore} data-testid="record-score">
        Record Score
      </button>
      <button onClick={handleUploadPhoto} data-testid="upload-photo">
        Upload Photo
      </button>
      <button onClick={handleSync} data-testid="sync-data">
        Sync Data
      </button>
    </div>
  );
};

describe('Offline/Online Integration Tests', () => {
  let offlineQueue: OfflineQueueManager;
  let errorRecovery: ErrorRecoveryManager;
  let guestSession: GuestSessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;

    offlineQueue = new OfflineQueueManager(mockConvex);
    errorRecovery = new ErrorRecoveryManager(mockConvex, offlineQueue);
    guestSession = new GuestSessionManager(mockConvex, offlineQueue, errorRecovery);

    // Clear event listeners
    Object.keys(eventListeners).forEach(key => {
      eventListeners[key] = [];
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    GameDataCache.clearAllCachedData();
    offlineQueue.clearAllCachedData();
  });

  describe('Online to Offline Transition', () => {
    it('should queue actions when going offline', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Start online
      expect(getByTestId('network-status')).toHaveTextContent('online');

      // Go offline
      triggerNetworkEvent('offline');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('offline');
      });

      // Record a score while offline
      fireEvent.click(getByTestId('record-score'));

      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('1');
        expect(getByTestId('cached-scores')).toHaveTextContent('1');
      });

      // Upload a photo while offline
      fireEvent.click(getByTestId('upload-photo'));

      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('2');
        expect(getByTestId('cached-photos')).toHaveTextContent('1');
      });

      // Verify no API calls were made
      expect(mockConvex.mutation).not.toHaveBeenCalled();
    });

    it('should detect network status changes', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Start online
      expect(getByTestId('network-status')).toHaveTextContent('online');

      // Go offline
      triggerNetworkEvent('offline');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('offline');
      });

      // Go back online
      triggerNetworkEvent('online');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('online');
      });
    });
  });

  describe('Offline to Online Transition', () => {
    it('should sync queued actions when coming back online', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Start offline
      triggerNetworkEvent('offline');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('offline');
      });

      // Queue some actions while offline
      fireEvent.click(getByTestId('record-score'));
      fireEvent.click(getByTestId('upload-photo'));

      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('2');
      });

      // Mock successful API responses
      mockConvex.mutation.mockResolvedValue('success');

      // Go back online
      triggerNetworkEvent('online');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('online');
      });

      // Wait for automatic sync
      await waitFor(() => {
        expect(mockConvex.mutation).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });

      // Verify queue is cleared after successful sync
      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('0');
      });
    });

    it('should handle sync failures with retry logic', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Start offline and queue an action
      triggerNetworkEvent('offline');
      fireEvent.click(getByTestId('record-score'));

      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('1');
      });

      // Mock API failure
      mockConvex.mutation.mockRejectedValue(new Error('Network error'));

      // Go back online
      triggerNetworkEvent('online');

      await waitFor(() => {
        expect(getByTestId('network-status')).toHaveTextContent('online');
      });

      // Wait for sync attempt
      await waitFor(() => {
        expect(mockConvex.mutation).toHaveBeenCalled();
      });

      // Action should still be in queue due to failure
      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('1');
      });
    });

    it('should provide manual sync capability', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Queue actions while offline
      triggerNetworkEvent('offline');
      fireEvent.click(getByTestId('record-score'));

      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('1');
      });

      // Go back online but don't trigger automatic sync
      (navigator as any).onLine = true;
      mockConvex.mutation.mockResolvedValue('success');

      // Manually trigger sync
      fireEvent.click(getByTestId('sync-data'));

      await waitFor(() => {
        expect(mockConvex.mutation).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle network errors with offline fallback', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Mock network error
      mockConvex.mutation.mockRejectedValue(new Error('fetch failed'));

      // Try to record score while online but with network issues
      fireEvent.click(getByTestId('record-score'));

      // Should queue the action as fallback
      await waitFor(() => {
        expect(getByTestId('queue-length')).toHaveTextContent('1');
      });
    });

    it('should display error messages to user', async () => {
      const { getByTestId } = render(
        <TestOfflineComponent
          offlineQueue={offlineQueue}
          errorRecovery={errorRecovery}
          guestSession={guestSession}
        />
      );

      // Mock API error
      mockConvex.mutation.mockRejectedValue(new Error('API error'));

      // Try to record score
      fireEvent.click(getByTestId('record-score'));

      // Should display error message
      await waitFor(() => {
        expect(getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Game Data Caching Integration', () => {
    it('should cache game data for offline access', async () => {
      const mockGameData = {
        game: { _id: 'game1', name: 'Test Game' },
        players: [],
        scores: [],
        photos: [],
        socialPosts: [],
      };

      mockConvex.query.mockResolvedValue(mockGameData);

      // Get game data while online (should cache it)
      const result = await guestSession.getGameData('game1' as Id<"games">);

      expect(result).toEqual(mockGameData);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_game_data_game1',
        expect.stringContaining('"name":"Test Game"')
      );
    });

    it('should use cached data when offline', async () => {
      const mockGameData = {
        game: { _id: 'game1', name: 'Test Game' },
        players: [],
        scores: [],
        photos: [],
        socialPosts: [],
        lastUpdated: Date.now() - 60000, // 1 minute ago
        version: 1,
      };

      // Mock cached data
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockGameData));

      // Mock API failure (simulating offline)
      mockConvex.query.mockRejectedValue(new Error('Network error'));

      // Should return cached data
      const result = await guestSession.getGameData('game1' as Id<"games">);

      expect(result).toEqual(mockGameData);
    });

    it('should merge offline data with cached data', async () => {
      const mockGameData = {
        game: { _id: 'game1', name: 'Test Game' },
        players: [],
        scores: [],
        photos: [],
        socialPosts: [],
        lastUpdated: Date.now() - 60000,
        version: 1,
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'parparty_cached_game_data_game1') {
          return JSON.stringify(mockGameData);
        }
        if (key === 'parparty_cached_scores') {
          return JSON.stringify([{
            playerId: 'player1',
            gameId: 'game1',
            holeNumber: 1,
            strokes: 4,
            timestamp: Date.now(),
          }]);
        }
        return null;
      });

      mockConvex.query.mockRejectedValue(new Error('Network error'));

      // Should return cached data with offline scores merged
      const result = await guestSession.getGameData('game1' as Id<"games">);

      expect(result).toBeDefined();
      // Verify that merge was called (indirectly through the cache update)
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Guest Session Offline Support', () => {
    it('should create offline session when server is unavailable', async () => {
      // Mock server failure
      mockConvex.mutation.mockRejectedValue(new Error('Server unavailable'));
      mockConvex.query.mockRejectedValue(new Error('Server unavailable'));

      // Go offline
      (navigator as any).onLine = false;

      // Should create offline session
      const session = await guestSession.getCurrentSession();

      expect(session).toBeDefined();
      expect(session.id).toContain('offline_');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_guest_session',
        expect.stringContaining('offline_')
      );
    });

    it('should use cached session when offline', async () => {
      const mockSession = {
        id: 'guest123',
        deviceId: 'device123',
        name: 'Test User',
        createdAt: Date.now() - 3600000,
        tempData: { scores: [], photos: [], orders: [] },
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'parparty_guest_session') {
          return JSON.stringify(mockSession);
        }
        return null;
      });

      // Go offline
      (navigator as any).onLine = false;

      const session = await guestSession.getCurrentSession();

      expect(session).toEqual(mockSession);
      // Should not attempt server calls when offline
      expect(mockConvex.query).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large amounts of cached data', async () => {
      // Create large dataset
      const largeScores = Array.from({ length: 1000 }, (_, i) => ({
        playerId: 'player1',
        gameId: 'game1',
        holeNumber: (i % 18) + 1,
        strokes: Math.floor(Math.random() * 10) + 1,
        timestamp: Date.now() - i * 1000,
      }));

      // Queue all scores while offline
      triggerNetworkEvent('offline');

      for (const score of largeScores) {
        offlineQueue.queueScore(score);
      }

      const status = offlineQueue.getQueueStatus();
      expect(status.queueLength).toBe(1000);
      expect(status.cachedScores).toBe(1000);
    });

    it('should clean up expired cache data', () => {
      const expiredData = {
        game: { _id: 'game1', name: 'Test Game' },
        players: [],
        scores: [],
        photos: [],
        socialPosts: [],
        lastUpdated: Date.now() - (10 * 60 * 1000), // 10 minutes ago (expired)
        version: 1,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const result = GameDataCache.getCachedGameData('game1' as Id<"games">);

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_game_data_game1');
    });
  });
});