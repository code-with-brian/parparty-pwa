import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { OfflineQueueManager, type OfflineScore, type OfflinePhoto, type OfflineOrder } from '../OfflineQueueManager';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock ConvexReactClient
const mockConvex = {
  mutation: vi.fn(),
  query: vi.fn(),
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
const mockAddEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

describe('OfflineQueueManager', () => {
  let offlineQueue: OfflineQueueManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;
    offlineQueue = new OfflineQueueManager(mockConvex);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Status Detection', () => {
    it('should detect online status correctly', () => {
      (navigator as any).onLine = true;
      expect(offlineQueue.isOnline()).toBe(true);

      (navigator as any).onLine = false;
      expect(offlineQueue.isOnline()).toBe(false);
    });

    it('should register network event listeners', () => {
      new OfflineQueueManager(mockConvex);
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should notify callbacks on online status change', () => {
      const callback = vi.fn();
      const unsubscribe = offlineQueue.onOnlineStatusChange(callback);

      // Simulate going offline
      (navigator as any).onLine = false;
      // Trigger the offline event manually since we can't actually trigger browser events
      const offlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'offline')?.[1];
      if (offlineHandler) offlineHandler();

      expect(callback).toHaveBeenCalledWith(false);

      // Test unsubscribe
      unsubscribe();
      callback.mockClear();

      // Simulate going online
      (navigator as any).onLine = true;
      const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
      if (onlineHandler) onlineHandler();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Score Queuing', () => {
    const mockScore: OfflineScore = {
      playerId: 'player1' as Id<"players">,
      gameId: 'game1' as Id<"games">,
      holeNumber: 1,
      strokes: 4,
      putts: 2,
      timestamp: Date.now(),
      gpsLocation: { lat: 40.7128, lng: -74.0060 },
    };

    it('should queue score when offline', () => {
      (navigator as any).onLine = false;
      
      offlineQueue.queueScore(mockScore);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_offline_queue',
        expect.stringContaining('"type":"score"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_scores',
        expect.stringContaining(mockScore.playerId)
      );
    });

    it('should attempt immediate sync when online', async () => {
      (navigator as any).onLine = true;
      mockConvex.mutation.mockResolvedValue('score123');

      offlineQueue.queueScore(mockScore);

      // Should attempt to sync immediately
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playerId: mockScore.playerId,
          holeNumber: mockScore.holeNumber,
          strokes: mockScore.strokes,
        })
      );
    });

    it('should cache scores for immediate UI updates', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      offlineQueue.queueScore(mockScore);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_scores',
        expect.stringContaining(mockScore.playerId)
      );
    });

    it('should get cached scores for a game', () => {
      const cachedScores = [mockScore];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedScores));

      const result = offlineQueue.getCachedScores(mockScore.gameId);

      expect(result).toEqual(cachedScores);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('parparty_cached_scores');
    });
  });

  describe('Photo Queuing', () => {
    const mockPhoto: OfflinePhoto = {
      playerId: 'player1' as Id<"players">,
      gameId: 'game1' as Id<"games">,
      url: 'https://example.com/photo.jpg',
      caption: 'Great shot!',
      holeNumber: 5,
      timestamp: Date.now(),
      gpsLocation: { lat: 40.7128, lng: -74.0060 },
    };

    it('should queue photo when offline', () => {
      (navigator as any).onLine = false;
      
      offlineQueue.queuePhoto(mockPhoto);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_offline_queue',
        expect.stringContaining('"type":"photo"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_photos',
        expect.stringContaining(mockPhoto.url)
      );
    });

    it('should attempt immediate sync when online', async () => {
      (navigator as any).onLine = true;
      mockConvex.mutation.mockResolvedValue('photo123');

      offlineQueue.queuePhoto(mockPhoto);

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gameId: mockPhoto.gameId,
          playerId: mockPhoto.playerId,
          url: mockPhoto.url,
          caption: mockPhoto.caption,
        })
      );
    });
  });

  describe('Order Queuing', () => {
    const mockOrder: OfflineOrder = {
      playerId: 'player1' as Id<"players">,
      gameId: 'game1' as Id<"games">,
      courseId: 'course1' as Id<"courses">,
      items: [
        { name: 'Beer', quantity: 2, price: 6.00 },
        { name: 'Hot Dog', quantity: 1, price: 8.00 },
      ],
      totalAmount: 20.00,
      deliveryLocation: 'hole',
      holeNumber: 9,
      timestamp: Date.now(),
      specialInstructions: 'Extra mustard',
    };

    it('should queue order when offline', () => {
      (navigator as any).onLine = false;
      
      offlineQueue.queueOrder(mockOrder);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_offline_queue',
        expect.stringContaining('"type":"order"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_cached_orders',
        expect.stringContaining(mockOrder.playerId)
      );
    });

    it('should attempt immediate sync when online', async () => {
      (navigator as any).onLine = true;
      mockConvex.mutation.mockResolvedValue('order123');

      offlineQueue.queueOrder(mockOrder);

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playerId: mockOrder.playerId,
          gameId: mockOrder.gameId,
          courseId: mockOrder.courseId,
          items: mockOrder.items,
        })
      );
    });
  });

  describe('Offline Sync', () => {
    it('should not sync when offline', async () => {
      (navigator as any).onLine = false;

      await offlineQueue.syncWhenOnline();

      expect(mockConvex.mutation).not.toHaveBeenCalled();
    });

    it('should not sync when already in progress', async () => {
      (navigator as any).onLine = true;
      
      // Start first sync
      const syncPromise1 = offlineQueue.syncWhenOnline();
      
      // Start second sync immediately
      const syncPromise2 = offlineQueue.syncWhenOnline();

      await Promise.all([syncPromise1, syncPromise2]);

      // Should only sync once
      expect(mockConvex.mutation).toHaveBeenCalledTimes(0); // No queued items
    });

    it('should sync queued actions when online', async () => {
      const mockQueue = [
        {
          id: 'action1',
          type: 'score' as const,
          data: {
            playerId: 'player1' as Id<"players">,
            holeNumber: 1,
            strokes: 4,
          },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 5,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));
      mockConvex.mutation.mockResolvedValue('success');
      (navigator as any).onLine = true;

      await offlineQueue.syncWhenOnline();

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playerId: 'player1',
          holeNumber: 1,
          strokes: 4,
        })
      );
    });

    it('should handle sync failures with retry logic', async () => {
      const mockQueue = [
        {
          id: 'action1',
          type: 'score' as const,
          data: { playerId: 'player1', holeNumber: 1, strokes: 4 },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 2,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));
      mockConvex.mutation.mockRejectedValue(new Error('Network error'));
      (navigator as any).onLine = true;

      await offlineQueue.syncWhenOnline();

      // Should save failed action back to queue with incremented retry count
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_offline_queue',
        expect.stringContaining('"retryCount":1')
      );
    });

    it('should remove actions that exceed max retries', async () => {
      const mockQueue = [
        {
          id: 'action1',
          type: 'score' as const,
          data: { playerId: 'player1', holeNumber: 1, strokes: 4 },
          timestamp: Date.now(),
          retryCount: 5,
          maxRetries: 3,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));
      mockConvex.mutation.mockRejectedValue(new Error('Network error'));
      (navigator as any).onLine = true;

      await offlineQueue.syncWhenOnline();

      // Should save empty queue (action removed due to max retries exceeded)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_offline_queue',
        '[]'
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear all cached data', () => {
      offlineQueue.clearAllCachedData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_offline_queue');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_scores');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_photos');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_cached_orders');
    });

    it('should provide queue status', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      (navigator as any).onLine = true;

      const status = offlineQueue.getQueueStatus();

      expect(status).toEqual({
        queueLength: 0,
        cachedScores: 0,
        cachedPhotos: 0,
        cachedOrders: 0,
        isOnline: true,
        syncInProgress: false,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = offlineQueue.getCachedScores('game1' as Id<"games">);

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = offlineQueue.getCachedScores('game1' as Id<"games">);

      expect(result).toEqual([]);
    });

    it('should handle sync errors without crashing', async () => {
      const mockQueue = [
        {
          id: 'action1',
          type: 'score' as const,
          data: { playerId: 'player1', holeNumber: 1, strokes: 4 },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));
      mockConvex.mutation.mockRejectedValue(new Error('Sync error'));
      (navigator as any).onLine = true;

      // Should not throw
      await expect(offlineQueue.syncWhenOnline()).resolves.toBeUndefined();
    });
  });
});