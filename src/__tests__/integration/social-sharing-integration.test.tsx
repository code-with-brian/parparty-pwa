import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HighlightReel from '../../components/HighlightReel';
import ViralQRGenerator from '../../components/ViralQRGenerator';
import ReferralTracker from '../../components/ReferralTracker';
import { SocialSharingManager } from '../../utils/socialSharing';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../utils/socialSharing');
vi.mock('react-hot-toast');
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
  },
}));

const mockSocialSharingManager = vi.mocked(SocialSharingManager);
const mockToast = vi.mocked(toast);

describe('Social Sharing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock SocialSharingManager methods
    mockSocialSharingManager.getAvailablePlatforms.mockReturnValue([
      'copy', 'email', 'sms', 'twitter', 'facebook', 'linkedin', 'whatsapp'
    ]);
    
    mockSocialSharingManager.getPlatformInfo.mockImplementation((platform) => ({
      twitter: { name: 'Twitter', icon: '🐦', color: 'bg-blue-400' },
      facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
      copy: { name: 'Copy Link', icon: '📋', color: 'bg-gray-500' },
      whatsapp: { name: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
    }[platform] || { name: platform, icon: '🔗', color: 'bg-gray-400' }));
    
    mockSocialSharingManager.generateReferralLink.mockImplementation((gameId, referrerId) => 
      `https://parparty.com/join/${gameId}?ref=${referrerId}&utm_source=referral&utm_medium=social&utm_campaign=game_invite`
    );
  });

  describe('HighlightReel Social Sharing', () => {
    const mockHighlightData = {
      id: 'highlight123',
      player: {
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
      },
      game: {
        name: 'Sunday Golf Game',
        date: '2024-01-15',
      },
      narrative: 'Had an amazing round with perfect weather and great shots!',
      keyMoments: [
        {
          type: 'best_shot' as const,
          holeNumber: 7,
          description: 'Amazing eagle on hole 7!',
          timestamp: Date.now(),
        },
      ],
      photos: [
        {
          _id: 'photo1',
          url: 'https://example.com/photo1.jpg',
          caption: 'Great shot!',
          timestamp: Date.now(),
        },
      ],
      stats: {
        totalStrokes: 85,
        holesPlayed: 18,
        averageScore: '4.7',
        bestScore: 3,
        photosShared: 5,
        ordersPlaced: 2,
      },
      timeline: [],
      generatedAt: Date.now(),
      viewCount: 42,
      shareableUrl: 'https://parparty.com/highlights/highlight123',
    };

    it('should open share modal when share button is clicked', async () => {
      render(<HighlightReel highlightData={mockHighlightData} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Share to:')).toBeInTheDocument();
        expect(screen.getByText('Twitter')).toBeInTheDocument();
        expect(screen.getByText('Facebook')).toBeInTheDocument();
      });
    });

    it('should handle successful highlight sharing', async () => {
      mockSocialSharingManager.shareHighlights.mockResolvedValue({
        success: true,
        platform: 'twitter',
      });

      render(<HighlightReel highlightData={mockHighlightData} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Twitter')).toBeInTheDocument();
      });
      
      const twitterButton = screen.getByText('Twitter');
      fireEvent.click(twitterButton);
      
      await waitFor(() => {
        expect(mockSocialSharingManager.shareHighlights).toHaveBeenCalledWith(
          'highlight123',
          'John Doe',
          mockHighlightData.narrative,
          {},
          { platform: 'twitter' }
        );
        expect(mockToast.success).toHaveBeenCalledWith('Shared to Twitter!');
      });
    });

    it('should update social proof after sharing', async () => {
      mockSocialSharingManager.shareHighlights.mockResolvedValue({
        success: true,
        platform: 'twitter',
      });

      render(<HighlightReel highlightData={mockHighlightData} />);
      
      // Initial state should show some likes
      expect(screen.getByText(/likes/)).toBeInTheDocument();
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Twitter')).toBeInTheDocument();
      });
      
      const twitterButton = screen.getByText('Twitter');
      fireEvent.click(twitterButton);
      
      await waitFor(() => {
        // Should show share count after successful share
        expect(screen.getByText(/1 shares/)).toBeInTheDocument();
      });
    });
  });

  describe('ViralQRGenerator', () => {
    it('should generate QR code and allow sharing', async () => {
      mockSocialSharingManager.shareGameQR.mockResolvedValue({
        success: true,
        platform: 'native',
      });

      render(
        <ViralQRGenerator
          gameId="game123"
          gameName="Sunday Golf Game"
          playerName="John Doe"
        />
      );
      
      // Should show game info
      expect(screen.getByText('Sunday Golf Game')).toBeInTheDocument();
      expect(screen.getByText('Hosted by John Doe')).toBeInTheDocument();
      
      // Should show QR code (mocked)
      await waitFor(() => {
        expect(screen.getByAltText('Game QR Code')).toBeInTheDocument();
      });
      
      // Should allow sharing
      const shareButton = screen.getByText('Share Game');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockSocialSharingManager.shareGameQR).toHaveBeenCalledWith(
          'game123',
          'Sunday Golf Game',
          { platform: 'native' }
        );
      });
    });

    it('should handle copy link functionality', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(
        <ViralQRGenerator
          gameId="game123"
          gameName="Sunday Golf Game"
        />
      );
      
      const copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://parparty.com/join/game123'
        );
        expect(mockToast.success).toHaveBeenCalledWith('Game link copied to clipboard!');
      });
    });
  });

  describe('ReferralTracker', () => {
    const mockStats = {
      totalReferrals: 5,
      successfulJoins: 3,
      rewardsEarned: 2,
      currentStreak: 2,
    };

    it('should display referral stats and allow sharing', async () => {
      mockSocialSharingManager.shareReferral.mockResolvedValue({
        success: true,
        platform: 'whatsapp',
      });

      render(
        <ReferralTracker
          gameId="game123"
          gameName="Sunday Golf Game"
          referrerId="user456"
          referrerName="John Doe"
          stats={mockStats}
        />
      );
      
      // Should show stats
      expect(screen.getByText('5')).toBeInTheDocument(); // Total Invites
      expect(screen.getByText('3')).toBeInTheDocument(); // Friends Joined
      expect(screen.getByText('Total Invites')).toBeInTheDocument();
      expect(screen.getByText('Friends Joined')).toBeInTheDocument();
      expect(screen.getByText('Rewards Earned')).toBeInTheDocument();
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      
      // Should show referral link
      expect(screen.getByText(/https:\/\/parparty\.com\/join\/game123/)).toBeInTheDocument();
      
      // Should allow WhatsApp sharing
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      await waitFor(() => {
        expect(mockSocialSharingManager.shareReferral).toHaveBeenCalledWith(
          'game123',
          'Sunday Golf Game',
          'John Doe',
          'user456',
          { platform: 'whatsapp' }
        );
        expect(mockToast.success).toHaveBeenCalledWith('Referral shared via WhatsApp!');
      });
    });

    it('should show reward progress', () => {
      render(
        <ReferralTracker
          gameId="game123"
          gameName="Sunday Golf Game"
          referrerId="user456"
          referrerName="John Doe"
          stats={mockStats}
        />
      );
      
      // Should show earned rewards
      expect(screen.getByText('First Invite')).toBeInTheDocument();
      expect(screen.getByText('Social Butterfly')).toBeInTheDocument();
      
      // Should show progress bars for unearned rewards
      expect(screen.getByText('Party Starter')).toBeInTheDocument();
      expect(screen.getByText('Golf Ambassador')).toBeInTheDocument();
    });

    it('should handle copy referral link', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(
        <ReferralTracker
          gameId="game123"
          gameName="Sunday Golf Game"
          referrerId="user456"
          referrerName="John Doe"
          stats={mockStats}
        />
      );
      
      const copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('https://parparty.com/join/game123?ref=user456')
        );
        expect(mockToast.success).toHaveBeenCalledWith('Referral link copied!');
      });
    });
  });

  describe('Cross-component Integration', () => {
    it('should maintain consistent sharing behavior across components', async () => {
      mockSocialSharingManager.shareContent.mockResolvedValue({
        success: true,
        platform: 'copy',
      });

      // Test that all components use the same sharing manager
      const { rerender } = render(
        <ViralQRGenerator gameId="game123" gameName="Test Game" />
      );
      
      let copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
      
      // Switch to referral tracker
      rerender(
        <ReferralTracker
          gameId="game123"
          gameName="Test Game"
          referrerId="user456"
          referrerName="John Doe"
        />
      );
      
      copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledTimes(2);
      });
    });
  });
});