import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface QueuedAction {
  id: string;
  type: 'score' | 'photo' | 'order' | 'social_post';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  playerId?: Id<"players">;
  gameId?: Id<"games">;
}

export interface OfflineScore {
  playerId: Id<"players">;
  gameId: Id<"games">;
  holeNumber: number;
  strokes: number;
  putts?: number;
  timestamp: number;
  gpsLocation?: { lat: number; lng: number };
}

export interface OfflinePhoto {
  playerId: Id<"players">;
  gameId: Id<"games">;
  url: string;
  caption?: string;
  holeNumber?: number;
  timestamp: number;
  gpsLocation?: { lat: number; lng: number };
  localFile?: File; // For storing the actual file when offline
}

export interface OfflineOrder {
  playerId: Id<"players">;
  gameId: Id<"games">;
  courseId: Id<"courses">;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    description?: string;
  }>;
  totalAmount: number;
  deliveryLocation: "hole" | "clubhouse" | "cart";
  holeNumber?: number;
  timestamp: number;
  specialInstructions?: string;
}

export class OfflineQueueManager {
  private convex: ConvexReactClient;
  private static readonly QUEUE_KEY = "parparty_offline_queue";
  private static readonly CACHED_SCORES_KEY = "parparty_cached_scores";
  private static readonly CACHED_PHOTOS_KEY = "parparty_cached_photos";
  private static readonly CACHED_ORDERS_KEY = "parparty_cached_orders";
  private syncInProgress = false;
  private onlineStatusCallbacks: Array<(isOnline: boolean) => void> = [];

  constructor(convex: ConvexReactClient) {
    this.convex = convex;
    this.setupNetworkListeners();
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network: Back online, starting sync...');
        this.notifyOnlineStatusChange(true);
        this.syncWhenOnline();
      });

      window.addEventListener('offline', () => {
        console.log('Network: Gone offline, queuing actions...');
        this.notifyOnlineStatusChange(false);
      });
    }
  }

  /**
   * Check if we're currently online
   */
  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Register callback for online status changes
   */
  public onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineStatusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onlineStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.onlineStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks of online status change
   */
  private notifyOnlineStatusChange(isOnline: boolean): void {
    this.onlineStatusCallbacks.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in online status callback:', error);
      }
    });
  }

  /**
   * Generate unique ID for queued actions
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get current queue from localStorage
   */
  private getQueue(): QueuedAction[] {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline queue:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: QueuedAction[]): void {
    try {
      localStorage.setItem(OfflineQueueManager.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Add action to offline queue
   */
  private queueAction(action: Omit<QueuedAction, 'id' | 'retryCount'>): void {
    const queue = this.getQueue();
    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateActionId(),
      retryCount: 0,
    };
    
    queue.push(queuedAction);
    this.saveQueue(queue);
    
    console.log(`Queued ${action.type} action for offline sync:`, queuedAction);
  }

  /**
   * Queue score entry for offline sync
   */
  public queueScore(scoreData: OfflineScore): void {
    // Store in cached scores for immediate UI updates
    this.addToCachedScores(scoreData);
    
    if (this.isOnline()) {
      // If online, try to sync immediately
      this.syncScore(scoreData);
    } else {
      // If offline, queue for later
      this.queueAction({
        type: 'score',
        data: scoreData,
        timestamp: Date.now(),
        maxRetries: 5,
        playerId: scoreData.playerId,
        gameId: scoreData.gameId,
      });
    }
  }

  /**
   * Queue photo upload for offline sync
   */
  public queuePhoto(photoData: OfflinePhoto): void {
    // Store in cached photos for immediate UI updates
    this.addToCachedPhotos(photoData);
    
    if (this.isOnline()) {
      // If online, try to sync immediately
      this.syncPhoto(photoData);
    } else {
      // If offline, queue for later
      this.queueAction({
        type: 'photo',
        data: photoData,
        timestamp: Date.now(),
        maxRetries: 3,
        playerId: photoData.playerId,
        gameId: photoData.gameId,
      });
    }
  }

  /**
   * Queue food order for offline sync
   */
  public queueOrder(orderData: OfflineOrder): void {
    // Store in cached orders for immediate UI updates
    this.addToCachedOrders(orderData);
    
    if (this.isOnline()) {
      // If online, try to sync immediately
      this.syncOrder(orderData);
    } else {
      // If offline, queue for later
      this.queueAction({
        type: 'order',
        data: orderData,
        timestamp: Date.now(),
        maxRetries: 3,
        playerId: orderData.playerId,
        gameId: orderData.gameId,
      });
    }
  }

  /**
   * Sync all queued actions when back online
   */
  public async syncWhenOnline(): Promise<void> {
    if (!this.isOnline() || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log('Starting offline queue sync...');

    try {
      const queue = this.getQueue();
      const successfulActions: string[] = [];
      const failedActions: QueuedAction[] = [];

      for (const action of queue) {
        try {
          let success = false;

          switch (action.type) {
            case 'score':
              success = await this.syncScore(action.data);
              break;
            case 'photo':
              success = await this.syncPhoto(action.data);
              break;
            case 'order':
              success = await this.syncOrder(action.data);
              break;
            default:
              console.warn(`Unknown action type: ${action.type}`);
              success = true; // Remove unknown actions
          }

          if (success) {
            successfulActions.push(action.id);
            console.log(`Successfully synced ${action.type} action:`, action.id);
          } else {
            // Increment retry count
            action.retryCount++;
            if (action.retryCount < action.maxRetries) {
              failedActions.push(action);
            } else {
              console.error(`Max retries exceeded for ${action.type} action:`, action.id);
              // Could notify user about failed action
            }
          }
        } catch (error) {
          console.error(`Error syncing ${action.type} action:`, error);
          action.retryCount++;
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          }
        }
      }

      // Update queue with only failed actions that haven't exceeded max retries
      this.saveQueue(failedActions);
      
      console.log(`Sync complete: ${successfulActions.length} successful, ${failedActions.length} remaining`);
    } catch (error) {
      console.error('Error during offline sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual score
   */
  private async syncScore(scoreData: OfflineScore): Promise<boolean> {
    try {
      await this.convex.mutation(api.games.recordScore, {
        playerId: scoreData.playerId,
        holeNumber: scoreData.holeNumber,
        strokes: scoreData.strokes,
        putts: scoreData.putts,
        gpsLocation: scoreData.gpsLocation,
      });
      
      // Remove from cached scores after successful sync
      this.removeFromCachedScores(scoreData);
      return true;
    } catch (error) {
      console.error('Error syncing score:', error);
      return false;
    }
  }

  /**
   * Sync individual photo
   */
  private async syncPhoto(photoData: OfflinePhoto): Promise<boolean> {
    try {
      // If we have a local file, we'd need to upload it first
      // For now, assume URL is already available
      await this.convex.mutation(api.photos.uploadPhoto, {
        gameId: photoData.gameId,
        playerId: photoData.playerId,
        url: photoData.url,
        caption: photoData.caption,
        holeNumber: photoData.holeNumber,
        gpsLocation: photoData.gpsLocation,
      });
      
      // Remove from cached photos after successful sync
      this.removeFromCachedPhotos(photoData);
      return true;
    } catch (error) {
      console.error('Error syncing photo:', error);
      return false;
    }
  }

  /**
   * Sync individual order
   */
  private async syncOrder(orderData: OfflineOrder): Promise<boolean> {
    try {
      await this.convex.mutation(api.foodOrders.placeOrder, {
        playerId: orderData.playerId,
        gameId: orderData.gameId,
        courseId: orderData.courseId,
        items: orderData.items,
        deliveryLocation: orderData.deliveryLocation,
        holeNumber: orderData.holeNumber,
        specialInstructions: orderData.specialInstructions,
      });
      
      // Remove from cached orders after successful sync
      this.removeFromCachedOrders(orderData);
      return true;
    } catch (error) {
      console.error('Error syncing order:', error);
      return false;
    }
  }

  /**
   * Get cached scores for immediate UI updates
   */
  public getCachedScores(gameId: Id<"games">): OfflineScore[] {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_SCORES_KEY);
      const allScores: OfflineScore[] = stored ? JSON.parse(stored) : [];
      return allScores.filter(score => score.gameId === gameId);
    } catch (error) {
      console.error('Error reading cached scores:', error);
      return [];
    }
  }

  /**
   * Get cached photos for immediate UI updates
   */
  public getCachedPhotos(gameId: Id<"games">): OfflinePhoto[] {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_PHOTOS_KEY);
      const allPhotos: OfflinePhoto[] = stored ? JSON.parse(stored) : [];
      return allPhotos.filter(photo => photo.gameId === gameId);
    } catch (error) {
      console.error('Error reading cached photos:', error);
      return [];
    }
  }

  /**
   * Get cached orders for immediate UI updates
   */
  public getCachedOrders(gameId: Id<"games">): OfflineOrder[] {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_ORDERS_KEY);
      const allOrders: OfflineOrder[] = stored ? JSON.parse(stored) : [];
      return allOrders.filter(order => order.gameId === gameId);
    } catch (error) {
      console.error('Error reading cached orders:', error);
      return [];
    }
  }

  /**
   * Add score to cached scores
   */
  private addToCachedScores(scoreData: OfflineScore): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_SCORES_KEY);
      const scores: OfflineScore[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing score for same player/hole if exists
      const filteredScores = scores.filter(
        score => !(score.playerId === scoreData.playerId && score.holeNumber === scoreData.holeNumber)
      );
      
      filteredScores.push(scoreData);
      localStorage.setItem(OfflineQueueManager.CACHED_SCORES_KEY, JSON.stringify(filteredScores));
    } catch (error) {
      console.error('Error caching score:', error);
    }
  }

  /**
   * Add photo to cached photos
   */
  private addToCachedPhotos(photoData: OfflinePhoto): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_PHOTOS_KEY);
      const photos: OfflinePhoto[] = stored ? JSON.parse(stored) : [];
      photos.push(photoData);
      localStorage.setItem(OfflineQueueManager.CACHED_PHOTOS_KEY, JSON.stringify(photos));
    } catch (error) {
      console.error('Error caching photo:', error);
    }
  }

  /**
   * Add order to cached orders
   */
  private addToCachedOrders(orderData: OfflineOrder): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_ORDERS_KEY);
      const orders: OfflineOrder[] = stored ? JSON.parse(stored) : [];
      orders.push(orderData);
      localStorage.setItem(OfflineQueueManager.CACHED_ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('Error caching order:', error);
    }
  }

  /**
   * Remove score from cached scores
   */
  private removeFromCachedScores(scoreData: OfflineScore): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_SCORES_KEY);
      const scores: OfflineScore[] = stored ? JSON.parse(stored) : [];
      const filteredScores = scores.filter(
        score => !(score.playerId === scoreData.playerId && 
                  score.holeNumber === scoreData.holeNumber &&
                  score.timestamp === scoreData.timestamp)
      );
      localStorage.setItem(OfflineQueueManager.CACHED_SCORES_KEY, JSON.stringify(filteredScores));
    } catch (error) {
      console.error('Error removing cached score:', error);
    }
  }

  /**
   * Remove photo from cached photos
   */
  private removeFromCachedPhotos(photoData: OfflinePhoto): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_PHOTOS_KEY);
      const photos: OfflinePhoto[] = stored ? JSON.parse(stored) : [];
      const filteredPhotos = photos.filter(
        photo => !(photo.playerId === photoData.playerId && 
                  photo.timestamp === photoData.timestamp)
      );
      localStorage.setItem(OfflineQueueManager.CACHED_PHOTOS_KEY, JSON.stringify(filteredPhotos));
    } catch (error) {
      console.error('Error removing cached photo:', error);
    }
  }

  /**
   * Remove order from cached orders
   */
  private removeFromCachedOrders(orderData: OfflineOrder): void {
    try {
      const stored = localStorage.getItem(OfflineQueueManager.CACHED_ORDERS_KEY);
      const orders: OfflineOrder[] = stored ? JSON.parse(stored) : [];
      const filteredOrders = orders.filter(
        order => !(order.playerId === orderData.playerId && 
                  order.timestamp === orderData.timestamp)
      );
      localStorage.setItem(OfflineQueueManager.CACHED_ORDERS_KEY, JSON.stringify(filteredOrders));
    } catch (error) {
      console.error('Error removing cached order:', error);
    }
  }

  /**
   * Clear all cached data (useful for testing or cleanup)
   */
  public clearAllCachedData(): void {
    try {
      localStorage.removeItem(OfflineQueueManager.QUEUE_KEY);
      localStorage.removeItem(OfflineQueueManager.CACHED_SCORES_KEY);
      localStorage.removeItem(OfflineQueueManager.CACHED_PHOTOS_KEY);
      localStorage.removeItem(OfflineQueueManager.CACHED_ORDERS_KEY);
      console.log('Cleared all offline cached data');
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  /**
   * Get queue status for debugging
   */
  public getQueueStatus(): {
    queueLength: number;
    cachedScores: number;
    cachedPhotos: number;
    cachedOrders: number;
    isOnline: boolean;
    syncInProgress: boolean;
  } {
    return {
      queueLength: this.getQueue().length,
      cachedScores: this.getCachedScores("" as Id<"games">).length, // Get all cached scores
      cachedPhotos: this.getCachedPhotos("" as Id<"games">).length, // Get all cached photos
      cachedOrders: this.getCachedOrders("" as Id<"games">).length, // Get all cached orders
      isOnline: this.isOnline(),
      syncInProgress: this.syncInProgress,
    };
  }
}