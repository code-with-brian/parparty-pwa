import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Heart, 
  Laugh, 
  Zap, 
  Eye, 
  MessageCircle, 
  Camera, 
  Trophy, 
  ShoppingCart,
  Send,
  MoreHorizontal,
  Trash2,
  UserPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationManager } from '@/utils/notificationManager';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { fadeInUp, staggerContainer, staggerItem, listItem } from '@/utils/animations';
import { useAuth } from '@/contexts/AuthContext';

interface SocialFeedProps {
  gameId: Id<"games">;
  currentPlayerId?: Id<"players">;
  className?: string;
  onCameraPress?: () => void;
}

interface ReactionButtonProps {
  type: 'like' | 'love' | 'laugh' | 'wow';
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const ReactionButton = memo(({ type, count, isActive, onClick }: ReactionButtonProps) => {
  const icons = useMemo(() => ({
    like: Heart,
    love: Heart,
    laugh: Laugh,
    wow: Eye,
  }), []);

  const colors = useMemo(() => ({
    like: isActive ? 'text-red-500' : 'text-gray-400',
    love: isActive ? 'text-pink-500' : 'text-gray-400',
    laugh: isActive ? 'text-yellow-500' : 'text-gray-400',
    wow: isActive ? 'text-blue-500' : 'text-gray-400',
  }), [isActive]);

  const Icon = icons[type];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`flex items-center gap-1 h-8 px-2 ${colors[type]} hover:bg-gray-100`}
    >
      <Icon className="w-4 h-4" />
      {count > 0 && <span className="text-xs">{count}</span>}
    </Button>
  );
});

interface SocialPostProps {
  post: any;
  currentPlayerId?: Id<"players">;
  onReaction: (postId: Id<"socialPosts">, reactionType: 'like' | 'love' | 'laugh' | 'wow') => void;
  onRemoveReaction: (postId: Id<"socialPosts">) => void;
  onDeletePost?: (postId: Id<"socialPosts">) => void;
}

const SocialPost = memo(({ post, currentPlayerId, onReaction, onRemoveReaction, onDeletePost }: SocialPostProps) => {
  const [showActions, setShowActions] = useState(false);

  // Get current user's reaction - memoized for performance
  const userReaction = useMemo(() => 
    post.reactions?.find((r: any) => r.playerId === currentPlayerId),
    [post.reactions, currentPlayerId]
  );

  // Count reactions by type - memoized for performance
  const reactionCounts = useMemo(() => 
    (post.reactions || []).reduce((acc: any, reaction: any) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {}),
    [post.reactions]
  );

  const { isAuthenticated, promptSignUp } = useAuth();

  const handleReactionClick = useCallback((type: 'like' | 'love' | 'laugh' | 'wow') => {
    if (!isAuthenticated) {
      promptSignUp('reaction', () => {
        if (userReaction?.type === type) {
          onRemoveReaction(post._id);
        } else {
          onReaction(post._id, type);
        }
      });
      return;
    }

    if (userReaction?.type === type) {
      onRemoveReaction(post._id);
    } else {
      onReaction(post._id, type);
    }
  }, [userReaction, onRemoveReaction, onReaction, post._id, isAuthenticated, promptSignUp]);

  const getPostIcon = useMemo(() => {
    switch (post.type) {
      case 'photo':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'score':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  }, [post.type]);

  const canDelete = useMemo(() => currentPlayerId === post.playerId, [currentPlayerId, post.playerId]);

  return (
    <motion.div
      variants={listItem}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-700 font-medium">
                {post.player?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {getPostIcon}
                <span className="font-medium">{post.player?.name || 'Unknown Player'}</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          {canDelete && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDeletePost?.(post._id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="mb-3">
          <p className="text-gray-800">{post.content}</p>
        </div>
        
        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-1 gap-2">
              {post.media.map((photo: any) => (
                <div key={photo._id} className="relative">
                  <OptimizedImage
                    src={photo.url}
                    alt={photo.caption || 'Shared photo'}
                    className="w-full h-64 rounded-lg"
                    height={256}
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                      <p className="text-sm">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Reactions */}
        {currentPlayerId && (
          <div className="flex items-center gap-1 pt-2 border-t">
            <ReactionButton
              type="like"
              count={reactionCounts.like || 0}
              isActive={userReaction?.type === 'like'}
              onClick={() => handleReactionClick('like')}
            />
            <ReactionButton
              type="love"
              count={reactionCounts.love || 0}
              isActive={userReaction?.type === 'love'}
              onClick={() => handleReactionClick('love')}
            />
            <ReactionButton
              type="laugh"
              count={reactionCounts.laugh || 0}
              isActive={userReaction?.type === 'laugh'}
              onClick={() => handleReactionClick('laugh')}
            />
            <ReactionButton
              type="wow"
              count={reactionCounts.wow || 0}
              isActive={userReaction?.type === 'wow'}
              onClick={() => handleReactionClick('wow')}
            />
          </div>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
});

interface CreatePostProps {
  gameId: Id<"games">;
  playerId: Id<"players">;
  onPostCreated: () => void;
  onCameraPress?: () => void;
}

const CreatePost = memo(({ gameId, playerId, onPostCreated, onCameraPress }: CreatePostProps) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { isAuthenticated, promptSignUp } = useAuth();

  const createPost = useMutation(api.socialPosts.createSocialPost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!isAuthenticated) {
      promptSignUp('post', () => {
        performCreatePost();
      });
      return;
    }

    await performCreatePost();
  };

  const performCreatePost = async () => {
    try {
      setIsPosting(true);
      await createPost({
        gameId,
        playerId,
        type: 'custom',
        content: content.trim(),
      });

      // Trigger social moment notification for other players
      await notificationManager.notifySocialEvent(
        'New social post',
        `Someone shared: ${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`,
        gameId,
        'low'
      );

      setContent('');
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Share something about your round..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            disabled={isPosting}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {onCameraPress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCameraPress}
                  className="p-2"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
              <span className="text-xs text-gray-500">
                {content.length}/500
              </span>
            </div>
            <Button
              type="submit"
              disabled={!content.trim() || isPosting}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isPosting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const SocialFeed = memo(({ gameId, currentPlayerId, className = '', onCameraPress }: SocialFeedProps) => {
  const { isAuthenticated, promptSignUp } = useAuth();

  // Real-time social feed subscription
  const socialFeed = useQuery(api.socialPosts.getGameSocialFeed, { gameId });

  // Mutations
  const addReaction = useMutation(api.socialPosts.addReaction);
  const removeReaction = useMutation(api.socialPosts.removeReaction);
  const deletePost = useMutation(api.socialPosts.deleteSocialPost);

  const handleReaction = useCallback(async (postId: Id<"socialPosts">, reactionType: 'like' | 'love' | 'laugh' | 'wow') => {
    if (!currentPlayerId) return;
    
    if (!isAuthenticated) {
      promptSignUp('reaction', () => {
        addReactionToPost(postId, reactionType);
      });
      return;
    }

    await addReactionToPost(postId, reactionType);
  }, [currentPlayerId, isAuthenticated, promptSignUp]);

  const addReactionToPost = async (postId: Id<"socialPosts">, reactionType: 'like' | 'love' | 'laugh' | 'wow') => {
    try {
      await addReaction({
        postId,
        playerId: currentPlayerId!,
        reactionType,
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = useCallback(async (postId: Id<"socialPosts">) => {
    if (!currentPlayerId) return;
    
    try {
      await removeReaction({
        postId,
        playerId: currentPlayerId,
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [currentPlayerId, removeReaction]);

  const handleDeletePost = useCallback(async (postId: Id<"socialPosts">) => {
    if (!currentPlayerId) return;
    
    try {
      await deletePost({
        postId,
        playerId: currentPlayerId,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  }, [currentPlayerId, deletePost]);

  const handlePostCreated = useCallback(() => {
    // The real-time subscription will automatically update the feed
  }, []);

  if (!socialFeed) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Create Post - Show for both authenticated and guest users, but trigger conversion for guests */}
      {currentPlayerId && (
        <CreatePost
          gameId={gameId}
          playerId={currentPlayerId}
          onPostCreated={handlePostCreated}
          onCameraPress={onCameraPress}
        />
      )}

      {/* Social Feed */}
      <motion.div 
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {socialFeed.length === 0 ? (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No posts yet</h3>
                <p className="text-gray-500">
                  Be the first to share something about this round!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {socialFeed.map((post) => (
              <SocialPost
                key={post._id}
                post={post}
                currentPlayerId={currentPlayerId}
                onReaction={handleReaction}
                onRemoveReaction={handleRemoveReaction}
                onDeletePost={handleDeletePost}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
});

export default SocialFeed;