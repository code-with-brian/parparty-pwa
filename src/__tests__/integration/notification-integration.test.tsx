import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationPreferencesComponent } from '../../components/NotificationPreferences';
import { notificationManager } from '../../utils/notificationManager';

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
  value: 'granted',
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

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Clean up any DOM elements created during tests
    document.querySelectorAll('[class*="fixed top-4 right-4"]').forEach(el => el.remove());
  });

  describe('NotificationPreferences Component', () => {
    it('should render notification preferences correctly', async () => {
      await notificationManager.initialize();
      
      render(<NotificationPreferencesComponent />);
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      expect(screen.getByText('Game Events')).toBeInTheDocument();
      expect(screen.getByText('Order Updates')).toBeInTheDocument();
      expect(screen.getByText('Social Moments')).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      expect(screen.getByText('Sound')).toBeInTheDocument();
      expect(screen.getByText('Vibration')).toBeInTheDocument();
    });

    it('should handle preference changes', async () => {
      await notificationManager.initialize();
      
      render(<NotificationPreferencesComponent />);
      
      // Find the game events toggle
      const gameEventsToggle = screen.getByLabelText(/Game Events/i);
      
      // Initially should be checked (default is true)
      expect(gameEventsToggle).toBeChecked();
      
      // Click to disable
      fireEvent.click(gameEventsToggle);
      
      // Should now be unchecked
      expect(gameEventsToggle).not.toBeChecked();
      
      // Verify preferences were updated
      const preferences = notificationManager.getPreferences();
      expect(preferences.gameEvents).toBe(false);
    });

    it('should test notifications when button is clicked', async () => {
      await notificationManager.initialize();
      
      render(<NotificationPreferencesComponent />);
      
      const testButton = screen.getByText('Test Notification');
      fireEvent.click(testButton);
      
      await waitFor(() => {
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
  });

  describe('Notification Manager Integration', () => {
    it('should initialize and show notifications', async () => {
      await notificationManager.initialize();
      
      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'This is a test',
      });
      
      // Should create browser notification
      expect(window.Notification).toHaveBeenCalledWith('Test Notification', {
        body: 'This is a test',
        icon: '/icon.png',
        badge: undefined,
        data: undefined,
        tag: 'system',
        silent: false,
        vibrate: undefined,
      });
      
      // Should also create in-app notification
      await waitFor(() => {
        const inAppNotification = document.querySelector('[class*="fixed top-4 right-4"]');
        expect(inAppNotification).toBeTruthy();
        expect(inAppNotification?.textContent).toContain('Test Notification');
        expect(inAppNotification?.textContent).toContain('This is a test');
      });
    });

    it('should handle order status notifications', async () => {
      await notificationManager.initialize();
      
      await notificationManager.notifyOrderStatusUpdate(
        'ready',
        ['Burger', 'Fries'],
        'Hole 5'
      );
      
      expect(window.Notification).toHaveBeenCalledWith('✅ Order Ready!', {
        body: 'Your order is ready for pickup at Hole 5',
        icon: '/icon.png',
        badge: undefined,
        data: {
          type: 'order',
          orderId: undefined,
          gameId: undefined,
          url: undefined,
        },
        tag: 'order',
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    });

    it('should handle game event notifications', async () => {
      await notificationManager.initialize();
      
      await notificationManager.notifyGameEvent(
        'Game Started',
        'Your golf game has begun!',
        'game123'
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
        vibrate: undefined,
      });
    });

    it('should handle achievement notifications', async () => {
      await notificationManager.initialize();
      
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

    it('should respect user preferences', async () => {
      await notificationManager.initialize();
      
      // Disable all notifications
      notificationManager.updatePreferences({ enabled: false });
      
      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'This should not show',
      });
      
      // Should not create browser notification
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should respect category preferences', async () => {
      await notificationManager.initialize();
      
      // Disable order notifications
      notificationManager.updatePreferences({ 
        enabled: true,
        orderUpdates: false 
      });
      
      await notificationManager.notifyOrderStatusUpdate(
        'ready',
        ['Burger'],
        'Hole 5'
      );
      
      // Should not create browser notification
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should save preferences to localStorage', async () => {
      await notificationManager.initialize();
      
      notificationManager.updatePreferences({ 
        enabled: false,
        sound: false 
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_notification_preferences',
        expect.stringContaining('"enabled":false')
      );
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'parparty_notification_preferences',
        expect.stringContaining('"sound":false')
      );
    });

    it('should handle vibration correctly', async () => {
      await notificationManager.initialize();
      
      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'This should vibrate',
      }, {
        vibrate: true,
        priority: 'high',
      });
      
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 200]);
    });

    it('should play sound when enabled', async () => {
      await notificationManager.initialize();
      
      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'This should play sound',
      }, {
        silent: false,
      });
      
      expect(window.Audio).toHaveBeenCalledWith('/sounds/notification.wav');
    });

    it('should handle different priority levels', async () => {
      await notificationManager.initialize();
      
      // High priority notification
      await notificationManager.showNotification({
        title: 'High Priority',
        body: 'Important message',
      }, {
        priority: 'high',
        vibrate: true,
      });
      
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 200]);
      
      // Low priority notification
      await notificationManager.showNotification({
        title: 'Low Priority',
        body: 'Less important message',
      }, {
        priority: 'low',
        vibrate: true,
      });
      
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200]);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification permission errors gracefully', async () => {
      Notification.requestPermission = vi.fn().mockRejectedValue(new Error('Permission error'));
      
      // Should not throw
      await expect(notificationManager.initialize()).resolves.not.toThrow();
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await notificationManager.initialize();
      
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
      
      await notificationManager.initialize();
      
      // Should not throw
      await expect(notificationManager.showNotification({
        title: 'Test',
        body: 'Test',
      })).resolves.not.toThrow();
    });
  });
});