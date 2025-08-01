import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Trophy,
  Camera,
  MapPin,
  Clock,
  ThumbsUp,
  Smile,
  Frown,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  holeNumber?: number;
  score?: number;
  par?: number;
  timestamp: Date;
  likes: number;
  comments: number;
  reactions: {
    like: number;
    love: number;
    laugh: number;
    wow: number;
  };
  isLiked: boolean;
  userReaction?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

const mockPosts: SocialPost[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Mike Johnson',
    content: 'Eagle on the par 5! 🦅 What a shot!',
    holeNumber: 11,
    score: 3,
    par: 5,
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    likes: 12,
    comments: 4,
    reactions: { like: 8, love: 3, laugh: 0, wow: 1 },
    isLiked: true,
    userReaction: 'love'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Sarah Chen',
    content: 'Perfect conditions out here today! ☀️',
    image: '/api/placeholder/300/200',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    likes: 8,
    comments: 2,
    reactions: { like: 6, love: 2, laugh: 0, wow: 0 },
    isLiked: false,
    userReaction: undefined
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Alex Rodriguez',
    content: 'First birdie of the round! 🐦',
    holeNumber: 7,
    score: 2,
    par: 3,
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    likes: 15,
    comments: 6,
    reactions: { like: 10, love: 3, laugh: 1, wow: 1 },
    isLiked: true,
    userReaction: 'like'
  }
];

interface SocialScreenProps {
  onCameraPress?: () => void;
}

export function SocialScreen({ onCameraPress }: SocialScreenProps = {}) {
  const [posts, setPosts] = useState<SocialPost[]>(mockPosts);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);

  const reactions = [
    { type: 'like', icon: ThumbsUp, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
    { type: 'love', icon: Heart, color: 'text-red-500', bgColor: 'bg-red-500/20' },
    { type: 'laugh', icon: Smile, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
    { type: 'wow', icon: Zap, color: 'text-purple-500', bgColor: 'bg-purple-500/20' }
  ];

  const handleReaction = (postId: string, reactionType: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const newReactions = { ...post.reactions };
          
          // Remove previous reaction
          if (post.userReaction) {
            newReactions[post.userReaction as keyof typeof newReactions]--;
          }
          
          // Add new reaction or toggle off
          if (post.userReaction === reactionType) {
            // Toggle off
            return {
              ...post,
              userReaction: undefined,
              likes: post.likes - 1
            };
          } else {
            // Add new reaction
            newReactions[reactionType as keyof typeof newReactions]++;
            return {
              ...post,
              reactions: newReactions,
              userReaction: reactionType,
              likes: post.userReaction ? post.likes : post.likes + 1
            };
          }
        }
        return post;
      })
    );

    // Trigger celebration for great scores
    const post = posts.find(p => p.id === postId);
    if (post && post.score && post.par && post.score <= post.par - 2) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  };

  const handleLike = (postId: string) => {
    handleReaction(postId, 'like');
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return 'text-yellow-400'; // Eagle or better
    if (diff === -1) return 'text-green-400'; // Birdie
    if (diff === 0) return 'text-blue-400'; // Par
    if (diff === 1) return 'text-orange-400'; // Bogey
    return 'text-red-400'; // Double or worse
  };

  const getScoreEmoji = (score: number, par: number) => {
    const diff = score - par;
    if (score === 1) return '⭐'; // Hole in one
    if (diff <= -2) return '🦅'; // Eagle or better
    if (diff === -1) return '🐦'; // Birdie
    if (diff === 0) return '⚪'; // Par
    if (diff === 1) return '🟡'; // Bogey
    return '🔴'; // Double or worse
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
      
      <div className="relative">
        {/* Header */}
        <div className="pt-4 px-6 pb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Social Feed</h1>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewPost(true)}
              className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-lg"
            >
              <Camera className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="px-6 space-y-4 pb-20">
          <AnimatePresence>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {post.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{post.userName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(post.timestamp)}
                        {post.holeNumber && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3 h-3" />
                            <span>Hole {post.holeNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Score Display */}
                {post.score && post.par && (
                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="text-2xl">
                        {getScoreEmoji(post.score, post.par)}
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${getScoreColor(post.score, post.par)}`}>
                          {post.score} on Par {post.par}
                        </div>
                        <div className="text-xs text-slate-400">
                          {post.score - post.par === 0 ? 'Par' : 
                           post.score - post.par < 0 ? `${Math.abs(post.score - post.par)} under par` :
                           `${post.score - post.par} over par`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Post Content */}
                <div className="px-4 pb-3">
                  <p className="text-white text-sm leading-relaxed">{post.content}</p>
                </div>

                {/* Post Image */}
                {post.image && (
                  <div className="px-4 pb-3">
                    <img 
                      src={post.image} 
                      alt="Post" 
                      className="w-full rounded-2xl bg-slate-800"
                    />
                  </div>
                )}

                {/* Reactions Bar */}
                <div className="px-4 py-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {reactions.map((reaction) => {
                        const count = post.reactions[reaction.type as keyof typeof post.reactions];
                        if (count === 0) return null;
                        
                        return (
                          <div key={reaction.type} className="flex items-center gap-1">
                            <div className={`w-5 h-5 rounded-full ${reaction.bgColor} flex items-center justify-center`}>
                              <reaction.icon className={`w-3 h-3 ${reaction.color}`} />
                            </div>
                            <span className="text-xs text-slate-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      {post.comments} comments
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-around">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      post.isLiked 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'hover:bg-white/5 text-slate-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">Like</span>
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 text-slate-400 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Comment</span>
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 text-slate-400 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* New Post Modal */}
        <AnimatePresence>
          {showNewPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-end justify-center"
              onClick={() => setShowNewPost(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                
                <h2 className="text-xl font-bold text-white mb-4">Share Your Round</h2>
                
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's happening on the course?"
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-400 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={onCameraPress}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Camera className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <MapPin className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <Trophy className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Handle post creation
                      setShowNewPost(false);
                      setNewPostContent('');
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full font-medium disabled:opacity-50"
                    disabled={!newPostContent.trim()}
                  >
                    Post
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}