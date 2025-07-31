import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import HighlightManager from '../HighlightManager';

// Mock Convex client
const mockConvex = new ConvexReactClient('mock-url');

// Mock useQuery and useMutation
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { useQuery, useMutation } = await import('convex/react');

const mockGameId = 'test-game-id' as any;
const mockPlayerId = 'test-player-id' as any;

const mockHighlightReel = {
  id: 'highlight-1',
  player: {
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  },
  game: {
    name: 'Test Golf Game',
    date: '2024-01-15',
  },
  narrative: 'John Doe had an amazing round at Test Golf Game! Playing 9 holes with great consistency.',
  keyMoments: [
    {
      type: 'best_shot',
      holeNumber: 3,
      description: 'Amazing birdie on hole 3!',
      timestamp: Date.now(),
    },
    {
      type: 'order',
      holeNumber: 6,
      description: 'Perfect timing for burger and drink at hole 6!',
      timestamp: Date.now() + 1000,
    },
  ],
  photos: [
    {
      _id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      caption: 'Great shot!',
      aiCaption: 'John capturing a great moment on hole 3!',
      holeNumber: 3,
      timestamp: Date.now(),
    },
  ],
  stats: {
    totalStrokes: 45,
    holesPlayed: 9,
    averageScore: '5.0',
    bestScore: 3,
    photosShared: 1,
    ordersPlaced: 1,
  },
  timeline: [
    {
      type: 'score',
      timestamp: Date.now(),
      holeNumber: 1,
      data: { strokes: 4 },
    },
    {
      type: 'photo',
      timestamp: Date.now() + 500,
      holeNumber: 3,
      data: { url: 'https://example.com/photo1.jpg', caption: 'Great shot!' },
    },
  ],
  generatedAt: Date.now(),
  viewCount: 5,
  shareableUrl: 'https://parparty.com/highlights/highlight-1',
};

const mockPlayerHighlights = {
  _id: 'highlight-1',
  gameId: mockGameId,
  playerId: mockPlayerId,
  narrative: 'Test narrative',
  keyMoments: [],
  photoIds: [],
  captions: [],
  generatedAt: Date.now(),
  viewCount: 0,
  isPublic: true,
};

const renderHighlightManager = (props = {}) => {
  return render(
    <BrowserRouter>
      <ConvexProvider client={mockConvex}>
        <HighlightManager
          gameId={mockGameId}
          playerId={mockPlayerId}
          {...props}
        />
      </ConvexProvider>
    </BrowserRouter>
  );
};

describe('HighlightManager', () => {
  const mockGenerateHighlights = vi.fn();
  const mockIncrementViewCount = vi.fn();
  const mockGenerateShareableContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useMutation).mockImplementation((mutation) => {
      if (mutation.toString().includes('generateHighlights')) {
        return mockGenerateHighlights;
      }
      if (mutation.toString().includes('incrementViewCount')) {
        return mockIncrementViewCount;
      }
      if (mutation.toString().includes('generateShareableContent')) {
        return mockGenerateShareableContent;
      }
      return vi.fn();
    });
  });

  describe('Initial State - No Highlights', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('assembleHighlightReel')) {
          return null;
        }
        if (query.toString().includes('getPlayerHighlights')) {
          return null;
        }
        return null;
      });
    });

    it('renders create highlight reel prompt when no highlights exist', () => {
      renderHighlightManager();

      expect(screen.getByText('Create Your AI Highlight Reel')).toBeInTheDocument();
      expect(screen.getByText(/Transform your round into a personalized story/)).toBeInTheDocument();
      expect(screen.getByText('Generate AI Highlights')).toBeInTheDocument();
    });

    it('shows AI features list', () => {
      renderHighlightManager();

      expect(screen.getByText('✨ AI-powered narrative generation')).toBeInTheDocument();
      expect(screen.getByText('📸 Smart photo captions')).toBeInTheDocument();
      expect(screen.getByText('🏆 Key moment detection')).toBeInTheDocument();
      expect(screen.getByText('📱 Easy social sharing')).toBeInTheDocument();
    });

    it('calls generateHighlights when generate button is clicked', async () => {
      renderHighlightManager();

      const generateButton = screen.getByText('Generate AI Highlights');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockGenerateHighlights).toHaveBeenCalledWith({
          gameId: mockGameId,
          playerId: mockPlayerId,
        });
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation(() => null);
      mockGenerateHighlights.mockImplementation(() => new Promise(() => {})); // Never resolves
    });

    it('shows loading state when generating highlights', async () => {
      renderHighlightManager();

      const generateButton = screen.getByText('Generate AI Highlights');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Creating Your Highlight Reel')).toBeInTheDocument();
        expect(screen.getByText(/Our AI is analyzing your round/)).toBeInTheDocument();
      });

      expect(screen.getByText('Analyzing your scores and key moments')).toBeInTheDocument();
      expect(screen.getByText('Generating AI captions for your photos')).toBeInTheDocument();
      expect(screen.getByText('Creating your personalized narrative')).toBeInTheDocument();
    });
  });

  describe('Highlights Summary View', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('assembleHighlightReel')) {
          return mockHighlightReel;
        }
        if (query.toString().includes('getPlayerHighlights')) {
          return mockPlayerHighlights;
        }
        return null;
      });
    });

    it('renders highlight summary when highlights exist', () => {
      renderHighlightManager();

      expect(screen.getByText('Your AI Highlight Reel')).toBeInTheDocument();
      expect(screen.getByText('Personalized story of your round')).toBeInTheDocument();
      expect(screen.getByText('View Full Reel')).toBeInTheDocument();
    });

    it('displays quick stats correctly', () => {
      renderHighlightManager();

      expect(screen.getByText('2')).toBeInTheDocument(); // Key moments
      expect(screen.getByText('Key Moments')).toBeInTheDocument();
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Photos
      expect(screen.getByText('Photos')).toBeInTheDocument();
      
      expect(screen.getByText('9')).toBeInTheDocument(); // Holes
      expect(screen.getByText('Holes')).toBeInTheDocument();
      
      expect(screen.getByText('5')).toBeInTheDocument(); // Views
      expect(screen.getByText('Views')).toBeInTheDocument();
    });

    it('shows narrative preview', () => {
      renderHighlightManager();

      expect(screen.getByText('Your Story')).toBeInTheDocument();
      expect(screen.getByText(/John Doe had an amazing round/)).toBeInTheDocument();
    });

    it('displays top moments preview', () => {
      renderHighlightManager();

      expect(screen.getByText('Top Moments')).toBeInTheDocument();
      expect(screen.getByText('best shot')).toBeInTheDocument();
      expect(screen.getByText('Amazing birdie on hole 3!')).toBeInTheDocument();
      expect(screen.getByText('order')).toBeInTheDocument();
      expect(screen.getByText(/Perfect timing for burger/)).toBeInTheDocument();
    });

    it('shows photo preview', () => {
      renderHighlightManager();

      expect(screen.getByText('Photos')).toBeInTheDocument();
      const photoImg = screen.getByAltText('John capturing a great moment on hole 3!');
      expect(photoImg).toBeInTheDocument();
      expect(photoImg).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('calls regenerate highlights when regenerate button is clicked', async () => {
      renderHighlightManager();

      const regenerateButton = screen.getByText('Regenerate');
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockGenerateHighlights).toHaveBeenCalledWith({
          gameId: mockGameId,
          playerId: mockPlayerId,
        });
      });
    });

    it('handles share functionality', async () => {
      // Mock navigator.share
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      mockGenerateShareableContent.mockResolvedValue({
        title: 'Test Title',
        shortSummary: 'Test summary',
      });

      renderHighlightManager();

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockGenerateShareableContent).toHaveBeenCalledWith({
          gameId: mockGameId,
          playerId: mockPlayerId,
        });
      });

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Test Title',
          text: 'Test summary',
          url: mockHighlightReel.shareableUrl,
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

      // Remove navigator.share
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
      });

      mockGenerateShareableContent.mockResolvedValue({
        title: 'Test Title',
        shortSummary: 'Test summary',
      });

      renderHighlightManager();

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(mockHighlightReel.shareableUrl);
      });
    });
  });

  describe('Full Reel View', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('assembleHighlightReel')) {
          return mockHighlightReel;
        }
        if (query.toString().includes('getPlayerHighlights')) {
          return mockPlayerHighlights;
        }
        return null;
      });
    });

    it('switches to full reel view when View Full Reel is clicked', async () => {
      renderHighlightManager();

      const viewFullReelButton = screen.getByText('View Full Reel');
      fireEvent.click(viewFullReelButton);

      await waitFor(() => {
        expect(screen.getByText('← Back to Summary')).toBeInTheDocument();
      });
    });

    it('returns to summary view when back button is clicked', async () => {
      renderHighlightManager();

      // Go to full reel view
      const viewFullReelButton = screen.getByText('View Full Reel');
      fireEvent.click(viewFullReelButton);

      await waitFor(() => {
        expect(screen.getByText('← Back to Summary')).toBeInTheDocument();
      });

      // Go back to summary
      const backButton = screen.getByText('← Back to Summary');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Your AI Highlight Reel')).toBeInTheDocument();
        expect(screen.getByText('View Full Reel')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation(() => null);
    });

    it('handles highlight generation errors gracefully', async () => {
      const toast = await import('react-hot-toast');
      mockGenerateHighlights.mockRejectedValue(new Error('Generation failed'));

      renderHighlightManager();

      const generateButton = screen.getByText('Generate AI Highlights');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith('Failed to generate highlights. Please try again.');
      });
    });

    it('handles share errors gracefully', async () => {
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('assembleHighlightReel')) {
          return mockHighlightReel;
        }
        if (query.toString().includes('getPlayerHighlights')) {
          return mockPlayerHighlights;
        }
        return null;
      });

      const toast = await import('react-hot-toast');
      mockGenerateShareableContent.mockRejectedValue(new Error('Share failed'));

      renderHighlightManager();

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith('Failed to share highlight.');
      });
    });
  });

  describe('View Count Increment', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation((query) => {
        if (query.toString().includes('assembleHighlightReel')) {
          return mockHighlightReel;
        }
        if (query.toString().includes('getPlayerHighlights')) {
          return mockPlayerHighlights;
        }
        return null;
      });
    });

    it('increments view count when component mounts with highlights', async () => {
      renderHighlightManager();

      await waitFor(() => {
        expect(mockIncrementViewCount).toHaveBeenCalledWith({
          highlightId: mockPlayerHighlights._id,
        });
      });
    });
  });
});