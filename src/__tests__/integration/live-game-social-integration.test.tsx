import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { MemoryRouter } from 'react-router-dom';
import GameScorecard from '@/pages/GameScorecard';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock Convex client
const mockConvexClient = new ConvexReactClient('https://mock-url.convex.cloud');

// Mock data
const mockGameId = 'game123' as Id<"games">;
const mockPlayerId = 'player123' as Id<"players">;

const mockGameState = {
  game: {
    id: mockGameId,
    name: 'Sunday Morning Round',
    status: 'active' as const,
    format: 'stroke' as const,
    startedAt: Date.now() - 3600000, // 1 hour ago
  },
  players: [
    {
      _id: mockPlayerId,
      name: 'John Doe',
      gameId: mockGameId,
      position: 1,
      totalStrokes: 15,
      holesPlayed: 4,
      currentPosition: 1,
    },
    {
      _id: 'player456' as Id<"players">,
      name: 'Jane Smith',
      gameId: mockGameId,
      position: 2,
      totalStrokes: 18,
      holesPlayed: 4,
      currentPosition: 2,
    },
  ],
  lastUpdated: Date.now(),
};

const mockGameData = {
  game: mockGameState.game,
  players: mockGameState.players,
  scores: [
    {
      _id: 'score1' as Id<"scores">,
      playerId: mockPlayerId,
      gameId: mockGameId,
      holeNumber: 1,
      strokes: 4,
      timestamp: Date.now() - 3000000,
    },
    {
      _id: 'score2' as Id<"scores">,
      playerId: mockPlayerId,
      gameId: mockGameId,
      holeNumber: 2,
      strokes: 3,
      timestamp: Date.now() - 2400000,
    },
  ],
  photos: [],
  socialPosts: [
    {
      _id: 'post1' as Id<"socialPosts">,
      gameId: mockGameId,
      playerId: mockPlayerId,
      type: 'achievement' as const,
      content: '🐦 Birdie! John Doe scored 3 on hole 2!',
      timestamp: Date.now() - 2400000,
      reactions: [],
      player: {
        _id: mockPlayerId,
        name: 'John Doe',
        gameId: mockGameId,
        position: 1,
      },
      media: [],
    },
  ],
};

const mockSocialFeed = [
  {
    _id: 'post1' as Id<"socialPosts">,
    gameId: mockGameId,
    playerId: mockPlayerId,
    type: 'achievement' as const,
    content: '🐦 Birdie! John Doe scored 3 on hole 2!',
    timestamp: Date.now() - 2400000,
    reactions: [],
    player: {
      _id: mockPlayerId,
      name: 'John Doe',
      gameId: mockGameId,
      position: 1,
    },
    media: [],
  },
];

// Mock Convex hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ gameId: mockGameId }),
    useNavigate: () => vi.fn(),
  };
});

const mockUseQuery = vi.mocked((await import('convex/react')).useQuery);
const mockUseMutation = vi.mocked((await import('convex/react')).useMutation);

describe('Live Game Social Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseQuery.mockImplementation((query: any) => {
      // Mock different queries based on the query object
      if (query && typeof query === 'object') {
        // This is a simplified way to distinguish queries
        // In a real implementation, you'd check the actual query structure
        const queryStr = JSON.stringify(query);
        if (queryStr.includes('getGameState') || queryStr.includes('gameState')) {
          return mockGameState;
        }
        if (queryStr.includes('getGameData') || queryStr.includes('gameData')) {
          return mockGameData;
        }
        if (queryStr.includes('getGameSocialFeed') || queryStr.includes('socialFeed')) {
          return mockSocialFeed;
        }
      }
      return mockGameState; // Default fallback
    });
    
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}));
  });

  const renderGameScorecard = () => {
    return render(
      <ConvexProvider client={mockConvexClient}>
        <MemoryRouter initialEntries={[`/game/${mockGameId}`]}>
          <GameScorecard />
        </MemoryRouter>
      </ConvexProvider>
    );
  };

  it('displays game information and leaderboard', async () => {
    renderGameScorecard();

    // Check game name and status
    expect(screen.getByText('Sunday Morning Round')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // Check leaderboard
    expect(screen.getByText('Live Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows tab navigation between scorecard and social feed', async () => {
    renderGameScorecard();

    // Check that both tabs are present
    const scorecardTab = screen.getByRole('button', { name: /Scorecard/ });
    const socialTab = screen.getByRole('button', { name: /Social Feed/ });
    
    expect(scorecardTab).toBeInTheDocument();
    expect(socialTab).toBeInTheDocument();

    // Scorecard should be active by default
    expect(scorecardTab).toHaveClass('bg-green-600');
  });

  it('switches to social feed tab and shows social posts', async () => {
    renderGameScorecard();

    // Click on social feed tab
    const socialTab = screen.getByRole('button', { name: /Social Feed/ });
    fireEvent.click(socialTab);

    // Should show social feed content
    await waitFor(() => {
      expect(screen.getByText(/Birdie! John Doe scored 3 on hole 2!/)).toBeInTheDocument();
    });
  });

  it('shows photo capture button', async () => {
    renderGameScorecard();

    // Check that photo capture button is present
    const photoCaptureButton = screen.getByRole('button', { name: /Share Photo/ });
    expect(photoCaptureButton).toBeInTheDocument();
  });

  it('opens photo capture modal when photo button is clicked', async () => {
    renderGameScorecard();

    // Click photo capture button
    const photoCaptureButton = screen.getByRole('button', { name: /Share Photo/ });
    fireEvent.click(photoCaptureButton);

    // Should show photo capture modal
    await waitFor(() => {
      expect(screen.getByText('Capture Moment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Take Photo/ })).toBeInTheDocument();
    });
  });

  it('shows hole selection interface in scorecard tab', async () => {
    renderGameScorecard();

    // Should show hole selection
    expect(screen.getByText('Select Hole')).toBeInTheDocument();
    
    // Should show hole buttons (1-18)
    for (let i = 1; i <= 18; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
    }
  });

  it('shows score input interface for players', async () => {
    renderGameScorecard();

    // Should show score input section
    expect(screen.getByText('Hole 1 Scores')).toBeInTheDocument();
    expect(screen.getByText('Tap to enter/edit scores')).toBeInTheDocument();

    // Should show players with score inputs
    const johnDoeSection = screen.getByText('John Doe').closest('div');
    expect(johnDoeSection).toBeInTheDocument();
    
    const janeSmithSection = screen.getByText('Jane Smith').closest('div');
    expect(janeSmithSection).toBeInTheDocument();
  });

  it('displays game progress statistics', async () => {
    renderGameScorecard();

    // Should show game progress section
    expect(screen.getByText('Game Progress')).toBeInTheDocument();
    
    // Should show various statistics
    expect(screen.getByText('Max Holes Played')).toBeInTheDocument();
    expect(screen.getByText('Avg Holes Played')).toBeInTheDocument();
    expect(screen.getByText('Total Scores')).toBeInTheDocument();
    expect(screen.getByText('Started At')).toBeInTheDocument();
  });

  it('handles switching between holes', async () => {
    renderGameScorecard();

    // Click on hole 5
    const hole5Button = screen.getByRole('button', { name: '5' });
    fireEvent.click(hole5Button);

    // Should update the score section title
    await waitFor(() => {
      expect(screen.getByText('Hole 5 Scores')).toBeInTheDocument();
    });
  });

  it('integrates social feed with real-time updates', async () => {
    renderGameScorecard();

    // Switch to social tab
    const socialTab = screen.getByRole('button', { name: /Social Feed/ });
    fireEvent.click(socialTab);

    // Should show achievement post
    await waitFor(() => {
      expect(screen.getByText(/Birdie! John Doe scored 3 on hole 2!/)).toBeInTheDocument();
    });

    // Should show player name in the post
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows finish game button', async () => {
    renderGameScorecard();

    // Should show finish game button
    const finishButton = screen.getByRole('button', { name: /Finish Game/ });
    expect(finishButton).toBeInTheDocument();
    expect(finishButton).toHaveClass('text-red-700');
  });

  it('handles responsive layout for mobile', async () => {
    renderGameScorecard();

    // Check that the layout uses responsive classes
    const mainContainer = screen.getByText('Sunday Morning Round').closest('div');
    expect(mainContainer?.className).toContain('max-w-6xl');
    
    // Check that statistics grid is responsive
    const statsSection = screen.getByText('Game Progress').closest('div');
    expect(statsSection?.querySelector('.grid')).toHaveClass('grid-cols-2', 'md:grid-cols-4');
  });
});