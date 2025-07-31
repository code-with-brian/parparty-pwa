/**
 * Notification manager for handling push notifications and in-app alerts
 * This is a simplified implementation for MVP - in production would integrate with Capacitor Push Notifications
 */

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
}

class NotificationManager {
  private static instance: NotificationManager;
  private isInitialized = false;
  private permission: NotificationPermission = 'default';

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if notifications are supported
      if ('Notification' in window) {
        this.permission = Notification.permission;
        
        // Request permission if not already granted
        if (this.permission === 'default') {
          this.permission = await Notification.requestPermission();
        }
      }

      // In production, this would also initialize Capacitor Push Notifications
      // await PushNotifications.requestPermissions();
      // await PushNotifications.register();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
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

  async showNotification(
    payload: NotificationPayload,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Show browser notification if permission granted
    if (this.permission === 'granted' && 'Notification' in window) {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon.png',
        badge: payload.badge,
        data: payload.data,
        tag: options.category || 'default',
        silent: options.silent,
        vibrate: options.vibrate ? [200, 100, 200] : undefined,
      });

      // Auto-close notification after 5 seconds unless persistent
      if (!options.persistent) {
        setTimeout(() => notification.close(), 5000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle navigation based on notification data
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
      };
    }

    // Also show in-app notification for immediate feedback
    this.showInAppNotification(payload, options);
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

    notification.innerHTML = `
      <div class="flex items-start gap-3">
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

    // Auto-remove after 5 seconds unless persistent
    if (!options.persistent) {
      setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => notification.remove(), 300);
      }, 5000);
    }

    // Vibrate if supported and requested
    if (options.vibrate && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  // Notification templates for common scenarios
  async notifyOrderStatusUpdate(
    orderStatus: string,
    orderItems: string[],
    deliveryLocation: string
  ): Promise<void> {
    const statusMessages = {
      confirmed: {
        title: '🍔 Order Confirmed',
        body: `Your order is being prepared: ${orderItems.join(', ')}`,
      },
      preparing: {
        title: '👨‍🍳 Order Being Prepared',
        body: `Kitchen is working on your order: ${orderItems.join(', ')}`,
      },
      ready: {
        title: '✅ Order Ready!',
        body: `Your order is ready for pickup at ${deliveryLocation}`,
      },
      delivered: {
        title: '🚚 Order Delivered',
        body: `Your order has been delivered to ${deliveryLocation}`,
      },
    };

    const message = statusMessages[orderStatus as keyof typeof statusMessages];
    if (message) {
      await this.showNotification(message, {
        category: 'order',
        vibrate: orderStatus === 'ready' || orderStatus === 'delivered',
      });
    }
  }

  async notifyGameEvent(title: string, body: string, gameId?: string): Promise<void> {
    await this.showNotification(
      {
        title,
        body,
        data: gameId ? { url: `/game/${gameId}` } : undefined,
      },
      { category: 'game' }
    );
  }

  async notifySocialEvent(title: string, body: string): Promise<void> {
    await this.showNotification(
      { title, body },
      { category: 'social' }
    );
  }

  // Check if notifications are supported and enabled
  isSupported(): boolean {
    return 'Notification' in window;
  }

  isEnabled(): boolean {
    return this.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export const notificationManager = NotificationManager.getInstance();