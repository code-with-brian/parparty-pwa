import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LockerRoom from '../LockerRoom';

// Mock Convex client
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
} as unknown as ConvexReactClient;

// Mock useQuery and useMutation
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ gameId: 'test-game-id' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock components
vi.mock('@/components/SponsorRewards', () => ({
  default: ({ onRewardRedeemed }: { onRewardRedeemed: (redemption: any) => void }) => (
    <div data-testid="sponsor-rewards">
      <button onClick={() => onRewardRedeemed({ id: 'test-redemption' })}>
        Redeem Test Reward
      </button>
    </div>
  ),
}));

vi.mock('@/components/RedemptionHistory', () => ({
  default: ({ playerId }: { playerId: string }) => (
    <div data-testid="redemption-history">History for {playerId}</div>
  ),
}));

const mockGameData = {
  game: {
    _id: 'test-game-id',
    name: 'Test Golf Game',
    status: 'finished',
    format: 'stroke',
    startedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    endedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
  },
  players: [
    {
      _id: 'player-1',
      name: 'John Doe',
      gameId: 'test-game-id',
      position: 1,
    },
    {
      _id: 'player-2',
      name: 'Jane Smith',
      gameId: 'test-game-id',
      position: 2,
    },
  ],
  scores: [
    {
      _id: 'score-1',
      playerId: 'player-1',
      gameId: 'test-game-id',
      holeNumber: 1,
      strokes: 4,
      timestamp: Date.now(),
    },
    {
      _id: 'score-2',
      playerId: 'player-1',
      gameId: 'test-game-id',
      holeNumber: 2,
      strokes: 3,
      timestamp: Date.now(),
    },
    {
      _id: 'score-3',
      playerId: 'player-2',
      gameId: 'test-game-id',
      holeNumber: 1,
      strokes: 5,
      timestamp: Date.now(),
    },
  ],
  photos: [
    {
      _id: 'photo-1',
      playerId: 'player-1',
      gameId: 'test-game-id',
      url: 'https://example.com/photo1.jpg',
      caption: 'Great shot!',
      timestamp: Date.now(),
    },
  ],
  socialPosts: [],
};

const renderLockerRoom = (gameData = mockGameData) => {
  const { useQuery } = require('convex/react');
  useQuery.mockReturnValue(gameData);

  return render(
    <ConvexProvider client={mockConvex}>
      <BrowserRouter>
        <LockerRoom />
      </BrowserRouter>
    </ConvexProvider>
  );
};

describe('LockerRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when game data is not available', () => {
    const { useQuery } = require('convex/react');
    useQuery.mockReturnValue(undefined);

    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    expect(screen.getByText('Loading results...')).toBeInTheDocument();
  });

  it('renders error state for invalid game ID', () => {
    // Mock useParams to return undefined gameId
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ gameId: undefined }),
        useNavigate: () => mockNavigate,
      };
    });

    const { useQuery } = require('convex/react');
    useQuery.mockReturnValue(mockGameData);

    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    expect(screen.getByText('Invalid game ID')).toBeInTheDocument();
  });

  it('redirects to game page if game is not finished', () => {
    const unfinishedGameData = {
      ...mockGameData,
      game: {
        ...mockGameData.game,
        status: 'active',
      },
    };

    renderLockerRoom(unfinishedGameData);

    expect(screen.getByText('Game Still Active')).toBeInTheDocument();
    expect(screen.getByText('This game hasn\'t finished yet.')).toBeInTheDocument();
  });

  it('displays game summary with correct information', () => {
    renderLockerRoom();

    // Check game completion message
    expect(screen.getByText('🎉 Round Complete!')).toBeInTheDocument();
    expect(screen.getByText('Test Golf Game')).toBeInTheDocument();

    // Check game stats
    expect(screen.getByText('90 minutes')).toBeInTheDocument(); // Game duration
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('stroke')).toBeInTheDocument();
  });

  it('displays final leaderboard with correct player rankings', () => {
    renderLockerRoom();

    // Check leaderboard
    expect(screen.getByText('Final Leaderboard')).toBeInTheDocument();
    
    // John Doe should be first with 7 total strokes (4+3)
    const johnRow = screen.getByText('John Doe').closest('div');
    expect(johnRow).toHaveTextContent('7');
    expect(johnRow).toHaveTextContent('2 holes');

    // Jane Smith should be second with 5 total strokes (5)
    const janeRow = screen.getByText('Jane Smith').closest('div');
    expect(janeRow).toHaveTextContent('5');
    expect(janeRow).toHaveTextContent('1 holes');
  });

  it('displays current player performance highlight', () => {
    renderLockerRoom();

    // Should show "Your Performance" section for current player
    expect(screen.getByText('Your Performance')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument(); // Final position
    expect(screen.getByText('7')).toBeInTheDocument(); // Total strokes
    expect(screen.getByText('3.5')).toBeInTheDocument(); // Average per hole
    expect(screen.getByText('2')).toBeInTheDocument(); // Holes played
  });

  it('displays round highlights when photos exist', () => {
    renderLockerRoom();

    expect(screen.getByText('Round Highlights')).toBeInTheDocument();
    // Should show photo grid
    const photo = screen.getByAltText('Great shot!');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('shows account creation CTA', () => {
    renderLockerRoom();

    expect(screen.getByText('Save This Round Forever!')).toBeInTheDocument();
    expect(screen.getByText('Create your ParParty account to keep your golf memories and stats')).toBeInTheDocument();
    expect(screen.getByText('Create Your ParParty Account')).toBeInTheDocument();
  });

  it('handles tab navigation correctly', () => {
    renderLockerRoom();

    // Check initial tab (Summary)
    expect(screen.getByText('Summary')).toHaveClass('bg-green-600');
    expect(screen.getByText('Final Leaderboard')).toBeInTheDocument();

    // Switch to Rewards tab
    fireEvent.click(screen.getByText('Rewards'));
    expect(screen.getByText('Rewards')).toHaveClass('bg-green-600');
    expect(screen.getByTestId('sponsor-rewards')).toBeInTheDocument();

    // Switch to History tab
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('History')).toHaveClass('bg-green-600');
    expect(screen.getByTestId('redemption-history')).toBeInTheDocument();
  });

  it('handles reward redemption callback', () => {
    renderLockerRoom();

    // Switch to rewards tab
    fireEvent.click(screen.getByText('Rewards'));

    // Mock console.log to verify callback
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Click redeem button
    fireEvent.click(screen.getByText('Redeem Test Reward'));

    expect(consoleSpy).toHaveBeenCalledWith('Reward redeemed:', { id: 'test-redemption' });

    consoleSpy.mockRestore();
  });

  it('handles share functionality', async () => {
    // Mock navigator.share
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });

    renderLockerRoom();

    fireEvent.click(screen.getByText('Share'));

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Golf Game - Golf Round Results',
        text: 'Just finished a great round of golf! Check out the results.',
        url: window.location.href,
      });
    });
  });

  it('handles share fallback when navigator.share is not available', async () => {
    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    // Mock alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Remove navigator.share
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
    });

    renderLockerRoom();

    fireEvent.click(screen.getByText('Share'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
      expect(mockAlert).toHaveBeenCalledWith('Link copied to clipboard!');
    });

    mockAlert.mockRestore();
  });

  it('handles account creation modal', () => {
    renderLockerRoom();

    // Open account creation modal
    fireEvent.click(screen.getByText('Create Your ParParty Account'));

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Sign up to save your golf memories and track your progress over time.')).toBeInTheDocument();

    // Mock alert for account creation
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Test sign up with email
    fireEvent.click(screen.getByText('Sign Up with Email'));
    expect(mockAlert).toHaveBeenCalledWith('Account creation would be implemented here!');

    // Close modal
    fireEvent.click(screen.getByText('Maybe Later'));
    expect(screen.queryByText('Create Your Account')).not.toBeInTheDocument();

    mockAlert.mockRestore();
  });

  it('navigates back to game when back button is clicked', () => {
    renderLockerRoom();

    fireEvent.click(screen.getByText('Back to Game'));

    expect(mockNavigate).toHaveBeenCalledWith('/game/test-game-id');
  });

  it('calculates player statistics correctly', () => {
    renderLockerRoom();

    // John Doe: 2 holes, 7 total strokes, average 3.5
    const johnStats = screen.getByText('John Doe').closest('div');
    expect(johnStats).toHaveTextContent('2 holes • Avg 3.5');

    // Jane Smith: 1 hole, 5 total strokes, average 5.0
    const janeStats = screen.getByText('Jane Smith').closest('div');
    expect(janeStats).toHaveTextContent('1 holes • Avg 5');
  });

  it('shows photo count in player stats when photos exist', () => {
    renderLockerRoom();

    // John Doe has 1 photo
    const johnStats = screen.getByText('John Doe').closest('div');
    expect(johnStats).toHaveTextContent('📸 1');
  });

  it('displays game duration correctly', () => {
    renderLockerRoom();

    // Game duration should be 90 minutes (2 hours - 30 minutes)
    expect(screen.getByText('90 minutes')).toBeInTheDocument();
  });
});