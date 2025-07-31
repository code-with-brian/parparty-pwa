import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocialSharingManager, ShareContent, ShareOptions } from '../socialSharing';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

// Mock Capacitor Browser
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(),
  },
}));

// Mock QRCode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
  },
}));

describe('SocialSharingManager', () => {
  let mockNavigator: any;

  beforeEach(() => {
    // Mock navigator
    mockNavigator = {
      share: vi.fn(),
      clipboard: {
        writeText: vi.fn(),
      },
    };
    
    // @ts-ignore
    global.navigator = mockNavigator;
    
    // Mock window.open
    global.window = {
      ...global.window,
      open: vi.fn(),
      location: {
        href: 'https://parparty.com/test',
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('shareContent', () => {
    const mockContent: ShareContent = {
      title: 'Test Golf Round',
      text: 'Amazing golf round with friends!',
      url: 'https://parparty.com/game/123',
    };

    it('should use native sharing when available', async () => {
      mockNavigator.share.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareContent(mockContent);
      
      expect(mockNavigator.share).toHaveBeenCalledWith({
        title: mockContent.title,
        text: mockContent.text,
        url: mockContent.url,
      });
      expect(result.success).toBe(true);
      expect(result.platform).toBe('native');
    });

    it('should handle native share cancellation', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockNavigator.share.mockRejectedValue(abortError);
      
      const result = await SocialSharingManager.shareContent(mockContent);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Share cancelled by user');
    });

    it('should fallback to clipboard when native sharing fails', async () => {
      mockNavigator.share = undefined;
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareContent(mockContent);
      
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(mockContent.url);
      expect(result.success).toBe(true);
      expect(result.platform).toBe('clipboard');
    });
  });

  describe('shareToPlatform', () => {
    const mockContent: ShareContent = {
      title: 'Test Golf Round',
      text: 'Amazing golf round!',
      url: 'https://parparty.com/game/123',
    };

    it('should generate correct Twitter share URL', async () => {
      const options: ShareOptions = {
        platform: 'twitter',
        hashtags: ['Golf', 'ParParty'],
        via: 'parparty',
      };
      
      const result = await SocialSharingManager.shareContent(mockContent, options);
      
      expect(global.window.open).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank',
        'width=600,height=400'
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe('twitter');
    });

    it('should generate correct Facebook share URL', async () => {
      const options: ShareOptions = { platform: 'facebook' };
      
      const result = await SocialSharingManager.shareContent(mockContent, options);
      
      expect(global.window.open).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer/sharer.php'),
        '_blank',
        'width=600,height=400'
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe('facebook');
    });

    it('should generate correct WhatsApp share URL', async () => {
      const options: ShareOptions = { platform: 'whatsapp' };
      
      const result = await SocialSharingManager.shareContent(mockContent, options);
      
      expect(global.window.open).toHaveBeenCalledWith(
        expect.stringContaining('wa.me'),
        '_blank',
        'width=600,height=400'
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe('whatsapp');
    });
  });

  describe('shareHighlights', () => {
    it('should create proper highlight share content', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareHighlights(
        'game123',
        'John Doe',
        'Had an amazing round with great shots and perfect weather!',
        { bestScore: 4 }
      );
      
      expect(result.success).toBe(true);
    });

    it('should include hashtags for Twitter shares', async () => {
      const options: ShareOptions = {
        platform: 'twitter',
        hashtags: ['Golf', 'ParParty'],
      };
      
      const result = await SocialSharingManager.shareHighlights(
        'game123',
        'John Doe',
        'Amazing round!',
        { bestScore: 3 },
        options
      );
      
      expect(global.window.open).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank',
        'width=600,height=400'
      );
      
      // Check that the URL contains the hashtags (URL encoded)
      const callArgs = vi.mocked(global.window.open).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain('hashtags=Golf%2CParParty');
      expect(result.success).toBe(true);
    });
  });

  describe('shareAchievement', () => {
    it('should create proper achievement share content', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareAchievement(
        'Hole in One!',
        'game123',
        'John Doe'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('shareGameQR', () => {
    it('should generate QR code and share', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareGameQR(
        'game123',
        'Sunday Golf Game'
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle QR generation failure', async () => {
      const QRCode = await import('qrcode');
      vi.mocked(QRCode.default.toDataURL).mockRejectedValue(new Error('QR generation failed'));
      
      const result = await SocialSharingManager.shareGameQR(
        'game123',
        'Sunday Golf Game'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate QR code');
    });
  });

  describe('generateReferralLink', () => {
    it('should generate proper referral link with tracking parameters', () => {
      const link = SocialSharingManager.generateReferralLink('game123', 'user456');
      
      expect(link).toContain('https://parparty.com/join/game123');
      expect(link).toContain('ref=user456');
      expect(link).toContain('utm_source=referral');
      expect(link).toContain('utm_medium=social');
      expect(link).toContain('utm_campaign=game_invite');
    });
  });

  describe('shareReferral', () => {
    it('should create proper referral share content', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager.shareReferral(
        'game123',
        'Sunday Golf Game',
        'John Doe',
        'user456'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard using modern API', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      const result = await SocialSharingManager['copyToClipboard']('test text');
      
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith('test text');
      expect(result.success).toBe(true);
      expect(result.platform).toBe('clipboard');
    });

    it('should fallback to legacy clipboard method', async () => {
      mockNavigator.clipboard = undefined;
      
      // Mock document methods
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
        remove: vi.fn(),
      };
      
      global.document = {
        ...global.document,
        createElement: vi.fn(() => mockTextArea),
        body: {
          appendChild: vi.fn(),
        },
        execCommand: vi.fn(() => true),
      };
      
      const result = await SocialSharingManager['copyToClipboard']('test text');
      
      expect(result.success).toBe(true);
      expect(result.platform).toBe('clipboard');
    });

    it('should handle clipboard failure', async () => {
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      
      await expect(
        SocialSharingManager['copyToClipboard']('test text')
      ).rejects.toThrow('Failed to copy to clipboard');
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return correct platforms when native sharing is available', () => {
      mockNavigator.share = vi.fn();
      
      const platforms = SocialSharingManager.getAvailablePlatforms();
      
      expect(platforms).toContain('native');
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('copy');
    });

    it('should return correct platforms when native sharing is not available', () => {
      mockNavigator.share = undefined;
      
      const platforms = SocialSharingManager.getAvailablePlatforms();
      
      expect(platforms).not.toContain('native');
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('copy');
    });
  });

  describe('getPlatformInfo', () => {
    it('should return correct platform info for known platforms', () => {
      const twitterInfo = SocialSharingManager.getPlatformInfo('twitter');
      expect(twitterInfo.name).toBe('Twitter');
      expect(twitterInfo.icon).toBe('🐦');
      expect(twitterInfo.color).toBe('bg-blue-400');
      
      const facebookInfo = SocialSharingManager.getPlatformInfo('facebook');
      expect(facebookInfo.name).toBe('Facebook');
      expect(facebookInfo.icon).toBe('📘');
      expect(facebookInfo.color).toBe('bg-blue-600');
    });

    it('should return default info for unknown platforms', () => {
      const unknownInfo = SocialSharingManager.getPlatformInfo('unknown');
      expect(unknownInfo.name).toBe('unknown');
      expect(unknownInfo.icon).toBe('🔗');
      expect(unknownInfo.color).toBe('bg-gray-400');
    });
  });
});