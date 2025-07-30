import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepLinkHandler, GameLinkData } from '../deepLink';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false)
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

describe('DeepLinkHandler', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    (DeepLinkHandler as any).listeners = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseGameLink', () => {
    it('should parse custom scheme URLs correctly', () => {
      const url = 'parparty://join?game=ABC123';
      const result = DeepLinkHandler.parseGameLink(url);
      
      expect(result).toEqual({
        gameId: 'ABC123',
        action: 'join'
      });
    });

    it('should parse web URLs correctly', () => {
      const url = 'https://parparty.com/join/XYZ789';
      const result = DeepLinkHandler.parseGameLink(url);
      
      expect(result).toEqual({
        gameId: 'XYZ789',
        action: 'join'
      });
    });

    it('should handle URLs with different protocols', () => {
      const httpUrl = 'http://parparty.com/join/TEST123';
      const result = DeepLinkHandler.parseGameLink(httpUrl);
      
      expect(result).toEqual({
        gameId: 'TEST123',
        action: 'join'
      });
    });

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'invalid-url',
        'https://other-site.com/join/ABC123',
        'parparty://invalid',
        'parparty://join',
        'https://parparty.com/other/ABC123'
      ];

      invalidUrls.forEach(url => {
        const result = DeepLinkHandler.parseGameLink(url);
        expect(result).toBeNull();
      });
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'parparty://',
        'https://',
        'not-a-url-at-all',
        ''
      ];

      malformedUrls.forEach(url => {
        const result = DeepLinkHandler.parseGameLink(url);
        expect(result).toBeNull();
      });
    });
  });

  describe('validateGameId', () => {
    it('should validate correct game IDs', () => {
      const validIds = ['ABC123', 'XYZ789', 'GAME01', 'TEST1234', 'A1B2C3D4E5F6'];
      
      validIds.forEach(id => {
        expect(DeepLinkHandler.validateGameId(id)).toBe(true);
      });
    });

    it('should reject invalid game IDs', () => {
      const invalidIds = [
        'abc123', // lowercase
        'ABC12', // too short
        'ABCDEFGHIJKLM', // too long
        'ABC-123', // contains hyphen
        'ABC 123', // contains space
        'ABC123!', // contains special character
        '', // empty
        '123' // too short
      ];

      invalidIds.forEach(id => {
        expect(DeepLinkHandler.validateGameId(id)).toBe(false);
      });
    });
  });

  describe('validateQRData', () => {
    it('should validate correct QR data', () => {
      const validQR = 'parparty://join?game=ABC123';
      const result = DeepLinkHandler.validateQRData(validQR);
      
      expect(result).toEqual({
        gameId: 'ABC123',
        action: 'join'
      });
    });

    it('should throw error for invalid QR format', () => {
      const invalidQR = 'invalid-qr-data';
      
      expect(() => {
        DeepLinkHandler.validateQRData(invalidQR);
      }).toThrow('Invalid QR code format');
    });

    it('should throw error for invalid game ID', () => {
      const invalidGameIdQR = 'parparty://join?game=invalid-id';
      
      expect(() => {
        DeepLinkHandler.validateQRData(invalidGameIdQR);
      }).toThrow('Invalid game ID format');
    });

    it('should throw error for unsupported action', () => {
      const unsupportedActionQR = 'parparty://leave?game=ABC123';
      
      expect(() => {
        DeepLinkHandler.validateQRData(unsupportedActionQR);
      }).toThrow('Unsupported action in QR code');
    });
  });

  describe('generateGameLink', () => {
    it('should generate web links for non-native platforms', () => {
      const link = DeepLinkHandler.generateGameLink('ABC123');
      expect(link).toBe('https://parparty.com/join/ABC123');
    });

    it('should generate custom action links', () => {
      const link = DeepLinkHandler.generateGameLink('ABC123', 'view');
      expect(link).toBe('https://parparty.com/view/ABC123');
    });
  });

  describe('listener management', () => {
    it('should add and remove listeners correctly', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      DeepLinkHandler.addListener(listener1);
      DeepLinkHandler.addListener(listener2);

      expect((DeepLinkHandler as any).listeners).toHaveLength(2);

      DeepLinkHandler.removeListener(listener1);
      expect((DeepLinkHandler as any).listeners).toHaveLength(1);
      expect((DeepLinkHandler as any).listeners[0]).toBe(listener2);
    });

    it('should handle removing non-existent listeners', () => {
      const listener = vi.fn();
      const nonExistentListener = vi.fn();

      DeepLinkHandler.addListener(listener);
      DeepLinkHandler.removeListener(nonExistentListener);

      expect((DeepLinkHandler as any).listeners).toHaveLength(1);
    });
  });

  describe('handleIncomingLink', () => {
    it('should notify listeners for valid links', async () => {
      const listener = vi.fn();
      DeepLinkHandler.addListener(listener);

      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      await DeepLinkHandler.handleIncomingLink('parparty://join?game=ABC123');

      expect(listener).toHaveBeenCalledWith({
        gameId: 'ABC123',
        action: 'join'
      });

      // Restore original location
      window.location = originalLocation;
    });

    it('should throw error for invalid links', async () => {
      await expect(
        DeepLinkHandler.handleIncomingLink('invalid-link')
      ).rejects.toThrow();
    });
  });

  describe('isDeepLinkSupported', () => {
    it('should return true for web with camera support', () => {
      // Mock navigator.mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn()
        },
        configurable: true
      });

      expect(DeepLinkHandler.isDeepLinkSupported()).toBe(true);
    });

    it('should return false for web without camera support', () => {
      // Remove mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true
      });

      expect(DeepLinkHandler.isDeepLinkSupported()).toBe(false);
    });
  });
});