/**
 * Notification manager for handling push notifications and in-app alerts
 * Integrates with Capacitor Push Notifications for native mobile support
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: number;
  sound?: string;
}

export interface NotificationOptions {
  persistent?: boolean;
  vibrate?: boolean;
  silent?: boolean;
  category?: 'order' | 'game' | 'social' | 'system';
  priority?: 'low' | 'normal' | 'high';
}

export interface NotificationPreferences {
  enabled: boolean;
  gameEvents: boolean;
  orderUpdates: boolean;
  socialMoments: boolean;
  achievements: boolean;
  marketing: boolean;
  sound: boolean;
  vibration: boolean;
}

class NotificationManager {
  private static instance: NotificationManager;
  private isInitialized = false;
  private permission: NotificationPermission = 'default';
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = {
    enabled: true,
    gameEvents: true,
    orderUpdates: true,
    socialMoments: true,
    achievements: true,
    marketing: false,
    sound: true,
    vibration: true,
  };

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load preferences from localStorage
      this.loadPreferences();

      // Initialize based on platform
      if (Capacitor.isNativePlatform()) {
        await this.initializeCapacitor();
      } else {
        await this.initializeWeb();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async initializeCapacitor(): Promise<void> {
    try {
      // Request permissions
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token: ' + token.value);
          this.pushToken = token.value;
          this.savePushToken(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('Push notification received: ', notification);
          this.handlePushNotificationReceived(notification);
        });

        // Listen for push notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
          console.log('Push notification action performed', notification);
          this.handlePushNotificationAction(notification);
        });

        this.permission = 'granted';
      } else {
        this.permission = 'denied';
      }
    } catch (error) {
      console.error('Capacitor push notification setup failed:', error);
      this.permission = 'denied';
    }
  }

  private async initializeWeb(): Promise<void> {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }

      // Register service worker for web push notifications
      if ('serviceWorker' in navigator && this.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log('Service worker ready for push notifications');
        } catch (error) {
          console.error('Service worker registration failed:', error);
        }
      }
    }
  }

  private handlePushNotificationReceived(notification: PushNotificationSchema): void {
    // Show in-app notification for received push
    this.showInAppNotification({
      title: notification.title || 'ParParty',
      body: notification.body || '',
      data: notification.data,
    }, {
      category: this.getCategoryFromData(notification.data),
      vibrate: this.preferences.vibration,
      silent: !this.preferences.sound,
    });
  }

  private handlePushNotificationAction(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    // Handle navigation based on notification data
    if (data?.url) {
      window.location.href = data.url;
    } else if (data?.gameId) {
      window.location.href = `/game/${data.gameId}`;
    } else if (data?.orderId) {
      // Navigate to order status or game page
      window.location.href = data.gameId ? `/game/${data.gameId}` : '/';
    }
  }

  private getCategoryFromData(data: any): NotificationOptions['category'] {
    if (data?.type) {
      switch (data.type) {
        case 'order':
        case 'food_order':
          return 'order';
        case 'game':
        case 'score':
        case 'achievement':
          return 'game';
        case 'social':
        case 'photo':
        case 'comment':
          return 'social';
        default:
          return 'system';
      }
    }
    return 'system';
  }

  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    } else {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
      }

      if (this.permission === 'granted') {
        return true;
      }

      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
  }

  async showNotification(
    payload: NotificationPayload,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if this type of notification is enabled
    if (!this.shouldShowNotification(options.category)) {
      return;
    }

    // Apply user preferences
    const finalOptions = {
      ...options,
      vibrate: options.vibrate && this.preferences.vibration,
      silent: options.silent || !this.preferences.sound,
    };

    // Show notification based on platform
    if (Capacitor.isNativePlatform()) {
      // On native platforms, notifications are handled by the system
      // We only show in-app notifications for immediate feedback
      this.showInAppNotification(payload, finalOptions);
    } else {
      // On web, show browser notification if permission granted
      if (this.permission === 'granted' && 'Notification' in window) {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon.png',
          badge: payload.badge,
          data: payload.data,
          tag: options.category || 'default',
          silent: finalOptions.silent,
          vibrate: finalOptions.vibrate ? [200, 100, 200] : undefined,
        });

        // Auto-close notification after 5 seconds unless persistent
        if (!options.persistent) {
          setTimeout(() => notification.close(), 5000);
        }

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
          
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        };
      }

      // Also show in-app notification for immediate feedback
      this.showInAppNotification(payload, finalOptions);
    }
  }

  private shouldShowNotification(category?: string): boolean {
    if (!this.preferences.enabled) return false;

    switch (category) {
      case 'order':
        return this.preferences.orderUpdates;
      case 'game':
        return this.preferences.gameEvents;
      case 'social':
        return this.preferences.socialMoments;
      case 'system':
        return true; // Always show system notifications
      default:
        return true;
    }
  }

  private showInAppNotification(
    payload: NotificationPayload,
    options: NotificationOptions
  ): void {
    // Create in-app notification element
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4
      transform transition-all duration-300 translate-x-full
    `;
    
    const categoryColors = {
      order: 'border-l-4 border-l-orange-500',
      game: 'border-l-4 border-l-green-500',
      social: 'border-l-4 border-l-blue-500',
      system: 'border-l-4 border-l-gray-500',
    };

    notification.className += ` ${categoryColors[options.category || 'system']}`;

    const priorityIcons = {
      high: '🔴',
      normal: '🔵',
      low: '⚪',
    };

    const priorityIcon = priorityIcons[options.priority || 'normal'];

    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-lg">${priorityIcon}</div>
        <div class="flex-1">
          <h4 class="font-medium text-gray-900 text-sm">${payload.title}</h4>
          <p class="text-gray-600 text-xs mt-1">${payload.body}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600 text-lg leading-none" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remove after duration based on priority
    const duration = options.priority === 'high' ? 8000 : options.priority === 'low' ? 3000 : 5000;
    if (!options.persistent) {
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }

    // Vibrate if supported and requested
    if (options.vibrate && 'vibrate' in navigator) {
      const pattern = options.priority === 'high' ? [200, 100, 200, 100, 200] : [200, 100, 200];
      navigator.vibrate(pattern);
    }

    // Play sound if enabled (web only)
    if (!Capacitor.isNativePlatform() && !options.silent && this.preferences.sound) {
      this.playNotificationSound(options.category);
    }
  }

  private playNotificationSound(category?: string): void {
    try {
      const audio = new Audio('/sounds/notification.wav');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Notification sound not available:', error);
    }
  }

  // Enhanced notification templates
  async notifyOrderStatusUpdate(
    orderStatus: string,
    orderItems: string[],
    deliveryLocation: string,
    orderId?: string,
    gameId?: string
  ): Promise<void> {
    const statusMessages = {
      confirmed: {
        title: '🍔 Order Confirmed',
        body: `Your order is being prepared: ${orderItems.join(', ')}`,
        priority: 'normal' as const,
      },
      preparing: {
        title: '👨‍🍳 Order Being Prepared',
        body: `Kitchen is working on your order: ${orderItems.join(', ')}`,
        priority: 'normal' as const,
      },
      ready: {
        title: '✅ Order Ready!',
        body: `Your order is ready for pickup at ${deliveryLocation}`,
        priority: 'high' as const,
      },
      delivered: {
        title: '🚚 Order Delivered',
        body: `Your order has been delivered to ${deliveryLocation}`,
        priority: 'high' as const,
      },
    };

    const message = statusMessages[orderStatus as keyof typeof statusMessages];
    if (message) {
      await this.showNotification({
        ...message,
        data: {
          type: 'order',
          orderId,
          gameId,
          url: gameId ? `/game/${gameId}` : undefined,
        },
      }, {
        category: 'order',
        priority: message.priority,
        vibrate: orderStatus === 'ready' || orderStatus === 'delivered',
        persistent: orderStatus === 'ready',
      });
    }
  }

  async notifyGameEvent(
    title: string,
    body: string,
    gameId?: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    await this.showNotification({
      title,
      body,
      data: {
        type: 'game',
        gameId,
        url: gameId ? `/game/${gameId}` : undefined,
      },
    }, {
      category: 'game',
      priority,
      vibrate: priority === 'high',
    });
  }

  async notifySocialEvent(
    title: string,
    body: string,
    gameId?: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    await this.showNotification({
      title,
      body,
      data: {
        type: 'social',
        gameId,
        url: gameId ? `/game/${gameId}` : undefined,
      },
    }, {
      category: 'social',
      priority,
    });
  }

  async notifyAchievement(
    title: string,
    body: string,
    gameId?: string
  ): Promise<void> {
    await this.showNotification({
      title: `🏆 ${title}`,
      body,
      data: {
        type: 'achievement',
        gameId,
        url: gameId ? `/game/${gameId}` : undefined,
      },
    }, {
      category: 'game',
      priority: 'high',
      vibrate: true,
      persistent: true,
    });
  }

  // Notification preferences management
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('parparty_notification_preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('parparty_notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  private savePushToken(token: string): void {
    try {
      localStorage.setItem('parparty_push_token', token);
      // In a real app, you would send this token to your backend
      console.log('Push token saved:', token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  // Utility methods
  isSupported(): boolean {
    return Capacitor.isNativePlatform() || 'Notification' in window;
  }

  isEnabled(): boolean {
    return this.preferences.enabled && (
      Capacitor.isNativePlatform() ? 
      this.pushToken !== null : 
      this.permission === 'granted'
    );
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  async testNotification(): Promise<void> {
    await this.showNotification({
      title: '🎉 Test Notification',
      body: 'Your notifications are working perfectly!',
    }, {
      category: 'system',
      priority: 'normal',
      vibrate: true,
    });
  }
}

export const notificationManager = NotificationManager.getInstance();