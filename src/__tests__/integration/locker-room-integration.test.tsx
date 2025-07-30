import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LockerRoom from '../../pages/LockerRoom';

// Mock Convex client
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
} as unknown as ConvexReactClient;

// Mock useQuery and useMutation
vi.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ gameId: 'test-game-id' }),
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock components
vi.mock('../../components/SponsorRewards', () => ({
  default: ({ onRewardRedeemed }: { onRewardRedeemed: (redemption: any) => void }) => (
    <div data-testid="sponsor-rewards">
      <button onClick={() => onRewardRedeemed({ id: 'test-redemption' })}>
        Redeem Test Reward
      </button>
    </div>
  ),
}));

vi.mock('../../components/RedemptionHistory', () => ({
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

describe('LockerRoom Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { useQuery, useMutation } = require('convex/react');
    useQuery.mockReturnValue(mockGameData);
    useMutation.mockReturnValue(vi.fn());
  });

  it('renders complete locker room experience', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Verify game summary display
    expect(screen.getByText('🎉 Round Complete!')).toBeInTheDocument();
    expect(screen.getByText('Test Golf Game')).toBeInTheDocument();

    // Verify final leaderboard
    expect(screen.getByText('Final Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Verify account creation CTA
    expect(screen.getByText('Save This Round Forever!')).toBeInTheDocument();
    expect(screen.getByText('Create Your ParParty Account')).toBeInTheDocument();
  });

  it('handles tab navigation between summary, rewards, and history', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Check initial tab (Summary)
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Final Leaderboard')).toBeInTheDocument();

    // Switch to Rewards tab
    fireEvent.click(screen.getByText('Rewards'));
    expect(screen.getByTestId('sponsor-rewards')).toBeInTheDocument();

    // Switch to History tab
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByTestId('redemption-history')).toBeInTheDocument();
  });

  it('displays player performance highlights', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Should show "Your Performance" section for current player
    expect(screen.getByText('Your Performance')).toBeInTheDocument();
    expect(screen.getByText('Final Position')).toBeInTheDocument();
    expect(screen.getByText('Total Strokes')).toBeInTheDocument();
    expect(screen.getByText('Avg per Hole')).toBeInTheDocument();
    expect(screen.getByText('Holes Played')).toBeInTheDocument();
  });

  it('shows sponsor reward selection interface', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Switch to rewards tab
    fireEvent.click(screen.getByText('Rewards'));

    // Verify sponsor rewards component is rendered
    expect(screen.getByTestId('sponsor-rewards')).toBeInTheDocument();
    expect(screen.getByText('Redeem Test Reward')).toBeInTheDocument();
  });

  it('handles reward redemption flow', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Switch to rewards tab
    fireEvent.click(screen.getByText('Rewards'));

    // Mock console.log to verify callback
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Click redeem button
    fireEvent.click(screen.getByText('Redeem Test Reward'));

    expect(consoleSpy).toHaveBeenCalledWith('Reward redeemed:', { id: 'test-redemption' });

    consoleSpy.mockRestore();
  });

  it('displays account creation CTA with data preview', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Verify account creation section
    expect(screen.getByText('Save This Round Forever!')).toBeInTheDocument();
    expect(screen.getByText('Create your ParParty account to keep your golf memories and stats')).toBeInTheDocument();
    
    // Verify data preview
    expect(screen.getByText('What you\'ll save:')).toBeInTheDocument();
    expect(screen.getByText('2 hole scores')).toBeInTheDocument();
    expect(screen.getByText('1 photos')).toBeInTheDocument();
    expect(screen.getByText('Game achievements')).toBeInTheDocument();
    expect(screen.getByText('Performance stats')).toBeInTheDocument();
  });

  it('handles account creation modal flow', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Open account creation modal
    fireEvent.click(screen.getByText('Create Your ParParty Account'));

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Sign up to save your golf memories and track your progress over time.')).toBeInTheDocument();

    // Mock alert for account creation
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Test sign up with email
    fireEvent.click(screen.getByText('Sign Up with Email'));
    expect(mockAlert).toHaveBeenCalledWith('Account creation would be implemented here!');

    mockAlert.mockRestore();
  });

  it('displays round highlights when photos exist', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    expect(screen.getByText('Round Highlights')).toBeInTheDocument();
    // Should show photo grid
    const photo = screen.getByAltText('Great shot!');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('calculates and displays game statistics correctly', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <BrowserRouter>
          <LockerRoom />
        </BrowserRouter>
      </ConvexProvider>
    );

    // Check game stats
    expect(screen.getByText('90 minutes')).toBeInTheDocument(); // Game duration
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('stroke')).toBeInTheDocument();

    // John Doe: 2 holes, 7 total strokes, average 3.5
    const johnStats = screen.getByText('John Doe').closest('div');
    expect(johnStats).toHaveTextContent('2 holes • Avg 3.5');

    // Jane Smith: 1 hole, 5 total strokes, average 5.0
    const janeStats = screen.getByText('Jane Smith').closest('div');
    expect(janeStats).toHaveTextContent('1 holes • Avg 5');
  });
});