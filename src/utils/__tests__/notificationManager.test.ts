import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { notificationManager, NotificationPreferences } from '../notificationManager';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
  },
}));

// Mock DOM APIs
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: vi.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: vi.fn(),
    onclick: null,
  })),
});

Object.defineProperty(Notification, 'permission', {
  writable: true,
  value: 'default',
});

Object.defineProperty(Notification, 'requestPermission', {
  writable: true,
  value: vi.fn().mockResolvedValue('granted'),
});

Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Audio
Object.defineProperty(window, 'Audio', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    volume: 0.3,
  })),
});

describe('NotificationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset notification permission
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'default',
    });
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.querySelectorAll('[class*="fixed top-4 right-4"]').forEach(el => el.remove());
  });

  describe('Initialization', () => {
    it('should initialize successfully on web platform', async () => {
      await notificationManager.initialize();
      
      expect(notificationManager.isSupported()).toBe(true);
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('should initialize successfully on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      
      await notificationManager.initialize();
      
      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
      expect(PushNotifications.register).toHaveBeenCalled();
    });

    it('should load preferences from localStorage', async () => {
      const savedPrefs = {
        enabled: false,
        gameEvents: false,
        sound: false,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPrefs));
      
      await notificationManager.initialize();
      
      const preferences = notificationManager.getPreferences();
      expect(preferences.enabled).toBe(false);
      expect(preferences.gameEvents).toBe(false);
      expect(preferences.sound).toBe(false);
    });
  });

  describe('Permission Management', () => {
    it('should request permission successfully', async () => {
      Notification.requestPermission = vi.fn().mockResolvedValue('granted');
      
      const result = await notificationManager.requestPermission();
      
      expect(result).toBe(true);
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      Notification.requestPermission = vi.fn().mockResolvedValue('denied');
      
      const result = await notificationManager.requestPermission();
      
      expect(result).toBe(false);
    });

    it('should return true if permission already granted', async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      
      const result = await notificationManager.requestPermission();
      
      expect(result).toBe(true);
    });
  });

  describe('Notification Display', () => {
    beforeEach(async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
    });

    it('should show browser notification when permission granted', async () => {
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(window.Notification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/icon.png',
        badge: undefined,
        data: undefined,
        tag: 'system',
        silent: false,
        vibrate: undefined,
      });
    });

    it('should show in-app notification', async () => {
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      }, {
        category: 'game',
        priority: 'high',
      });

      // Check if in-app notification element was created
      const notification = document.querySelector('[class*="fixed top-4 right-4"]');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toContain('Test Title');
      expect(notification?.textContent).toContain('Test Body');
    });

    it('should respect user preferences', async () => {
      notificationManager.updatePreferences({ enabled: false });
      
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should respect category preferences', async () => {
      notificationManager.updatePreferences({ 
        enabled: true,
        orderUpdates: false 
      });
      
      await notificationManager.showNotification({
        title: 'Order Update',
        body: 'Your order is ready',
      }, {
        category: 'order',
      });

      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should handle vibration when enabled', async () => {
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      }, {
        vibrate: true,
      });

      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200]);
    });

    it('should play sound when enabled', async () => {
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      }, {
        silent: false,
      });

      expect(window.Audio).toHaveBeenCalledWith('/sounds/notification.wav');
    });
  });

  describe('Notification Templates', () => {
    beforeEach(async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
    });

    it('should notify order status update', async () => {
      await notificationManager.notifyOrderStatusUpdate(
        'ready',
        ['Burger', 'Fries'],
        'Hole 5',
        'order123',
        'game456'
      );

      expect(window.Notification).toHaveBeenCalledWith('✅ Order Ready!', {
        body: 'Your order is ready for pickup at Hole 5',
        icon: '/icon.png',
        badge: undefined,
        data: {
          type: 'order',
          orderId: 'order123',
          gameId: 'game456',
          url: '/game/game456',
        },
        tag: 'order',
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    });

    it('should notify game events', async () => {
      await notificationManager.notifyGameEvent(
        'Game Started',
        'Your golf game has begun!',
        'game123',
        'high'
      );

      expect(window.Notification).toHaveBeenCalledWith('Game Started', {
        body: 'Your golf game has begun!',
        icon: '/icon.png',
        badge: undefined,
        data: {
          type: 'game',
          gameId: 'game123',
          url: '/game/game123',
        },
        tag: 'game',
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    });

    it('should notify social events', async () => {
      await notificationManager.notifySocialEvent(
        'New Photo',
        'Someone shared a photo',
        'game123'
      );

      expect(window.Notification).toHaveBeenCalledWith('New Photo', {
        body: 'Someone shared a photo',
        icon: '/icon.png',
        badge: undefined,
        data: {
          type: 'social',
          gameId: 'game123',
          url: '/game/game123',
        },
        tag: 'social',
        silent: false,
        vibrate: undefined,
      });
    });

    it('should notify achievements', async () => {
      await notificationManager.notifyAchievement(
        'Hole in One!',
        'Amazing shot on hole 7!',
        'game123'
      );

      expect(window.Notification).toHaveBeenCalledWith('🏆 Hole in One!', {
        body: 'Amazing shot on hole 7!',
        icon: '/icon.png',
        badge: undefined,
        data: {
          type: 'achievement',
          gameId: 'game123',
          url: '/game/game123',
        },
        tag: 'game',
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    });
  });

  describe('Preferences Management', () => {
    it('should get default preferences', () => {
      const preferences = notificationManager.getPreferences();
      
      expect(preferences).toEqual({
        enabled: true,
        gameEvents: true,
        orderUpdates: true,
        socialMoments: true,
        achievements: true,
        marketing: false,
        sound: true,
        vibration: true,
      });
    });

    it('should update preferences', () => {
      const updates: Partial<NotificationPreferences> = {
        enabled: false,
        sound: false,
      };
      
      notificationManager.updatePreferences(updates);
      
      const preferences = notificationManager.getPreferences();
      expect(preferences.enabled).toBe(false);
      expect(preferences.sound).toBe(false);
      expect(preferences.gameEvents).toBe(true); // Should remain unchanged
    });

    it('should save preferences to localStorage', () => {
      notificationManager.updatePreferences({ enabled: false });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_notification_preferences',
        expect.stringContaining('"enabled":false')
      );
    });
  });

  describe('Utility Methods', () => {
    it('should report support correctly', () => {
      expect(notificationManager.isSupported()).toBe(true);
    });

    it('should report enabled status correctly', async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
      
      expect(notificationManager.isEnabled()).toBe(true);
    });

    it('should return correct permission status', async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
      
      expect(notificationManager.getPermissionStatus()).toBe('granted');
    });

    it('should test notification successfully', async () => {
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
      
      await notificationManager.testNotification();
      
      expect(window.Notification).toHaveBeenCalledWith('🎉 Test Notification', {
        body: 'Your notifications are working perfectly!',
        icon: '/icon.png',
        badge: undefined,
        data: undefined,
        tag: 'system',
        silent: false,
        vibrate: [200, 100, 200],
      });
    });
  });

  describe('Native Platform Handling', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('should handle push notification registration', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      
      await notificationManager.initialize();
      
      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
      expect(PushNotifications.register).toHaveBeenCalled();
      expect(PushNotifications.addListener).toHaveBeenCalledWith('registration', expect.any(Function));
      expect(PushNotifications.addListener).toHaveBeenCalledWith('registrationError', expect.any(Function));
      expect(PushNotifications.addListener).toHaveBeenCalledWith('pushNotificationReceived', expect.any(Function));
      expect(PushNotifications.addListener).toHaveBeenCalledWith('pushNotificationActionPerformed', expect.any(Function));
    });

    it('should handle permission denial on native', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'denied' });
      
      await notificationManager.initialize();
      
      expect(notificationManager.getPermissionStatus()).toBe('denied');
    });

    it('should only show in-app notifications on native platform', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      await notificationManager.initialize();
      
      await notificationManager.showNotification({
        title: 'Test Title',
        body: 'Test Body',
      });

      // Should not create browser notification on native
      expect(window.Notification).not.toHaveBeenCalled();
      
      // Should create in-app notification
      const notification = document.querySelector('[class*="fixed top-4 right-4"]');
      expect(notification).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      Notification.requestPermission = vi.fn().mockRejectedValue(new Error('Permission error'));
      
      // Should not throw
      await expect(notificationManager.initialize()).resolves.not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      expect(() => {
        notificationManager.updatePreferences({ enabled: false });
      }).not.toThrow();
    });

    it('should handle audio playback errors gracefully', async () => {
      const mockAudio = {
        play: vi.fn().mockRejectedValue(new Error('Audio error')),
        volume: 0.3,
      };
      window.Audio = vi.fn().mockImplementation(() => mockAudio);
      
      Object.defineProperty(Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      await notificationManager.initialize();
      
      // Should not throw
      await expect(notificationManager.showNotification({
        title: 'Test',
        body: 'Test',
      })).resolves.not.toThrow();
    });
  });
});