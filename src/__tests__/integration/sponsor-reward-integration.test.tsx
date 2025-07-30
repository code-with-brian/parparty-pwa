import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SponsorRewards } from '@/components/SponsorRewards';
import { RedemptionHistory } from '@/components/RedemptionHistory';

// Mock Id type for testing
type Id<_T> = string;

// Mock Convex
const mockConvexClient = new ConvexReactClient('https://test.convex.cloud');

const mockGameId = 'game123' as Id<"games">;
const mockPlayerId = 'player123' as Id<"players">;

const mockAvailableReward = {
  _id: 'reward123' as Id<"sponsorRewards">,
  sponsorId: 'sponsor123' as Id<"sponsors">,
  name: 'Free Beer',
  description: 'Enjoy a complimentary beer at the 19th hole',
  type: 'product' as const,
  value: 8,
  imageUrl: 'https://example.com/beer.jpg',
  maxRedemptions: 50,
  currentRedemptions: 10,
  isActive: true,
  createdAt: Date.now(),
  sponsor: {
    _id: 'sponsor123' as Id<"sponsors">,
    name: 'Local Brewery',
    logo: 'https://example.com/brewery-logo.jpg',
    description: 'Your local craft brewery',
    rewardBudget: 1000,
    isActive: true,
    createdAt: Date.now(),
  },
};

const mockRedemption = {
  _id: 'redemption123' as Id<"rewardRedemptions">,
  rewardId: 'reward123' as Id<"sponsorRewards">,
  playerId: mockPlayerId,
  gameId: mockGameId,
  redemptionCode: 'BREW-123-XYZ',
  redeemedAt: Date.now(),
  status: 'confirmed' as const,
  reward: {
    _id: 'reward123' as Id<"sponsorRewards">,
    sponsorId: 'sponsor123' as Id<"sponsors">,
    name: 'Free Beer',
    description: 'Enjoy a complimentary beer at the 19th hole',
    type: 'product' as const,
    value: 8,
    imageUrl: 'https://example.com/beer.jpg',
    redemptionCode: 'BREW-123-XYZ',
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
    maxRedemptions: 50,
    currentRedemptions: 11,
    isActive: true,
    conditions: {
      requiredHoles: 9,
    },
    createdAt: Date.now(),
  },
  sponsor: mockAvailableReward.sponsor,
};

// Mock the Convex hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

const { useQuery, useMutation } = await import('convex/react');

describe('Sponsor Reward Integration', () => {
  const mockRedeemReward = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMutation as any).mockReturnValue(mockRedeemReward);
  });

  const renderSponsorRewards = () => {
    return render(
      <ConvexProvider client={mockConvexClient}>
        <SponsorRewards
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      </ConvexProvider>
    );
  };

  const renderRedemptionHistory = () => {
    return render(
      <ConvexProvider client={mockConvexClient}>
        <RedemptionHistory playerId={mockPlayerId} />
      </ConvexProvider>
    );
  };

  it('should display available rewards and allow redemption', async () => {
    (useQuery as any).mockReturnValue([mockAvailableReward]);
    
    renderSponsorRewards();
    
    // Should show available reward
    expect(screen.getByText('🎉 Pick Your Prize!')).toBeInTheDocument();
    expect(screen.getByText('Free Beer')).toBeInTheDocument();
    expect(screen.getByText('by Local Brewery')).toBeInTheDocument();
    expect(screen.getByText('🎁 $8 value')).toBeInTheDocument();
    
    // Should allow redemption
    const claimButton = screen.getByText('Claim Reward');
    expect(claimButton).toBeInTheDocument();
    expect(claimButton).not.toBeDisabled();
  });

  it('should handle successful reward redemption flow', async () => {
    (useQuery as any).mockReturnValue([mockAvailableReward]);
    mockRedeemReward.mockResolvedValue({
      redemptionId: 'redemption123',
      redemptionCode: 'BREW-123-XYZ',
      reward: mockAvailableReward,
    });
    
    renderSponsorRewards();
    
    const claimButton = screen.getByText('Claim Reward');
    fireEvent.click(claimButton);
    
    // Should show loading state
    expect(screen.getByText('Redeeming...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockRedeemReward).toHaveBeenCalledWith({
        rewardId: mockAvailableReward._id,
        playerId: mockPlayerId,
        gameId: mockGameId,
      });
    });
  });

  it('should display redemption history correctly', () => {
    (useQuery as any).mockReturnValue([mockRedemption]);
    
    renderRedemptionHistory();
    
    // Should show redemption history
    expect(screen.getByText('Your Rewards')).toBeInTheDocument();
    expect(screen.getByText('1 reward earned')).toBeInTheDocument();
    expect(screen.getByText('Free Beer')).toBeInTheDocument();
    expect(screen.getByText('by Local Brewery')).toBeInTheDocument();
    expect(screen.getByText('✅ Confirmed')).toBeInTheDocument();
    expect(screen.getByText('BREW-123-XYZ')).toBeInTheDocument();
  });

  it('should show no rewards message when none are available', () => {
    (useQuery as any).mockReturnValue([]);
    
    renderSponsorRewards();
    
    expect(screen.getByText('Great Round!')).toBeInTheDocument();
    expect(screen.getByText(/No rewards available right now/)).toBeInTheDocument();
  });

  it('should show empty state for redemption history', () => {
    (useQuery as any).mockReturnValue([]);
    
    renderRedemptionHistory();
    
    expect(screen.getByText('No Rewards Yet')).toBeInTheDocument();
    expect(screen.getByText('Complete more games to earn sponsor rewards!')).toBeInTheDocument();
  });

  it('should handle reward with expiration correctly', () => {
    const expiringReward = {
      ...mockAvailableReward,
      expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days from now
    };
    (useQuery as any).mockReturnValue([expiringReward]);
    
    renderSponsorRewards();
    
    const expirationDate = new Date(expiringReward.expiresAt!).toLocaleDateString();
    expect(screen.getByText(`Expires: ${expirationDate}`)).toBeInTheDocument();
  });

  it('should handle reward with limited redemptions correctly', () => {
    const limitedReward = {
      ...mockAvailableReward,
      maxRedemptions: 50,
      currentRedemptions: 45,
    };
    (useQuery as any).mockReturnValue([limitedReward]);
    
    renderSponsorRewards();
    
    expect(screen.getByText('5 remaining')).toBeInTheDocument();
  });

  it('should handle multiple reward types correctly', () => {
    const discountReward = {
      ...mockAvailableReward,
      _id: 'reward456' as Id<"sponsorRewards">,
      name: 'Pro Shop Discount',
      description: '20% off your next purchase',
      type: 'discount' as const,
      value: 20,
    };
    
    (useQuery as any).mockReturnValue([mockAvailableReward, discountReward]);
    
    renderSponsorRewards();
    
    expect(screen.getByText('You\'ve earned 2 rewards from our sponsors')).toBeInTheDocument();
    expect(screen.getByText('🎁 $8 value')).toBeInTheDocument(); // Product reward
    expect(screen.getByText('🏷️ 20% off')).toBeInTheDocument(); // Discount reward
  });

  it('should handle error states gracefully', async () => {
    (useQuery as any).mockReturnValue([mockAvailableReward]);
    mockRedeemReward.mockRejectedValue(new Error('Network error'));
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderSponsorRewards();
    
    const claimButton = screen.getByText('Claim Reward');
    fireEvent.click(claimButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to redeem reward. Please try again.');
    });
    
    alertSpy.mockRestore();
  });
});