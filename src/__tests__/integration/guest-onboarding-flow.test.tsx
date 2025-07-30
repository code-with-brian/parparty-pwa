import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import JoinGame from '../../pages/JoinGame';
import { DeepLinkHandler } from '../../utils/deepLink';
import { GuestSessionManager } from '../../lib/GuestSessionManager';

// Mock Convex client
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
} as unknown as ConvexReactClient;

// Mock the API
const mockApi = {
  games: {
    getGamePreview: 'games:getGamePreview',
  },
  guests: {
    createGuestSession: 'guests:createGuestSession',
    joinGameAsGuest: 'guests:joinGameAsGuest',
  },
};

vi.mock('../../convex/_generated/api', () => ({
  api: mockApi,
}));

// Mock DeepLinkHandler
vi.mock('../../utils/deepLink', () => ({
  DeepLinkHandler: {
    validateGameId: vi.fn(),
    validateQRData: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    isDeepLinkSupported: vi.fn(() => true),
    generateGameLink: vi.fn((gameId: string) => `https://parparty.com/join/${gameId}`),
  },
}));

// Mock GuestSessionManager
vi.mock('../../lib/GuestSessionManager', () => ({
  GuestSessionManager: vi.fn().mockImplementation(() => ({
    createSession: vi.fn(),
    setActiveGameId: vi.fn(),
  })),
}));

// Mock QRScanner component
vi.mock('../../components/QRScanner', () => ({
  default: ({ onScan, onError }: { onScan: (data: string) => void; onError: (error: Error) => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('parparty://join?game=TEST123')}>
        Simulate QR Scan
      </button>
      <button onClick={() => onError(new Error('Camera not available'))}>
        Simulate Error
      </button>
    </div>
  ),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ gameId: 'TEST123' }),
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConvexProvider client={mockConvex}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </ConvexProvider>
);

describe('Guest Onboarding Flow Integration Tests', () => {
  const mockGamePreview = {
    id: 'TEST123',
    name: 'Test Golf Game',
    status: 'waiting',
    format: 'stroke',
    startedAt: 1722326414000, // Fixed timestamp
    playerCount: 2,
    course: {
      name: 'Test Golf Course',
      address: '123 Golf St, Golf City',
    },
    canJoin: true,
  };

  const mockGuestSession = {
    id: 'guest123',
    deviceId: 'device_123',
    name: 'Test Player',
    createdAt: 1722326414000,
    tempData: { scores: [], photos: [], orders: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (DeepLinkHandler.validateGameId as any).mockReturnValue(true);
    (mockConvex.query as any).mockResolvedValue(mockGamePreview);
    (mockConvex.mutation as any).mockResolvedValue('player123');
    
    const mockGuestSessionManager = {
      createSession: vi.fn().mockResolvedValue(mockGuestSession),
      setActiveGameId: vi.fn(),
    };
    (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Game Validation and Preview', () => {
    it('should load and display game preview when valid gameId is provided', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading game information...')).toBeInTheDocument();

      // Wait for game preview to load
      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Verify game preview details
      expect(screen.getByText('Stroke Play')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Player count
      expect(screen.getByText('waiting')).toBeInTheDocument(); // Status
      expect(screen.getByText('Test Golf Course')).toBeInTheDocument();
      expect(screen.getByText('123 Golf St, Golf City')).toBeInTheDocument();

      // Verify Convex query was called
      expect(mockConvex.query).toHaveBeenCalledWith(
        mockApi.games.getGamePreview,
        { gameId: 'TEST123' }
      );
    });

    it('should show error when game is not found', async () => {
      (mockConvex.query as any).mockResolvedValue(null);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Game not found. Please check the game ID and try again.')).toBeInTheDocument();
      });
    });

    it('should show error when game cannot be joined', async () => {
      const finishedGame = { ...mockGamePreview, canJoin: false };
      (mockConvex.query as any).mockResolvedValue(finishedGame);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('This game has already finished and cannot be joined.')).toBeInTheDocument();
      });
    });

    it('should show error for invalid game ID format', async () => {
      (DeepLinkHandler.validateGameId as any).mockReturnValue(false);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid game ID format. Game IDs should be 6-12 alphanumeric characters.')).toBeInTheDocument();
      });
    });
  });

  describe('Guest Name Input Interface', () => {
    it('should allow optional name entry', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Enter your name (optional)');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).not.toBeRequired();

      // Test name input
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      expect(nameInput).toHaveValue('John Doe');
    });

    it('should work without name input', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockConvex.mutation).toHaveBeenCalled();
      });
    });
  });

  describe('Guest Session Creation and Game Joining', () => {
    it('should create guest session and join game successfully', async () => {
      const mockGuestSessionManager = {
        createSession: vi.fn().mockResolvedValue(mockGuestSession),
        setActiveGameId: vi.fn(),
      };
      (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Enter player name
      const nameInput = screen.getByPlaceholderText('Enter your name (optional)');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // Click join game
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      // Verify guest session creation
      await waitFor(() => {
        expect(mockGuestSessionManager.createSession).toHaveBeenCalledWith('John Doe');
      });

      // Verify game joining
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        mockApi.guests.joinGameAsGuest,
        {
          gameId: mockGamePreview.id,
          guestId: mockGuestSession.id,
        }
      );

      // Verify active game ID is set
      expect(mockGuestSessionManager.setActiveGameId).toHaveBeenCalledWith(mockGamePreview.id);

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('/game/TEST123', {
        state: {
          playerId: 'player123',
          guestSession: mockGuestSession,
          gamePreview: mockGamePreview,
        },
      });
    });

    it('should handle guest session creation failure', async () => {
      const mockGuestSessionManager = {
        createSession: vi.fn().mockRejectedValue(new Error('Session creation failed')),
        setActiveGameId: vi.fn(),
      };
      (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to join game. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle game joining failure', async () => {
      const mockGuestSessionManager = {
        createSession: vi.fn().mockResolvedValue(mockGuestSession),
        setActiveGameId: vi.fn(),
      };
      (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);
      (mockConvex.mutation as any).mockRejectedValue(new Error('Join game failed'));

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to join game. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('QR Code Scanning Integration', () => {
    it('should open QR scanner when scan button is clicked', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      const scanButton = screen.getByRole('button', { name: 'Scan Different QR Code' });
      fireEvent.click(scanButton);

      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Join Game' })).toBeInTheDocument();
    });

    it('should handle successful QR scan', async () => {
      (DeepLinkHandler.validateQRData as any).mockReturnValue({
        action: 'join',
        gameId: 'TEST123',
      });

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Open QR scanner
      const scanButton = screen.getByRole('button', { name: 'Scan Different QR Code' });
      fireEvent.click(scanButton);

      // Simulate QR scan
      const simulateScanButton = screen.getByText('Simulate QR Scan');
      fireEvent.click(simulateScanButton);

      // Should close QR scanner and return to join game
      await waitFor(() => {
        expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
      });

      expect(DeepLinkHandler.validateQRData).toHaveBeenCalledWith('parparty://join?game=TEST123');
    });

    it('should handle QR scan error', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Open QR scanner
      const scanButton = screen.getByRole('button', { name: 'Scan Different QR Code' });
      fireEvent.click(scanButton);

      // Simulate QR scan error
      const simulateErrorButton = screen.getByText('Simulate Error');
      fireEvent.click(simulateErrorButton);

      // Should show error and close scanner
      await waitFor(() => {
        expect(screen.getByText('QR Scan Error: Camera not available')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
    });

    it('should navigate to different game when QR contains different gameId', async () => {
      (DeepLinkHandler.validateQRData as any).mockReturnValue({
        action: 'join',
        gameId: 'DIFFERENT123',
      });

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Open QR scanner
      const scanButton = screen.getByRole('button', { name: 'Scan Different QR Code' });
      fireEvent.click(scanButton);

      // Simulate QR scan with different game ID
      const simulateScanButton = screen.getByText('Simulate QR Scan');
      fireEvent.click(simulateScanButton);

      // Should navigate to different game
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/join/DIFFERENT123');
      });
    });
  });

  describe('Deep Link Handling', () => {
    it('should register and handle deep link events', async () => {
      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      // Verify deep link listener was registered
      expect(DeepLinkHandler.addListener).toHaveBeenCalled();

      // Get the listener function
      const listenerCall = (DeepLinkHandler.addListener as any).mock.calls[0];
      const handleDeepLink = listenerCall[0];

      // Simulate deep link event
      handleDeepLink({
        action: 'join',
        gameId: 'NEWGAME123',
      });

      // Should navigate to new game
      expect(mockNavigate).toHaveBeenCalledWith('/join/NEWGAME123');
    });

    it('should clean up deep link listener on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      unmount();

      expect(DeepLinkHandler.removeListener).toHaveBeenCalled();
    });
  });

  describe('Loading States and UI Feedback', () => {
    it('should show loading state during game joining', async () => {
      const mockGuestSessionManager = {
        createSession: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockGuestSession), 100))),
        setActiveGameId: vi.fn(),
      };
      (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      // Should show loading state
      expect(screen.getByText('Joining...')).toBeInTheDocument();
      expect(joinButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('should disable inputs during loading', async () => {
      (mockConvex.query as any).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockGamePreview), 100)));

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      // Should show loading and disable inputs
      expect(screen.getByText('Loading game information...')).toBeInTheDocument();
      
      const nameInput = screen.getByPlaceholderText('Enter your name (optional)');
      expect(nameInput).toBeDisabled();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      expect(nameInput).not.toBeDisabled();
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding flow from QR scan to game join', async () => {
      (DeepLinkHandler.validateQRData as any).mockReturnValue({
        action: 'join',
        gameId: 'TEST123',
      });

      const mockGuestSessionManager = {
        createSession: vi.fn().mockResolvedValue(mockGuestSession),
        setActiveGameId: vi.fn(),
      };
      (GuestSessionManager as any).mockImplementation(() => mockGuestSessionManager);

      render(
        <TestWrapper>
          <JoinGame />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Golf Game')).toBeInTheDocument();
      });

      // Step 1: Open QR scanner
      const scanButton = screen.getByRole('button', { name: 'Scan Different QR Code' });
      fireEvent.click(scanButton);
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();

      // Step 2: Scan QR code
      const simulateScanButton = screen.getByText('Simulate QR Scan');
      fireEvent.click(simulateScanButton);

      // Should return to join game view
      await waitFor(() => {
        expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
      });

      // Step 3: Enter name
      const nameInput = screen.getByPlaceholderText('Enter your name (optional)');
      fireEvent.change(nameInput, { target: { value: 'Test Player' } });

      // Step 4: Join game
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      fireEvent.click(joinButton);

      // Verify complete flow
      await waitFor(() => {
        expect(mockGuestSessionManager.createSession).toHaveBeenCalledWith('Test Player');
        expect(mockConvex.mutation).toHaveBeenCalledWith(
          mockApi.guests.joinGameAsGuest,
          {
            gameId: mockGamePreview.id,
            guestId: mockGuestSession.id,
          }
        );
        expect(mockGuestSessionManager.setActiveGameId).toHaveBeenCalledWith(mockGamePreview.id);
        expect(mockNavigate).toHaveBeenCalledWith('/game/TEST123', {
          state: {
            playerId: 'player123',
            guestSession: mockGuestSession,
            gamePreview: mockGamePreview,
          },
        });
      });
    });
  });
});