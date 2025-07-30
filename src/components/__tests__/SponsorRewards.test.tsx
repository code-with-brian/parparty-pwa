import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SponsorRewards } from '../SponsorRewards';
// Mock Id type for testing
type Id<_T> = string;

// Mock Convex
const mockConvexClient = new ConvexReactClient('https://test.convex.cloud');

const mockRewardWithSponsor = {
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

describe('SponsorRewards', () => {
  const mockGameId = 'game123' as Id<"games">;
  const mockPlayerId = 'player123' as Id<"players">;
  const mockOnRewardRedeemed = vi.fn();
  const mockRedeemReward = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMutation as any).mockReturnValue(mockRedeemReward);
  });

  const renderComponent = () => {
    return render(
      <ConvexProvider client={mockConvexClient}>
        <SponsorRewards
          gameId={mockGameId}
          playerId={mockPlayerId}
          onRewardRedeemed={mockOnRewardRedeemed}
        />
      </ConvexProvider>
    );
  };

  it('should show loading state when rewards are loading', () => {
    (useQuery as any).mockReturnValue(undefined);
    
    renderComponent();
    
    expect(screen.getByText('Loading rewards...')).toBeInTheDocument();
    expect(screen.getByText('Loading rewards...')).toBeInTheDocument();
  });

  it('should show no rewards message when no rewards are available', () => {
    (useQuery as any).mockReturnValue([]);
    
    renderComponent();
    
    expect(screen.getByText('Great Round!')).toBeInTheDocument();
    expect(screen.getByText(/No rewards available right now/)).toBeInTheDocument();
  });

  it('should display available rewards correctly', () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    
    renderComponent();
    
    expect(screen.getByText('🎉 Pick Your Prize!')).toBeInTheDocument();
    expect(screen.getByText('You\'ve earned 1 reward from our sponsors')).toBeInTheDocument();
    expect(screen.getByText('Free Beer')).toBeInTheDocument();
    expect(screen.getByText('by Local Brewery')).toBeInTheDocument();
    expect(screen.getByText('Enjoy a complimentary beer at the 19th hole')).toBeInTheDocument();
    expect(screen.getByText('🎁 $8 value')).toBeInTheDocument();
    expect(screen.getByText('Claim Reward')).toBeInTheDocument();
  });

  it('should handle reward redemption successfully', async () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    const mockRedemption = {
      redemptionId: 'redemption123',
      redemptionCode: 'ABC-123-XYZ',
      reward: mockRewardWithSponsor,
    };
    mockRedeemReward.mockResolvedValue(mockRedemption);
    
    renderComponent();
    
    const claimButton = screen.getByText('Claim Reward');
    fireEvent.click(claimButton);
    
    // Should show loading state
    expect(screen.getByText('Redeeming...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockRedeemReward).toHaveBeenCalledWith({
        rewardId: mockRewardWithSponsor._id,
        playerId: mockPlayerId,
        gameId: mockGameId,
      });
      expect(mockOnRewardRedeemed).toHaveBeenCalledWith(mockRedemption);
    });
  });

  it('should handle reward redemption failure', async () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    mockRedeemReward.mockRejectedValue(new Error('Redemption failed'));
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderComponent();
    
    const claimButton = screen.getByText('Claim Reward');
    fireEvent.click(claimButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to redeem reward. Please try again.');
    });
    
    alertSpy.mockRestore();
  });

  it('should display reward expiration information', () => {
    const expiringReward = {
      ...mockRewardWithSponsor,
      expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days from now
    };
    (useQuery as any).mockReturnValue([expiringReward]);
    
    renderComponent();
    
    const expirationDate = new Date(expiringReward.expiresAt!).toLocaleDateString();
    expect(screen.getByText(`Expires: ${expirationDate}`)).toBeInTheDocument();
  });

  it('should display remaining redemptions information', () => {
    const limitedReward = {
      ...mockRewardWithSponsor,
      maxRedemptions: 50,
      currentRedemptions: 45,
    };
    (useQuery as any).mockReturnValue([limitedReward]);
    
    renderComponent();
    
    expect(screen.getByText('5 remaining')).toBeInTheDocument();
  });

  it('should handle multiple rewards correctly', () => {
    const secondReward = {
      ...mockRewardWithSponsor,
      _id: 'reward456' as Id<"sponsorRewards">,
      name: 'Pro Shop Discount',
      description: '20% off your next purchase',
      type: 'discount' as const,
      value: 20,
    };
    (useQuery as any).mockReturnValue([mockRewardWithSponsor, secondReward]);
    
    renderComponent();
    
    expect(screen.getByText('You\'ve earned 2 rewards from our sponsors')).toBeInTheDocument();
    expect(screen.getByText('Free Beer')).toBeInTheDocument();
    expect(screen.getByText('Pro Shop Discount')).toBeInTheDocument();
    expect(screen.getAllByText('Claim Reward')).toHaveLength(2);
  });

  it('should handle image loading errors gracefully', () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    
    renderComponent();
    
    const rewardImage = screen.getByAltText('Free Beer');
    
    // Simulate image load error
    fireEvent.error(rewardImage);
    
    expect(rewardImage.getAttribute('src')).toContain('placeholder');
  });

  it('should handle sponsor logo loading errors gracefully', () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    
    renderComponent();
    
    const sponsorLogo = screen.getByAltText('Local Brewery');
    
    // Simulate image load error
    fireEvent.error(sponsorLogo);
    
    expect(sponsorLogo.style.display).toBe('none');
  });

  it('should disable claim button while redeeming', async () => {
    (useQuery as any).mockReturnValue([mockRewardWithSponsor]);
    mockRedeemReward.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    renderComponent();
    
    const claimButton = screen.getByText('Claim Reward');
    fireEvent.click(claimButton);
    
    expect(claimButton).toBeDisabled();
    expect(screen.getByText('Redeeming...')).toBeInTheDocument();
  });
});