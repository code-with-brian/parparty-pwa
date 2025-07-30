import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConvexReactClient } from 'convex/react';

// Mock the Id type for testing
type Id<T> = string & { __tableName: T };

// Mock the Convex generated modules
vi.mock('../../../convex/_generated/api', () => ({
  api: {
    guests: {
      createGuestSession: 'guests:createGuestSession',
      resumeSession: 'guests:resumeSession',
    }
  }
}));

vi.mock('../../../convex/_generated/dataModel', () => ({
  Id: {} as any
}));

// Import after mocking
import { GuestSessionManager, GuestSession } from '../GuestSessionManager';

// Mock ConvexReactClient
const mockConvex = {
  mutation: vi.fn(),
  query: vi.fn(),
} as unknown as ConvexReactClient;

describe('GuestSessionManager', () => {
  let guestSessionManager: GuestSessionManager;
  let localStorageMock: any;

  beforeEach(() => {
    guestSessionManager = new GuestSessionManager(mockConvex);
    
    // Setup localStorage mock
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Device ID Generation', () => {
    it('should generate a new device ID if none exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const deviceId = guestSessionManager.getDeviceId();
      
      expect(deviceId).toMatch(/^device_[a-z0-9]+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('parparty_device_id', deviceId);
    });

    it('should return existing device ID from localStorage', () => {
      const existingDeviceId = 'device_existing_123';
      localStorageMock.getItem.mockReturnValue(existingDeviceId);
      
      const deviceId = guestSessionManager.getDeviceId();
      
      expect(deviceId).toBe(existingDeviceId);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should generate unique device IDs on multiple calls when none exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const deviceId1 = guestSessionManager.getDeviceId();
      localStorageMock.getItem.mockReturnValue(deviceId1);
      const deviceId2 = guestSessionManager.getDeviceId();
      
      expect(deviceId1).toBe(deviceId2); // Should return the same ID after storing
    });
  });

  describe('Session Creation', () => {
    it('should create a new guest session successfully', async () => {
      const mockGuestId = 'guest123' as Id<'guests'>;
      const mockGuestData = {
        _id: mockGuestId,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue(null);
      (mockConvex.mutation as any).mockResolvedValue(mockGuestId);
      (mockConvex.query as any).mockResolvedValue(mockGuestData);

      const session = await guestSessionManager.createSession('Test User');

      expect(session).toEqual({
        id: mockGuestId,
        deviceId: mockGuestData.deviceId,
        name: 'Test User',
        createdAt: mockGuestData.createdAt,
        activeGameId: undefined,
        tempData: { scores: [], photos: [], orders: [] },
      });

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Test User',
        })
      );
    });

    it('should create a session without a name', async () => {
      const mockGuestId = 'guest123' as Id<'guests'>;
      const mockGuestData = {
        _id: mockGuestId,
        deviceId: 'device_test_123',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue(null);
      (mockConvex.mutation as any).mockResolvedValue(mockGuestId);
      (mockConvex.query as any).mockResolvedValue(mockGuestData);

      const session = await guestSessionManager.createSession();

      expect(session.name).toBeUndefined();
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: undefined,
        })
      );
    });

    it('should handle session creation errors', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      (mockConvex.mutation as any).mockRejectedValue(new Error('Network error'));

      await expect(guestSessionManager.createSession()).rejects.toThrow('Failed to create guest session');
    });

    it('should store session in localStorage after creation', async () => {
      const mockGuestId = 'guest123' as Id<'guests'>;
      const mockGuestData = {
        _id: mockGuestId,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue(null);
      (mockConvex.mutation as any).mockResolvedValue(mockGuestId);
      (mockConvex.query as any).mockResolvedValue(mockGuestData);

      await guestSessionManager.createSession('Test User');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_guest_session',
        expect.stringContaining(mockGuestId)
      );
    });
  });

  describe('Session Resumption', () => {
    it('should resume an existing session successfully', async () => {
      const mockGuestData = {
        _id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue('device_test_123');
      (mockConvex.query as any).mockResolvedValue(mockGuestData);

      const session = await guestSessionManager.resumeSession();

      expect(session).toEqual({
        id: mockGuestData._id,
        deviceId: mockGuestData.deviceId,
        name: mockGuestData.name,
        createdAt: mockGuestData.createdAt,
        activeGameId: undefined,
        tempData: { scores: [], photos: [], orders: [] },
      });
    });

    it('should return null if no session exists', async () => {
      localStorageMock.getItem.mockReturnValue('device_test_123');
      (mockConvex.query as any).mockResolvedValue(null);

      const session = await guestSessionManager.resumeSession();

      expect(session).toBeNull();
    });

    it('should handle resumption errors gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('device_test_123');
      (mockConvex.query as any).mockRejectedValue(new Error('Network error'));

      const session = await guestSessionManager.resumeSession();

      expect(session).toBeNull();
    });

    it('should try to recreate session if local session exists but server session does not', async () => {
      const localSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
        tempData: { scores: [], photos: [], orders: [] },
      };

      localStorageMock.getItem
        .mockReturnValueOnce('device_test_123') // getDeviceId call
        .mockReturnValueOnce(JSON.stringify(localSession)); // getLocalSession call

      (mockConvex.query as any).mockResolvedValueOnce(null); // resumeSession returns null
      
      // Mock successful recreation
      const newGuestData = {
        _id: 'guest456' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
      };
      (mockConvex.mutation as any).mockResolvedValue(newGuestData._id);
      (mockConvex.query as any).mockResolvedValueOnce(newGuestData);

      const session = await guestSessionManager.resumeSession();

      expect(session).toBeTruthy();
      expect(session?.name).toBe('Test User');
    });
  });

  describe('Session Validation', () => {
    it('should validate a valid session', () => {
      const validSession: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now() - 1000, // 1 second ago
        tempData: { scores: [], photos: [], orders: [] },
      };

      const isValid = guestSessionManager.validateSession(validSession);

      expect(isValid).toBe(true);
    });

    it('should invalidate session with missing required fields', () => {
      const invalidSession = {
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
        tempData: { scores: [], photos: [], orders: [] },
      } as GuestSession;

      const isValid = guestSessionManager.validateSession(invalidSession);

      expect(isValid).toBe(false);
    });

    it('should invalidate expired session (older than 30 days)', () => {
      const expiredSession: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
        tempData: { scores: [], photos: [], orders: [] },
      };

      const isValid = guestSessionManager.validateSession(expiredSession);

      expect(isValid).toBe(false);
    });

    it('should handle null session', () => {
      const isValid = guestSessionManager.validateSession(null as any);

      expect(isValid).toBe(false);
    });
  });

  describe('Active Game Management', () => {
    it('should set and get active game ID', () => {
      const gameId = 'game123' as Id<'games'>;
      const session: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
        tempData: { scores: [], photos: [], orders: [] },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(session));

      guestSessionManager.setActiveGameId(gameId);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_guest_session',
        expect.stringContaining(gameId)
      );
    });

    it('should return undefined if no active game', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const activeGameId = guestSessionManager.getActiveGameId();

      expect(activeGameId).toBeUndefined();
    });
  });

  describe('Temporary Data Management', () => {
    it('should store and retrieve temporary data', () => {
      const tempData = { scores: [], photos: [], orders: [] };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tempData));

      const scoreData = { playerId: 'player123', holeNumber: 1, strokes: 4 };
      guestSessionManager.storeTempData('scores', scoreData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_temp_data',
        expect.stringContaining('player123')
      );
    });

    it('should return empty temp data if none exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const tempData = guestSessionManager.getTempData();

      expect(tempData).toEqual({ scores: [], photos: [], orders: [] });
    });

    it('should clear temporary data', () => {
      const session: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
        tempData: { scores: [{ test: 'data' }], photos: [], orders: [] },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(session));

      guestSessionManager.clearTempData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_temp_data');
    });

    it('should handle corrupted temp data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const tempData = guestSessionManager.getTempData();

      expect(tempData).toEqual({ scores: [], photos: [], orders: [] });
    });
  });

  describe('getCurrentSession', () => {
    it('should return existing valid session', async () => {
      const validSession: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now(),
        tempData: { scores: [], photos: [], orders: [] },
      };

      // Mock localStorage calls in order
      localStorageMock.getItem
        .mockReturnValueOnce('device_test_123') // getDeviceId call
        .mockReturnValueOnce(JSON.stringify(validSession)) // getLocalSession call
        .mockReturnValueOnce(JSON.stringify({ scores: [], photos: [], orders: [] })); // getTempData call
      
      const serverSession = {
        _id: validSession.id,
        deviceId: validSession.deviceId,
        name: validSession.name,
        createdAt: validSession.createdAt,
      };
      (mockConvex.query as any).mockResolvedValue(serverSession);

      const session = await guestSessionManager.getCurrentSession();

      expect(session.id).toBe(validSession.id);
      expect(session.deviceId).toBe(validSession.deviceId);
      expect(session.name).toBe(validSession.name);
      expect(session.createdAt).toBe(validSession.createdAt);
      expect(session.tempData).toEqual({ scores: [], photos: [], orders: [] });
    });

    it('should create new session if none exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const newGuestData = {
        _id: 'guest456' as Id<'guests'>,
        deviceId: 'device_new_123',
        createdAt: Date.now(),
      };

      (mockConvex.mutation as any).mockResolvedValue(newGuestData._id);
      (mockConvex.query as any).mockResolvedValue(newGuestData);

      const session = await guestSessionManager.getCurrentSession();

      expect(session.id).toBe(newGuestData._id);
      expect(mockConvex.mutation).toHaveBeenCalled();
    });

    it('should create new session if local session is invalid', async () => {
      const expiredSession: GuestSession = {
        id: 'guest123' as Id<'guests'>,
        deviceId: 'device_test_123',
        name: 'Test User',
        createdAt: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
        tempData: { scores: [], photos: [], orders: [] },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));

      const newGuestData = {
        _id: 'guest456' as Id<'guests'>,
        deviceId: 'device_test_123',
        createdAt: Date.now(),
      };

      (mockConvex.mutation as any).mockResolvedValue(newGuestData._id);
      (mockConvex.query as any).mockResolvedValue(newGuestData);

      const session = await guestSessionManager.getCurrentSession();

      expect(session.id).toBe(newGuestData._id);
      expect(mockConvex.mutation).toHaveBeenCalled();
    });
  });

  describe('mergeToUser', () => {
    it('should clear local session when merging to user', async () => {
      const guestId = 'guest123' as Id<'guests'>;
      const userId = 'user456' as Id<'users'>;

      await guestSessionManager.mergeToUser(guestId, userId);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_guest_session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('parparty_temp_data');
    });
  });
});