import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SocialShareModal from '../SocialShareModal';
import { SocialSharingManager } from '../../utils/socialSharing';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../utils/socialSharing');
vi.mock('react-hot-toast');

const mockSocialSharingManager = vi.mocked(SocialSharingManager);
const mockToast = vi.mocked(toast);

describe('SocialShareModal', () => {
  const mockContent = {
    title: 'Test Golf Round',
    text: 'Amazing golf round with friends!',
    url: 'https://parparty.com/game/123',
  };

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    content: mockContent,
    type: 'highlight' as const,
    gameId: 'game123',
    playerName: 'John Doe',
    onShare: vi.fn(),
  };

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
      email: { name: 'Email', icon: '📧', color: 'bg-gray-600' },
    }[platform] || { name: platform, icon: '🔗', color: 'bg-gray-400' }));
  });

  it('should render when open', () => {
    render(<SocialShareModal {...mockProps} />);
    
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText(mockContent.title)).toBeInTheDocument();
    expect(screen.getByText(mockContent.text)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<SocialShareModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
  });

  it('should close when X button is clicked', () => {
    render(<SocialShareModal {...mockProps} />);
    
    const closeButton = screen.getByLabelText('Close share modal');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should close when backdrop is clicked', () => {
    render(<SocialShareModal {...mockProps} />);
    
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should render available platforms', () => {
    render(<SocialShareModal {...mockProps} />);
    
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should handle successful share', async () => {
    mockSocialSharingManager.shareHighlights.mockResolvedValue({
      success: true,
      platform: 'twitter',
    });
    
    render(<SocialShareModal {...mockProps} />);
    
    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);
    
    await waitFor(() => {
      expect(mockSocialSharingManager.shareHighlights).toHaveBeenCalledWith(
        'game123',
        'John Doe',
        mockContent.text,
        {},
        { platform: 'twitter' }
      );
      expect(mockToast.success).toHaveBeenCalledWith('Shared to Twitter!');
      expect(mockProps.onShare).toHaveBeenCalledWith('twitter', true);
    });
  });

  it('should handle share failure', async () => {
    mockSocialSharingManager.shareHighlights.mockResolvedValue({
      success: false,
      error: 'Network error',
    });
    
    render(<SocialShareModal {...mockProps} />);
    
    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network error');
      expect(mockProps.onShare).toHaveBeenCalledWith('twitter', false);
    });
  });

  it('should handle copy link with special feedback', async () => {
    mockSocialSharingManager.shareHighlights.mockResolvedValue({
      success: true,
      platform: 'copy',
    });
    
    render(<SocialShareModal {...mockProps} />);
    
    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Link copied to clipboard!');
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should show loading state during share', async () => {
    let resolveShare: (value: any) => void;
    const sharePromise = new Promise((resolve) => {
      resolveShare = resolve;
    });
    
    mockSocialSharingManager.shareHighlights.mockReturnValue(sharePromise);
    
    render(<SocialShareModal {...mockProps} />);
    
    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);
    
    // Should show loading spinner
    expect(screen.getByRole('button', { name: /twitter/i })).toBeDisabled();
    
    // Resolve the promise
    resolveShare!({ success: true, platform: 'twitter' });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /twitter/i })).not.toBeDisabled();
    });
  });

  it('should handle different content types', async () => {
    mockSocialSharingManager.shareAchievement.mockResolvedValue({
      success: true,
      platform: 'twitter',
    });
    
    const achievementProps = {
      ...mockProps,
      type: 'achievement' as const,
    };
    
    render(<SocialShareModal {...achievementProps} />);
    
    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);
    
    await waitFor(() => {
      expect(mockSocialSharingManager.shareAchievement).toHaveBeenCalledWith(
        mockContent.title,
        'game123',
        'John Doe',
        { platform: 'twitter' }
      );
    });
  });

  it('should handle game QR sharing', async () => {
    mockSocialSharingManager.shareGameQR.mockResolvedValue({
      success: true,
      platform: 'twitter',
    });
    
    const gameProps = {
      ...mockProps,
      type: 'game' as const,
    };
    
    render(<SocialShareModal {...gameProps} />);
    
    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);
    
    await waitFor(() => {
      expect(mockSocialSharingManager.shareGameQR).toHaveBeenCalledWith(
        'game123',
        mockContent.title,
        { platform: 'twitter' }
      );
    });
  });

  it('should show native share button when available', () => {
    mockSocialSharingManager.getAvailablePlatforms.mockReturnValue([
      'native', 'copy', 'twitter', 'facebook'
    ]);
    
    render(<SocialShareModal {...mockProps} />);
    
    expect(screen.getByText('Share via System')).toBeInTheDocument();
  });

  it('should display sharing tip', () => {
    render(<SocialShareModal {...mockProps} />);
    
    expect(screen.getByText(/Share your golf moments to inspire friends/)).toBeInTheDocument();
  });
});