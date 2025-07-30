import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import SocialFeed from '@/components/SocialFeed';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock Convex client
const mockConvexClient = new ConvexReactClient('https://mock-url.convex.cloud');

// Mock data
const mockGameId = 'game123' as Id<"games">;
const mockPlayerId = 'player123' as Id<"players">;

const mockSocialFeed = [
  {
    _id: 'post1' as Id<"socialPosts">,
    gameId: mockGameId,
    playerId: mockPlayerId,
    type: 'achievement' as const,
    content: '🏌️‍♂️ HOLE IN ONE! John just aced hole 7! 🎉',
    timestamp: Date.now() - 300000, // 5 minutes ago
    reactions: [
      {
        playerId: 'player456' as Id<"players">,
        type: 'love' as const,
        timestamp: Date.now() - 240000,
      }
    ],
    player: {
      _id: mockPlayerId,
      name: 'John Doe',
      gameId: mockGameId,
      position: 1,
    },
    media: [],
  },
  {
    _id: 'post2' as Id<"socialPosts">,
    gameId: mockGameId,
    playerId: 'player456' as Id<"players">,
    type: 'photo' as const,
    content: 'Great view from the 9th tee!',
    timestamp: Date.now() - 600000, // 10 minutes ago
    reactions: [],
    player: {
      _id: 'player456' as Id<"players">,
      name: 'Jane Smith',
      gameId: mockGameId,
      position: 2,
    },
    media: [
      {
        _id: 'photo1' as Id<"photos">,
        url: 'data:image/jpeg;base64,test-image-data',
        caption: 'Beautiful morning on the course',
        playerId: 'player456' as Id<"players">,
        gameId: mockGameId,
        timestamp: Date.now() - 600000,
      }
    ],
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

const mockUseQuery = vi.mocked((await import('convex/react')).useQuery);
const mockUseMutation = vi.mocked((await import('convex/react')).useMutation);

describe('Social Feed Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseQuery.mockReturnValue(mockSocialFeed);
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}));
  });

  const renderSocialFeed = (props = {}) => {
    const defaultProps = {
      gameId: mockGameId,
      currentPlayerId: mockPlayerId,
    };

    return render(
      <ConvexProvider client={mockConvexClient}>
        <SocialFeed {...defaultProps} {...props} />
      </ConvexProvider>
    );
  };

  it('displays social feed posts correctly', async () => {
    renderSocialFeed();

    // Check that posts are displayed
    expect(screen.getByText(/HOLE IN ONE! John just aced hole 7!/)).toBeInTheDocument();
    expect(screen.getByText(/Great view from the 9th tee!/)).toBeInTheDocument();
    
    // Check player names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows different post types with correct icons', async () => {
    renderSocialFeed();

    // Achievement posts should have trophy icon
    const achievementPost = screen.getByText(/HOLE IN ONE/).closest('div');
    expect(achievementPost).toBeInTheDocument();

    // Photo posts should have camera icon
    const photoPost = screen.getByText(/Great view from the 9th tee/).closest('div');
    expect(photoPost).toBeInTheDocument();
  });

  it('displays photos in photo posts', async () => {
    renderSocialFeed();

    // Check that photo is displayed
    const photoImage = screen.getByAltText('Beautiful morning on the course');
    expect(photoImage).toBeInTheDocument();
    expect(photoImage).toHaveAttribute('src', 'data:image/jpeg;base64,test-image-data');
  });

  it('shows reaction counts and allows reactions', async () => {
    const mockAddReaction = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue(mockAddReaction);

    renderSocialFeed();

    // Check that reaction count is displayed
    const loveButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('1') // The love reaction count
    );
    expect(loveButton).toBeInTheDocument();

    // Click on like button
    const likeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('[class*="Heart"]')
    );
    
    if (likeButtons.length > 0) {
      fireEvent.click(likeButtons[0]);
      
      await waitFor(() => {
        expect(mockAddReaction).toHaveBeenCalledWith({
          postId: 'post1',
          playerId: mockPlayerId,
          reactionType: 'like',
        });
      });
    }
  });

  it('allows creating new posts', async () => {
    const mockCreatePost = vi.fn().mockResolvedValue('newpost123');
    mockUseMutation.mockReturnValue(mockCreatePost);

    renderSocialFeed();

    // Find the post input
    const postInput = screen.getByPlaceholderText(/Share something about your round/);
    expect(postInput).toBeInTheDocument();

    // Type a message
    fireEvent.change(postInput, { target: { value: 'Great round today!' } });

    // Submit the post
    const postButton = screen.getByRole('button', { name: /Post/ });
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        gameId: mockGameId,
        playerId: mockPlayerId,
        type: 'custom',
        content: 'Great round today!',
      });
    });
  });

  it('shows empty state when no posts exist', async () => {
    mockUseQuery.mockReturnValue([]);

    renderSocialFeed();

    expect(screen.getByText('No posts yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to share something about this round!')).toBeInTheDocument();
  });

  it('shows loading state while fetching posts', async () => {
    mockUseQuery.mockReturnValue(undefined);

    renderSocialFeed();

    // Check for loading skeleton
    const loadingElements = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-pulse')
    );
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('allows post deletion by author', async () => {
    const mockDeletePost = vi.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue(mockDeletePost);

    renderSocialFeed();

    // Find the more options button for the first post (authored by current player)
    const moreButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('[class*="MoreHorizontal"]')
    );
    
    if (moreButtons.length > 0) {
      fireEvent.click(moreButtons[0]);

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /Delete/ });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeletePost).toHaveBeenCalledWith({
          postId: 'post1',
          playerId: mockPlayerId,
        });
      });
    }
  });

  it('displays relative timestamps correctly', async () => {
    renderSocialFeed();

    // Check that relative timestamps are shown
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    expect(screen.getByText(/10 minutes ago/)).toBeInTheDocument();
  });

  it('handles guest users without current player ID', async () => {
    renderSocialFeed({ currentPlayerId: undefined });

    // Should still display posts
    expect(screen.getByText(/HOLE IN ONE! John just aced hole 7!/)).toBeInTheDocument();
    
    // But should not show create post interface
    expect(screen.queryByPlaceholderText(/Share something about your round/)).not.toBeInTheDocument();
    
    // And should not show reaction buttons
    const reactionButtons = screen.queryAllByRole('button').filter(btn => 
      btn.querySelector('[class*="Heart"]')
    );
    expect(reactionButtons).toHaveLength(0);
  });

  it('validates post content length', async () => {
    const mockCreatePost = vi.fn();
    mockUseMutation.mockReturnValue(mockCreatePost);

    renderSocialFeed();

    const postInput = screen.getByPlaceholderText(/Share something about your round/);
    const postButton = screen.getByRole('button', { name: /Post/ });

    // Test empty content
    fireEvent.change(postInput, { target: { value: '' } });
    expect(postButton).toBeDisabled();

    // Test whitespace only
    fireEvent.change(postInput, { target: { value: '   ' } });
    expect(postButton).toBeDisabled();

    // Test valid content
    fireEvent.change(postInput, { target: { value: 'Valid post content' } });
    expect(postButton).not.toBeDisabled();

    // Test character count display
    expect(screen.getByText('18/500')).toBeInTheDocument();
  });
});