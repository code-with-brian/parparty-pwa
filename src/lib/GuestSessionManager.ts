import { api } from "../../convex/_generated/api";
import { ConvexReactClient } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";

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
  private static readonly DEVICE_ID_KEY = "parparty_device_id";
  private static readonly GUEST_SESSION_KEY = "parparty_guest_session";
  private static readonly TEMP_DATA_KEY = "parparty_temp_data";

  constructor(convex: ConvexReactClient) {
    this.convex = convex;
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
      // This would be implemented when user conversion is built
      // For now, we'll just clear the local session
      this.clearLocalSession();
      console.log(`Guest ${guestId} would be merged to user ${userId}`);
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
      // Verify with server
      const serverSession = await this.resumeSession(localSession.deviceId);
      if (serverSession) {
        return serverSession;
      }
    }

    // Create new session if none exists or validation failed
    return await this.createSession();
  }
}