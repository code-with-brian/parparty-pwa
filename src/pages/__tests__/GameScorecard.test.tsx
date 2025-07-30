import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider } from 'convex/react';
import GameScorecard from '../GameScorecard';

// Mock the Convex client
const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
  subscribe: vi.fn(),
  close: vi.fn(),
  connectionState: vi.fn(),
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
  watchQuery: vi.fn(),
};

// Mock the hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Target: () => <div data-testid="target-icon" />,
}));

const { useQuery, useMutation } = await import('convex/react');

// Test data
const mockGameState = {
  game: {
    id: 'test-game-id',
    name: 'Test Game',
    status: 'active' as const,
    format: 'stroke' as const,
    startedAt: Date.now() - 3600000, // 1 hour ago
  },
  players: [
    {
      _id: 'player-1',
      name: 'Alice',
      totalStrokes: 8,
      holesPlayed: 2,
      currentPosition: 1,
    },
    {
      _id: 'player-2',
      name: 'Bob',
      totalStrokes: 10,
      holesPlayed: 2,
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
      strokes: 4,
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
    {
      _id: 'score-4',
      playerId: 'player-2',
      gameId: 'test-game-id',
      holeNumber: 2,
      strokes: 5,
      timestamp: Date.now(),
    },
  ],
  photos: [],
  socialPosts: [],
};

const mockRecordScore = vi.fn();
const mockUpdateGameStatus = vi.fn();

function renderGameScorecard() {
  return render(
    <ConvexProvider client={mockConvexClient as any}>
      <BrowserRouter>
        <GameScorecard />
      </BrowserRouter>
    </ConvexProvider>
  );
}

describe('GameScorecard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useQuery).mockImplementation((query) => {
      if (query.toString().includes('getGameState')) {
        return mockGameState;
      }
      if (query.toString().includes('getGameData')) {
        return mockGameData;
      }
      return null;
    });

    vi.mocked(useMutation).mockImplementation((mutation) => {
      if (mutation.toString().includes('recordScore')) {
        return mockRecordScore;
      }
      if (mutation.toString().includes('updateGameStatus')) {
        return mockUpdateGameStatus;
      }
      return vi.fn();
    });
  });

  describe('Component Rendering', () => {
    it('should render the game scorecard with game name and status', () => {
      renderGameScorecard();
      
      expect(screen.getByText('Test Game')).toBeInTheDocument();
      expect(screen.getByText('2 players')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('stroke')).toBeInTheDocument();
    });

    it('should render the live leaderboard with correct player rankings', () => {
      renderGameScorecard();
      
      expect(screen.getByText('Live Leaderboard')).toBeInTheDocument();
      
      // Alice should be first (lower strokes)
      const leaderboardItems = screen.getAllByText(/Alice|Bob/);
      expect(leaderboardItems[0]).toHaveTextContent('Alice');
      
      // Check stroke counts
      expect(screen.getByText('8')).toBeInTheDocument(); // Alice's total
      expect(screen.getByText('10')).toBeInTheDocument(); // Bob's total
    });

    it('should render hole selection buttons', () => {
      renderGameScorecard();
      
      expect(screen.getByText('Select Hole')).toBeInTheDocument();
      
      // Check that all 18 holes are rendered
      for (let i = 1; i <= 18; i++) {
        expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
      }
    });

    it('should render score input interface for selected hole', () => {
      renderGameScorecard();
      
      expect(screen.getByText('Hole 1 Scores')).toBeInTheDocument();
      expect(screen.getByText('Tap to enter/edit scores')).toBeInTheDocument();
      
      // Should show both players
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should render game progress statistics', () => {
      renderGameScorecard();
      
      expect(screen.getByText('Game Progress')).toBeInTheDocument();
      expect(screen.getByText('Max Holes Played')).toBeInTheDocument();
      expect(screen.getByText('Avg Holes Played')).toBeInTheDocument();
      expect(screen.getByText('Total Scores')).toBeInTheDocument();
      expect(screen.getByText('Started At')).toBeInTheDocument();
    });
  });

  describe('Score Entry', () => {
    it('should allow entering scores for players', async () => {
      renderGameScorecard();
      
      // Find Alice's score input for hole 1 (should show current score of 4)
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      expect(aliceScoreButton).toBeInTheDocument();
      
      // Click to edit
      fireEvent.click(aliceScoreButton);
      
      // Should show input field
      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toBeInTheDocument();
      expect(scoreInput).toHaveValue(4);
    });

    it('should update score when valid input is provided', async () => {
      renderGameScorecard();
      
      // Click on Alice's score button
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      // Change the score
      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '3' } });
      fireEvent.blur(scoreInput);
      
      // Should call recordScore mutation
      await waitFor(() => {
        expect(mockRecordScore).toHaveBeenCalledWith({
          playerId: 'player-1',
          holeNumber: 1,
          strokes: 3,
        });
      });
    });

    it('should handle Enter key to submit score', async () => {
      renderGameScorecard();
      
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '5' } });
      fireEvent.keyDown(scoreInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockRecordScore).toHaveBeenCalledWith({
          playerId: 'player-1',
          holeNumber: 1,
          strokes: 5,
        });
      });
    });

    it('should handle Escape key to cancel editing', () => {
      renderGameScorecard();
      
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '7' } });
      fireEvent.keyDown(scoreInput, { key: 'Escape' });
      
      // Should not call recordScore
      expect(mockRecordScore).not.toHaveBeenCalled();
      
      // Should revert to original value
      expect(scoreInput).toHaveValue(4);
    });

    it('should validate score range (1-20)', async () => {
      renderGameScorecard();
      
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      
      // Test invalid low value
      fireEvent.change(scoreInput, { target: { value: '0' } });
      fireEvent.blur(scoreInput);
      expect(mockRecordScore).not.toHaveBeenCalled();
      
      // Test invalid high value
      fireEvent.change(scoreInput, { target: { value: '21' } });
      fireEvent.blur(scoreInput);
      expect(mockRecordScore).not.toHaveBeenCalled();
      
      // Test valid value
      fireEvent.change(scoreInput, { target: { value: '5' } });
      fireEvent.blur(scoreInput);
      
      await waitFor(() => {
        expect(mockRecordScore).toHaveBeenCalledWith({
          playerId: 'player-1',
          holeNumber: 1,
          strokes: 5,
        });
      });
    });
  });

  describe('Hole Selection', () => {
    it('should switch holes when hole buttons are clicked', () => {
      renderGameScorecard();
      
      // Initially on hole 1
      expect(screen.getByText('Hole 1 Scores')).toBeInTheDocument();
      
      // Click hole 5
      const hole5Button = screen.getByRole('button', { name: '5' });
      fireEvent.click(hole5Button);
      
      // Should switch to hole 5
      expect(screen.getByText('Hole 5 Scores')).toBeInTheDocument();
    });

    it('should show different scores for different holes', () => {
      renderGameScorecard();
      
      // On hole 1, Alice should have score 4
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
      
      // Switch to hole 3 (no scores recorded)
      const hole3Button = screen.getByRole('button', { name: '3' });
      fireEvent.click(hole3Button);
      
      // Should show empty scores (-)
      const emptyScoreButtons = screen.getAllByRole('button', { name: '-' });
      expect(emptyScoreButtons).toHaveLength(2); // One for each player
    });
  });

  describe('Game Status Handling', () => {
    it('should show finished game message when game is finished', () => {
      const finishedGameState = {
        ...mockGameState,
        game: { ...mockGameState.game, status: 'finished' as const },
      };
      
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('getGameState')) {
          return finishedGameState;
        }
        if (query.toString().includes('getGameData')) {
          return { ...mockGameData, game: finishedGameState.game };
        }
        return null;
      });
      
      renderGameScorecard();
      
      expect(screen.getByText('Game Finished!')).toBeInTheDocument();
      expect(screen.getByText('This game has already ended.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    });

    it('should handle finish game button click', async () => {
      renderGameScorecard();
      
      const finishButton = screen.getByRole('button', { name: 'Finish Game' });
      fireEvent.click(finishButton);
      
      await waitFor(() => {
        expect(mockUpdateGameStatus).toHaveBeenCalledWith({
          gameId: 'test-game-id',
          status: 'finished',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when score recording fails', async () => {
      mockRecordScore.mockRejectedValueOnce(new Error('Network error'));
      
      renderGameScorecard();
      
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '3' } });
      fireEvent.blur(scoreInput);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state when data is not available', () => {
      vi.mocked(useQuery).mockReturnValue(null);
      
      renderGameScorecard();
      
      expect(screen.getByText('Loading game...')).toBeInTheDocument();
    });

    it('should handle invalid game ID', () => {
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useParams: () => ({ gameId: undefined }),
          useNavigate: () => mockNavigate,
          BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        };
      });
      
      renderGameScorecard();
      
      expect(screen.getByText('Invalid game ID')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should reflect real-time score updates in leaderboard', () => {
      renderGameScorecard();
      
      // Initial state: Alice leads with 8 strokes
      const leaderboardItems = screen.getAllByText(/Alice|Bob/);
      expect(leaderboardItems[0]).toHaveTextContent('Alice');
      
      // Simulate real-time update where Bob takes the lead
      const updatedGameState = {
        ...mockGameState,
        players: [
          { ...mockGameState.players[0], totalStrokes: 12 }, // Alice gets worse
          { ...mockGameState.players[1], totalStrokes: 10 }, // Bob stays same
        ],
      };
      
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('getGameState')) {
          return updatedGameState;
        }
        return mockGameData;
      });
      
      // Re-render to simulate real-time update
      renderGameScorecard();
      
      // Bob should now be leading
      expect(screen.getByText('12')).toBeInTheDocument(); // Alice's new total
      expect(screen.getByText('10')).toBeInTheDocument(); // Bob's total
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', () => {
      renderGameScorecard();
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should navigate to finish page when game is finished', async () => {
      renderGameScorecard();
      
      const finishButton = screen.getByRole('button', { name: 'Finish Game' });
      fireEvent.click(finishButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/finish/test-game-id');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderGameScorecard();
      
      // Check that buttons have proper roles
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Finish Game' })).toBeInTheDocument();
      
      // Check that score inputs have proper attributes
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toHaveAttribute('min', '1');
      expect(scoreInput).toHaveAttribute('max', '20');
    });

    it('should support keyboard navigation', () => {
      renderGameScorecard();
      
      // Test that hole selection buttons are focusable
      const hole1Button = screen.getByRole('button', { name: '1' });
      hole1Button.focus();
      expect(hole1Button).toHaveFocus();
      
      // Test that score inputs support keyboard interaction
      const aliceScoreButton = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScoreButton);
      
      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toHaveAttribute('autoFocus');
    });
  });
});