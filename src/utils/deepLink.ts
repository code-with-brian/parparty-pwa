import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface GameLinkData {
  gameId: string;
  action: string;
}

export class DeepLinkHandler {
  private static listeners: Array<(data: GameLinkData) => void> = [];

  /**
   * Parse a ParParty deep link URL
   * Supports patterns like:
   * - parparty://join?game=ABC123
   * - https://parparty.com/join/ABC123
   */
  static parseGameLink(url: string): GameLinkData | null {
    try {
      // Handle custom scheme (parparty://)
      if (url.startsWith('parparty://')) {
        const urlObj = new URL(url);
        const action = urlObj.pathname.replace('/', '') || urlObj.hostname;
        const gameId = urlObj.searchParams.get('game');
        
        if (gameId && action) {
          return { gameId, action };
        }
      }
      
      // Handle web URLs (https://parparty.com/join/ABC123)
      if (url.startsWith('https://') || url.startsWith('http://')) {
        const urlObj = new URL(url);
        
        // Only accept parparty.com domain
        if (urlObj.hostname !== 'parparty.com') {
          return null;
        }
        
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 2 && pathParts[0] === 'join') {
          return {
            gameId: pathParts[1],
            action: 'join'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  /**
   * Validate a game ID format
   */
  static validateGameId(gameId: string): boolean {
    // Game IDs should be alphanumeric, 6-12 characters
    const gameIdRegex = /^[A-Z0-9]{6,12}$/;
    return gameIdRegex.test(gameId);
  }

  /**
   * Validate QR code data
   */
  static validateQRData(qrData: string): GameLinkData | null {
    const linkData = this.parseGameLink(qrData);
    
    if (!linkData) {
      throw new Error('Invalid QR code format');
    }
    
    if (!this.validateGameId(linkData.gameId)) {
      throw new Error('Invalid game ID format');
    }
    
    if (linkData.action !== 'join') {
      throw new Error('Unsupported action in QR code');
    }
    
    return linkData;
  }

  /**
   * Handle incoming deep link
   */
  static async handleIncomingLink(url: string): Promise<void> {
    try {
      const linkData = this.parseGameLink(url);
      
      if (!linkData) {
        throw new Error('Invalid deep link format');
      }
      
      // Validate the link data
      const validatedData = this.validateQRData(url);
      
      if (validatedData) {
        // Notify all listeners
        this.listeners.forEach(listener => listener(validatedData));
        
        // Navigate to the appropriate route
        if (validatedData.action === 'join') {
          window.location.href = `/join/${validatedData.gameId}`;
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      throw error;
    }
  }

  /**
   * Register deep link handlers for native apps
   */
  static registerLinkHandlers(): void {
    if (Capacitor.isNativePlatform()) {
      // Handle app launch with URL
      App.addListener('appUrlOpen', (event) => {
        console.log('App opened with URL:', event.url);
        this.handleIncomingLink(event.url).catch(console.error);
      });

      // Handle app state changes
      App.addListener('appStateChange', (state) => {
        console.log('App state changed:', state);
      });
    } else {
      // Handle web deep links
      this.handleWebDeepLinks();
    }
  }

  /**
   * Handle web-based deep links
   */
  private static handleWebDeepLinks(): void {
    // Check if the current URL is a deep link
    const currentUrl = window.location.href;
    if (currentUrl.includes('/join/')) {
      this.handleIncomingLink(currentUrl).catch(console.error);
    }

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      const url = window.location.href;
      if (url.includes('/join/')) {
        this.handleIncomingLink(url).catch(console.error);
      }
    });
  }

  /**
   * Add a listener for deep link events
   */
  static addListener(callback: (data: GameLinkData) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  static removeListener(callback: (data: GameLinkData) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Generate a shareable deep link
   */
  static generateGameLink(gameId: string, action: string = 'join'): string {
    if (Capacitor.isNativePlatform()) {
      return `parparty://${action}?game=${gameId}`;
    } else {
      return `https://parparty.com/${action}/${gameId}`;
    }
  }

  /**
   * Test if deep link functionality is available
   */
  static isDeepLinkSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    
    // Check if running as PWA or has camera access for web
    return 'mediaDevices' in navigator && 
           navigator.mediaDevices !== undefined && 
           'getUserMedia' in navigator.mediaDevices;
  }
}

// Initialize deep link handlers when module loads
if (typeof window !== 'undefined') {
  DeepLinkHandler.registerLinkHandlers();
}