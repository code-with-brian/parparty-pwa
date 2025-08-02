import { api } from "../../convex/_generated/api";
import { ConvexReactClient } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { OfflineQueueManager } from "./OfflineQueueManager";
import { ErrorRecoveryManager } from "./ErrorRecoveryManager";
import { GameDataCache } from "./GameDataCache";
import { logger } from "../utils/logger";

export interface GuestSession {
  id: Id<"guests">;
  deviceId: string;
  name?: string;
  createdAt: number;
  activeGameId?: Id<"games">;
  tempData: {
    scores: any[];
    photos: any[];
    orders: any[];
  };
}

export interface GuestSessionData {
  _id: Id<"guests">;
  deviceId: string;
  name?: string;
  createdAt: number;
}

export class GuestSessionManager {
  private convex: ConvexReactClient;
  private offlineQueue?: OfflineQueueManager;
  private errorRecovery?: ErrorRecoveryManager;
  private static readonly DEVICE_ID_KEY = "parparty_device_id";
  private static readonly GUEST_SESSION_KEY = "parparty_guest_session";
  private static readonly TEMP_DATA_KEY = "parparty_temp_data";

  constructor(convex: ConvexReactClient, offlineQueue?: OfflineQueueManager, errorRecovery?: ErrorRecoveryManager) {
    this.convex = convex;
    this.offlineQueue = offlineQueue;
    this.errorRecovery = errorRecovery;
  }

  /**
   * Generate a unique device ID for this device
   */
  private generateDeviceId(): string {
    // Check if device ID already exists in localStorage
    const existingDeviceId = localStorage.getItem(GuestSessionManager.DEVICE_ID_KEY);
    if (existingDeviceId) {
      return existingDeviceId;
    }

    // Generate new device ID using timestamp + random string
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const deviceId = `device_${timestamp}_${randomPart}`;
    
    // Store in localStorage for persistence
    localStorage.setItem(GuestSessionManager.DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  }

  /**
   * Get the current device ID
   */
  public getDeviceId(): string {
    return this.generateDeviceId();
  }

  /**
   * Create a new guest session or return existing one
   */
  public async createSession(name?: string): Promise<GuestSession> {
    try {
      const deviceId = this.getDeviceId();
      
      // Call Convex mutation to create/update guest session
      const guestId = await this.convex.mutation(api.guests.createGuestSession, {
        deviceId,
        name,
      });

      // Get the full guest data
      const guestData = await this.convex.query(api.guests.resumeSession, {
        deviceId,
      });

      if (!guestData) {
        throw new Error("Failed to create guest session");
      }

      // Create guest session object
      const guestSession: GuestSession = {
        id: guestData._id,
        deviceId: guestData.deviceId,
        name: guestData.name,
        createdAt: guestData.createdAt,
        activeGameId: this.getActiveGameId(),
        tempData: this.getTempData(),
      };

      // Store session in localStorage
      this.storeSessionLocally(guestSession);

      return guestSession;
    } catch (error) {
      console.error("Error creating guest session:", error);
      throw new Error("Failed to create guest session");
    }
  }

  /**
   * Resume an existing guest session
   */
  public async resumeSession(deviceId?: string): Promise<GuestSession | null> {
    try {
      const targetDeviceId = deviceId || this.getDeviceId();
      
      // Try to get session from Convex
      const guestData = await this.convex.query(api.guests.resumeSession, {
        deviceId: targetDeviceId,
      });

      if (!guestData) {
        // Check if we have a local session that might be out of sync
        const localSession = this.getLocalSession();
        if (localSession && localSession.deviceId === targetDeviceId) {
          // Try to recreate the session
          return await this.createSession(localSession.name);
        }
        return null;
      }

      // Create guest session object
      const guestSession: GuestSession = {
        id: guestData._id,
        deviceId: guestData.deviceId,
        name: guestData.name,
        createdAt: guestData.createdAt,
        activeGameId: this.getActiveGameId(),
        tempData: this.getTempData(),
      };

      // Update local storage
      this.storeSessionLocally(guestSession);

      return guestSession;
    } catch (error) {
      console.error("Error resuming guest session:", error);
      return null;
    }
  }

  /**
   * Merge guest session data to a permanent user account
   */
  public async mergeToUser(guestId: Id<"guests">, userId: Id<"users">): Promise<void> {
    try {
      // Call the conversion function which handles all data migration
      const result = await this.convex.mutation(api.userConversion.convertGuestToUser, {
        guestId,
        name: "Converted User", // This will be overridden by the actual conversion flow
        tokenIdentifier: `converted_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      });

      if (result.success) {
        // Preserve active game ID before clearing session
        const activeGameId = this.getActiveGameId();
        
        // Clear local guest session data since it's now merged
        this.clearLocalSession();
        
        // If there was an active game, store it for the user session
        if (activeGameId) {
          localStorage.setItem('parparty_user_active_game', activeGameId);
        }
        
        logger.info('Guest session successfully merged to user account', {
          component: 'GuestSessionManager',
          action: 'mergeToUser',
          guestId,
          userId,
          preservedActiveGame: activeGameId,
        });
      } else {
        throw new Error("Conversion failed");
      }
    } catch (error) {
      console.error("Error merging guest to user:", error);
      throw new Error("Failed to merge guest session to user");
    }
  }

  /**
   * Set the active game ID for the current session
   */
  public setActiveGameId(gameId: Id<"games">): void {
    const session = this.getLocalSession();
    if (session) {
      session.activeGameId = gameId;
      this.storeSessionLocally(session);
    }
  }

  /**
   * Get the active game ID
   */
  public getActiveGameId(): Id<"games"> | undefined {
    const session = this.getLocalSession();
    return session?.activeGameId;
  }

  /**
   * Store temporary data (scores, photos, orders) locally
   */
  public storeTempData(type: 'scores' | 'photos' | 'orders', data: any): void {
    const tempData = this.getTempData();
    tempData[type].push(data);
    localStorage.setItem(GuestSessionManager.TEMP_DATA_KEY, JSON.stringify(tempData));
    
    // Update session object
    const session = this.getLocalSession();
    if (session) {
      session.tempData = tempData;
      this.storeSessionLocally(session);
    }
  }

  /**
   * Get temporary data
   */
  public getTempData(): { scores: any[]; photos: any[]; orders: any[] } {
    const stored = localStorage.getItem(GuestSessionManager.TEMP_DATA_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing temp data:", error);
      }
    }
    return { scores: [], photos: [], orders: [] };
  }

  /**
   * Clear temporary data
   */
  public clearTempData(): void {
    localStorage.removeItem(GuestSessionManager.TEMP_DATA_KEY);
    const session = this.getLocalSession();
    if (session) {
      session.tempData = { scores: [], photos: [], orders: [] };
      this.storeSessionLocally(session);
    }
  }

  /**
   * Validate guest session
   */
  public validateSession(session: GuestSession): boolean {
    if (!session || !session.id || !session.deviceId) {
      return false;
    }

    // Check if session is not too old (30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const sessionAge = Date.now() - session.createdAt;
    
    if (sessionAge > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Get current session from localStorage
   */
  private getLocalSession(): GuestSession | null {
    const stored = localStorage.getItem(GuestSessionManager.GUEST_SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        return this.validateSession(session) ? session : null;
      } catch (error) {
        console.error("Error parsing local session:", error);
        this.clearLocalSession();
      }
    }
    return null;
  }

  /**
   * Store session in localStorage
   */
  private storeSessionLocally(session: GuestSession): void {
    try {
      localStorage.setItem(GuestSessionManager.GUEST_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Error storing session locally:", error);
    }
  }

  /**
   * Clear local session data
   */
  private clearLocalSession(): void {
    localStorage.removeItem(GuestSessionManager.GUEST_SESSION_KEY);
    localStorage.removeItem(GuestSessionManager.TEMP_DATA_KEY);
  }

  /**
   * Get current session (from local storage or create new)
   */
  public async getCurrentSession(): Promise<GuestSession> {
    // Try to get existing session
    const localSession = this.getLocalSession();
    if (localSession) {
      // If offline, return local session
      if (!navigator.onLine) {
        logger.debug('Using cached guest session due to offline mode', {
          component: 'GuestSessionManager',
          action: 'getGuestSession',
          offline: true,
        });
        return localSession;
      }

      // If online, verify with server
      try {
        const serverSession = await this.resumeSession(localSession.deviceId);
        if (serverSession) {
          return serverSession;
        }
      } catch (error) {
        // If server verification fails, use local session as fallback
        if (this.errorRecovery) {
          await this.errorRecovery.handleError(error as Error, 'getCurrentSession');
        }
        logger.warn('Server verification failed, using local session', {
          component: 'GuestSessionManager',
          action: 'getGuestSession',
          error: 'verification_failed',
        });
        return localSession;
      }
    }

    // Create new session if none exists or validation failed
    try {
      return await this.createSession();
    } catch (error) {
      // If session creation fails and we have offline support, create offline session
      if (!navigator.onLine) {
        return this.createOfflineSession();
      }
      throw error;
    }
  }

  /**
   * Create an offline-only guest session
   */
  private createOfflineSession(): GuestSession {
    const deviceId = this.getDeviceId();
    const offlineSession: GuestSession = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2)}` as Id<"guests">,
      deviceId,
      name: undefined,
      createdAt: Date.now(),
      activeGameId: this.getActiveGameId(),
      tempData: this.getTempData(),
    };

    this.storeSessionLocally(offlineSession);
    logger.info('Created offline guest session', {
      component: 'GuestSessionManager',
      action: 'createOfflineGuestSession',
      deviceId: offlineSession.deviceId,
    });
    return offlineSession;
  }

  /**
   * Record score with offline support
   */
  public async recordScore(
    playerId: Id<"players">,
    gameId: Id<"games">,
    holeNumber: number,
    strokes: number,
    putts?: number,
    gpsLocation?: { lat: number; lng: number }
  ): Promise<void> {
    const scoreData = {
      playerId,
      gameId,
      holeNumber,
      strokes,
      putts,
      timestamp: Date.now(),
      gpsLocation,
    };

    if (this.offlineQueue) {
      // Use offline queue which handles online/offline automatically
      this.offlineQueue.queueScore(scoreData);
    } else {
      // Fallback to direct API call
      try {
        await this.convex.mutation(api.games.recordScore, scoreData);
      } catch (error) {
        if (this.errorRecovery) {
          await this.errorRecovery.handleError(error as Error, 'recordScore');
        }
        throw error;
      }
    }

    // Store in temp data for immediate UI updates
    this.storeTempData('scores', scoreData);
  }

  /**
   * Upload photo with offline support
   */
  public async uploadPhoto(
    playerId: Id<"players">,
    gameId: Id<"games">,
    url: string,
    caption?: string,
    holeNumber?: number,
    gpsLocation?: { lat: number; lng: number }
  ): Promise<void> {
    const photoData = {
      playerId,
      gameId,
      url,
      caption,
      holeNumber,
      timestamp: Date.now(),
      gpsLocation,
    };

    if (this.offlineQueue) {
      // Use offline queue which handles online/offline automatically
      this.offlineQueue.queuePhoto(photoData);
    } else {
      // Fallback to direct API call
      try {
        await this.convex.mutation(api.photos.uploadPhoto, {
          gameId,
          playerId,
          url,
          caption,
          holeNumber,
          gpsLocation,
        });
      } catch (error) {
        if (this.errorRecovery) {
          await this.errorRecovery.handleError(error as Error, 'uploadPhoto');
        }
        throw error;
      }
    }

    // Store in temp data for immediate UI updates
    this.storeTempData('photos', photoData);
  }

  /**
   * Place food order with offline support
   */
  public async placeOrder(
    playerId: Id<"players">,
    gameId: Id<"games">,
    courseId: Id<"courses">,
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      description?: string;
    }>,
    deliveryLocation: "hole" | "clubhouse" | "cart",
    holeNumber?: number,
    specialInstructions?: string
  ): Promise<void> {
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
      playerId,
      gameId,
      courseId,
      items,
      totalAmount,
      deliveryLocation,
      holeNumber,
      timestamp: Date.now(),
      specialInstructions,
    };

    if (this.offlineQueue) {
      // Use offline queue which handles online/offline automatically
      this.offlineQueue.queueOrder(orderData);
    } else {
      // Fallback to direct API call
      try {
        await this.convex.mutation(api.foodOrders.placeOrder, {
          playerId,
          gameId,
          courseId,
          items,
          deliveryLocation,
          holeNumber,
          specialInstructions,
        });
      } catch (error) {
        if (this.errorRecovery) {
          await this.errorRecovery.handleError(error as Error, 'placeOrder');
        }
        throw error;
      }
    }

    // Store in temp data for immediate UI updates
    this.storeTempData('orders', orderData);
  }

  /**
   * Get game data with offline fallback
   */
  public async getGameData(gameId: Id<"games">): Promise<any> {
    try {
      // Try to get fresh data from server
      const gameData = await this.convex.query(api.games.getGameData, { gameId });
      
      // Cache the data for offline use
      if (gameData) {
        GameDataCache.cacheGameData(gameId, gameData);
      }
      
      return gameData;
    } catch (error) {
      // If online request fails, try cached data
      const cachedData = GameDataCache.getCachedGameData(gameId);
      if (cachedData) {
        logger.debug('Using cached game data due to network error', {
          component: 'GuestSessionManager',
          action: 'getGameData',
          gameId,
          error: 'network_error',
        });
        
        // Merge with offline data if available
        if (this.offlineQueue) {
          const offlineScores = this.offlineQueue.getCachedScores(gameId);
          const offlinePhotos = this.offlineQueue.getCachedPhotos(gameId);
          GameDataCache.mergeOfflineData(gameId, offlineScores, offlinePhotos);
        }
        
        return cachedData;
      }

      // If no cached data available, handle error
      if (this.errorRecovery) {
        await this.errorRecovery.handleError(error as Error, 'getGameData');
      }
      
      throw error;
    }
  }

  /**
   * Get game state with offline fallback
   */
  public async getGameState(gameId: Id<"games">): Promise<any> {
    try {
      // Try to get fresh state from server
      const gameState = await this.convex.query(api.games.getGameState, { gameId });
      
      // Cache the state for offline use
      if (gameState) {
        GameDataCache.cacheGameState(gameId, gameState);
      }
      
      return gameState;
    } catch (error) {
      // If online request fails, try cached state
      const cachedState = GameDataCache.getCachedGameState(gameId);
      if (cachedState) {
        logger.debug('Using cached game state due to network error', {
          component: 'GuestSessionManager',
          action: 'getGameState',
          gameId,
          error: 'network_error',
        });
        return cachedState;
      }

      // If no cached state available, handle error
      if (this.errorRecovery) {
        await this.errorRecovery.handleError(error as Error, 'getGameState');
      }
      
      throw error;
    }
  }

  /**
   * Sync offline data when back online
   */
  public async syncOfflineData(): Promise<void> {
    if (this.offlineQueue) {
      await this.offlineQueue.syncWhenOnline();
    }
  }

  /**
   * Get offline status and queue information
   */
  public getOfflineStatus(): {
    isOnline: boolean;
    queueLength: number;
    cachedScores: number;
    cachedPhotos: number;
    cachedOrders: number;
    syncInProgress: boolean;
  } | null {
    if (this.offlineQueue) {
      return this.offlineQueue.getQueueStatus();
    }
    return null;
  }

  /**
   * Clear all offline data
   */
  public clearOfflineData(): void {
    if (this.offlineQueue) {
      this.offlineQueue.clearAllCachedData();
    }
    GameDataCache.clearAllCachedData();
    this.clearTempData();
  }
}