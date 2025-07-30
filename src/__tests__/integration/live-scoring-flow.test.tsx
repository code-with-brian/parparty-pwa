import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider } from 'convex/react';
import GameScorecard from '../../pages/GameScorecard';

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
    useParams: () => ({ gameId: 'integration-test-game' }),
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

// Integration test data simulating a real game scenario
const createGameScenario = () => {
  let currentScores = [
    {
      _id: 'score-1',
      playerId: 'player-alice',
      gameId: 'integration-test-game',
      holeNumber: 1,
      strokes: 4,
      timestamp: Date.now() - 1000,
    },
    {
      _id: 'score-2',
      playerId: 'player-bob',
      gameId: 'integration-test-game',
      holeNumber: 1,
      strokes: 5,
      timestamp: Date.now() - 500,
    },
  ];

  const players = [
    {
      _id: 'player-alice',
      name: 'Alice',
      gameId: 'integration-test-game',
      guestId: 'guest-alice',
      position: 1,
    },
    {
      _id: 'player-bob',
      name: 'Bob',
      gameId: 'integration-test-game',
      guestId: 'guest-bob',
      position: 2,
    },
  ];

  const calculateGameState = () => {
    const playerStandings = players.map(player => {
      const playerScores = currentScores.filter(score => score.playerId === player._id);
      const totalStrokes = playerScores.reduce((sum, score) => sum + score.strokes, 0);
      const holesPlayed = playerScores.length;
      
      return {
        ...player,
        totalStrokes,
        holesPlayed,
        currentPosition: 0,
      };
    }).sort((a, b) => {
      if (a.totalStrokes !== b.totalStrokes) {
        return a.totalStrokes - b.totalStrokes;
      }
      return b.holesPlayed - a.holesPlayed;
    });

    playerStandings.forEach((player, index) => {
      player.currentPosition = index + 1;
    });

    return {
      game: {
        id: 'integration-test-game',
        name: 'Integration Test Game',
        status: 'active' as const,
        format: 'stroke' as const,
        startedAt: Date.now() - 3600000,
      },
      players: playerStandings,
      lastUpdated: Date.now(),
    };
  };

  const getGameData = () => ({
    game: {
      id: 'integration-test-game',
      name: 'Integration Test Game',
      status: 'active' as const,
      format: 'stroke' as const,
      startedAt: Date.now() - 3600000,
    },
    players,
    scores: currentScores,
    photos: [],
    socialPosts: [],
  });

  const recordScore = vi.fn().mockImplementation(async ({ playerId, holeNumber, strokes }) => {
    // Simulate real-time score recording
    const existingScoreIndex = currentScores.findIndex(
      score => score.playerId === playerId && score.holeNumber === holeNumber
    );

    if (existingScoreIndex >= 0) {
      currentScores[existingScoreIndex] = {
        ...currentScores[existingScoreIndex],
        strokes,
        timestamp: Date.now(),
      };
    } else {
      currentScores.push({
        _id: `score-${Date.now()}`,
        playerId,
        gameId: 'integration-test-game',
        holeNumber,
        strokes,
        timestamp: Date.now(),
      });
    }

    // Trigger re-render by updating the mocked queries
    setupMocks();
  });

  const updateGameStatus = vi.fn();

  const setupMocks = () => {
    vi.mocked(useQuery).mockImplementation((query) => {
      if (query.toString().includes('getGameState')) {
        return calculateGameState();
      }
      if (query.toString().includes('getGameData')) {
        return getGameData();
      }
      return null;
    });

    vi.mocked(useMutation).mockImplementation((mutation) => {
      if (mutation.toString().includes('recordScore')) {
        return recordScore;
      }
      if (mutation.toString().includes('updateGameStatus')) {
        return updateGameStatus;
      }
      return vi.fn();
    });
  };

  return {
    setupMocks,
    recordScore,
    updateGameStatus,
    getCurrentScores: () => currentScores,
    getPlayers: () => players,
  };
};

function renderGameScorecard() {
  return render(
    <ConvexProvider client={mockConvexClient as any}>
      <BrowserRouter>
        <GameScorecard />
      </BrowserRouter>
    </ConvexProvider>
  );
}

describe('Live Scoring Integration Flow', () => {
  let gameScenario: ReturnType<typeof createGameScenario>;

  beforeEach(() => {
    vi.clearAllMocks();
    gameScenario = createGameScenario();
    gameScenario.setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Scoring Workflow', () => {
    it('should handle a complete round of golf scoring with real-time updates', async () => {
      renderGameScorecard();

      // Verify initial game state
      expect(screen.getByText('Integration Test Game')).toBeInTheDocument();
      expect(screen.getByText('Live Leaderboard')).toBeInTheDocument();
      
      // Alice should be leading initially (4 strokes vs Bob's 5)
      const leaderboardItems = screen.getAllByText(/Alice|Bob/);
      expect(leaderboardItems[0]).toHaveTextContent('Alice');

      // Verify hole 1 scores are displayed correctly
      expect(screen.getByText('Hole 1 Scores')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument(); // Alice's score
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument(); // Bob's score

      // Test score update for Alice on hole 2
      const hole2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(hole2Button);

      expect(screen.getByText('Hole 2 Scores')).toBeInTheDocument();

      // Alice enters score for hole 2
      const aliceEmptyScore = screen.getAllByRole('button', { name: '-' })[0];
      fireEvent.click(aliceEmptyScore);

      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '3' } });
      fireEvent.blur(scoreInput);

      // Verify score was recorded
      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-alice',
          holeNumber: 2,
          strokes: 3,
        });
      });

      // Test Bob's score entry on hole 2
      const bobEmptyScore = screen.getAllByRole('button', { name: '-' })[1];
      fireEvent.click(bobEmptyScore);

      const bobScoreInput = screen.getByRole('spinbutton');
      fireEvent.change(bobScoreInput, { target: { value: '6' } });
      fireEvent.keyDown(bobScoreInput, { key: 'Enter' });

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-bob',
          holeNumber: 2,
          strokes: 6,
        });
      });
    });

    it('should handle score corrections and updates', async () => {
      renderGameScorecard();

      // Alice wants to correct her hole 1 score from 4 to 3
      const aliceScore = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toHaveValue(4); // Should show current score

      fireEvent.change(scoreInput, { target: { value: '3' } });
      fireEvent.blur(scoreInput);

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-alice',
          holeNumber: 1,
          strokes: 3,
        });
      });
    });

    it('should validate score entry and show errors', async () => {
      renderGameScorecard();

      // Try to enter invalid score (0)
      const aliceScore = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '0' } });
      fireEvent.blur(scoreInput);

      // Should not call recordScore for invalid input
      expect(gameScenario.recordScore).not.toHaveBeenCalled();

      // Try valid score
      fireEvent.click(aliceScore);
      const validScoreInput = screen.getByRole('spinbutton');
      fireEvent.change(validScoreInput, { target: { value: '5' } });
      fireEvent.blur(validScoreInput);

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-alice',
          holeNumber: 1,
          strokes: 5,
        });
      });
    });

    it('should handle keyboard navigation and shortcuts', async () => {
      renderGameScorecard();

      const aliceScore = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      
      // Test Enter key submission
      fireEvent.change(scoreInput, { target: { value: '6' } });
      fireEvent.keyDown(scoreInput, { key: 'Enter' });

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-alice',
          holeNumber: 1,
          strokes: 6,
        });
      });

      // Test Escape key cancellation
      fireEvent.click(aliceScore);
      const cancelInput = screen.getByRole('spinbutton');
      fireEvent.change(cancelInput, { target: { value: '10' } });
      fireEvent.keyDown(cancelInput, { key: 'Escape' });

      // Should not record the cancelled score
      expect(gameScenario.recordScore).toHaveBeenCalledTimes(1); // Only the previous call
    });

    it('should handle multiple players scoring simultaneously', async () => {
      renderGameScorecard();

      // Switch to hole 3 where no scores exist
      const hole3Button = screen.getByRole('button', { name: '3' });
      fireEvent.click(hole3Button);

      expect(screen.getByText('Hole 3 Scores')).toBeInTheDocument();

      // Both players enter scores for hole 3
      const emptyScoreButtons = screen.getAllByRole('button', { name: '-' });
      expect(emptyScoreButtons).toHaveLength(2);

      // Alice enters score
      fireEvent.click(emptyScoreButtons[0]);
      const aliceInput = screen.getByRole('spinbutton');
      fireEvent.change(aliceInput, { target: { value: '4' } });
      fireEvent.blur(aliceInput);

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-alice',
          holeNumber: 3,
          strokes: 4,
        });
      });

      // Bob enters score
      const remainingEmptyButtons = screen.getAllByRole('button', { name: '-' });
      fireEvent.click(remainingEmptyButtons[0]); // Should be Bob's button now
      const bobInput = screen.getByRole('spinbutton');
      fireEvent.change(bobInput, { target: { value: '5' } });
      fireEvent.blur(bobInput);

      await waitFor(() => {
        expect(gameScenario.recordScore).toHaveBeenCalledWith({
          playerId: 'player-bob',
          holeNumber: 3,
          strokes: 5,
        });
      });
    });

    it('should handle game completion flow', async () => {
      renderGameScorecard();

      // Test finishing the game
      const finishButton = screen.getByRole('button', { name: 'Finish Game' });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(gameScenario.updateGameStatus).toHaveBeenCalledWith({
          gameId: 'integration-test-game',
          status: 'finished',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/finish/integration-test-game');
    });

    it('should display accurate game progress statistics', async () => {
      renderGameScorecard();

      expect(screen.getByText('Game Progress')).toBeInTheDocument();
      
      // Check statistics are displayed
      expect(screen.getByText('Max Holes Played')).toBeInTheDocument();
      expect(screen.getByText('Avg Holes Played')).toBeInTheDocument();
      expect(screen.getByText('Total Scores')).toBeInTheDocument();
      expect(screen.getByText('Started At')).toBeInTheDocument();

      // Verify the numbers are correct based on initial state
      expect(screen.getByText('1')).toBeInTheDocument(); // Max holes played
      expect(screen.getByText('2')).toBeInTheDocument(); // Total scores
    });

    it('should handle hole navigation correctly', async () => {
      renderGameScorecard();

      // Test navigating through different holes
      for (let hole = 1; hole <= 18; hole++) {
        const holeButton = screen.getByRole('button', { name: hole.toString() });
        fireEvent.click(holeButton);
        
        expect(screen.getByText(`Hole ${hole} Scores`)).toBeInTheDocument();
        
        // Verify the hole button is highlighted
        expect(holeButton).toHaveClass('bg-green-600');
      }
    });

    it('should handle error scenarios gracefully', async () => {
      // Mock a network error
      gameScenario.recordScore.mockRejectedValueOnce(new Error('Network connection failed'));
      
      renderGameScorecard();

      const aliceScore = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      fireEvent.change(scoreInput, { target: { value: '3' } });
      fireEvent.blur(scoreInput);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText('Network connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Synchronization', () => {
    it('should reflect real-time updates from other players', async () => {
      renderGameScorecard();

      // Simulate another player (Bob) updating their score externally
      const initialScores = gameScenario.getCurrentScores();
      
      // Add a new score for Bob on hole 2
      initialScores.push({
        _id: 'score-external',
        playerId: 'player-bob',
        gameId: 'integration-test-game',
        holeNumber: 2,
        strokes: 4,
        timestamp: Date.now(),
      });

      // Re-setup mocks to reflect the change
      gameScenario.setupMocks();

      // Switch to hole 2 to see the update
      const hole2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(hole2Button);

      // Re-render to simulate real-time update
      renderGameScorecard();

      // Bob's score should now appear on hole 2
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    });

    it('should update leaderboard positions in real-time', async () => {
      renderGameScorecard();

      // Initially Alice leads (4 vs 5 strokes)
      let leaderboardItems = screen.getAllByText(/Alice|Bob/);
      expect(leaderboardItems[0]).toHaveTextContent('Alice');

      // Simulate Bob getting a better score that puts him in the lead
      const currentScores = gameScenario.getCurrentScores();
      currentScores[1].strokes = 2; // Bob's hole 1 score becomes 2

      gameScenario.setupMocks();
      renderGameScorecard();

      // Now Bob should be leading
      leaderboardItems = screen.getAllByText(/Alice|Bob/);
      expect(leaderboardItems[0]).toHaveTextContent('Bob');
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide proper accessibility features', async () => {
      renderGameScorecard();

      // Check ARIA labels and roles
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Finish Game' })).toBeInTheDocument();

      // Check score input accessibility
      const aliceScore = screen.getByRole('button', { name: '4' });
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toHaveAttribute('min', '1');
      expect(scoreInput).toHaveAttribute('max', '20');
      expect(scoreInput).toHaveAttribute('autoFocus');
    });

    it('should handle mobile-friendly interactions', async () => {
      renderGameScorecard();

      // Test touch-friendly score entry
      const aliceScore = screen.getByRole('button', { name: '4' });
      
      // Simulate touch interaction
      fireEvent.touchStart(aliceScore);
      fireEvent.touchEnd(aliceScore);
      fireEvent.click(aliceScore);

      const scoreInput = screen.getByRole('spinbutton');
      expect(scoreInput).toBeInTheDocument();
      expect(scoreInput).toHaveFocus();
    });
  });
});