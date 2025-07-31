import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Eye, Calendar, Trophy, Camera, ShoppingBag, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface HighlightMoment {
  type: 'best_shot' | 'worst_shot' | 'achievement' | 'social_moment' | 'order';
  holeNumber?: number;
  description: string;
  timestamp: number;
  photoId?: string;
}

interface Photo {
  _id: string;
  url: string;
  caption?: string;
  aiCaption?: string;
  holeNumber?: number;
  timestamp: number;
}

interface TimelineEvent {
  type: 'score' | 'photo' | 'order';
  timestamp: number;
  holeNumber?: number;
  data: any;
}

interface HighlightReelData {
  id: string;
  player: {
    name: string;
    avatar?: string;
  };
  game: {
    name: string;
    date: string;
  };
  narrative: string;
  keyMoments: HighlightMoment[];
  photos: Photo[];
  stats: {
    totalStrokes: number;
    holesPlayed: number;
    averageScore: string;
    bestScore: number;
    photosShared: number;
    ordersPlaced: number;
  };
  timeline: TimelineEvent[];
  generatedAt: number;
  viewCount: number;
  shareableUrl?: string;
}

interface HighlightReelProps {
  highlightData: HighlightReelData;
  onShare?: (content: any) => void;
  onViewIncrement?: () => void;
  className?: string;
}

const HighlightReel: React.FC<HighlightReelProps> = ({
  highlightData,
  onShare,
  onViewIncrement,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<'story' | 'moments' | 'photos' | 'timeline'>('story');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  React.useEffect(() => {
    // Increment view count when component mounts
    if (onViewIncrement) {
      onViewIncrement();
    }
  }, [onViewIncrement]);

  const handleShare = async () => {
    const shareContent = {
      title: `${highlightData.player.name}'s Golf Round`,
      text: highlightData.narrative,
      url: highlightData.shareableUrl || window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareContent);
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareContent.url);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard');
      }
    }

    if (onShare) {
      onShare(shareContent);
    }
  };

  const getMomentIcon = (type: string) => {
    switch (type) {
      case 'best_shot':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-green-500" />;
      case 'social_moment':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMomentColor = (type: string) => {
    switch (type) {
      case 'best_shot':
        return 'bg-yellow-100 border-yellow-300';
      case 'achievement':
        return 'bg-green-100 border-green-300';
      case 'social_moment':
        return 'bg-blue-100 border-blue-300';
      case 'order':
        return 'bg-purple-100 border-purple-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {highlightData.player.avatar && (
              <img
                src={highlightData.player.avatar}
                alt={highlightData.player.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {highlightData.player.name}'s Round
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {highlightData.game.date}
                </span>
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {highlightData.viewCount} views
                </span>
              </div>
            </div>
          </div>
          <Button onClick={handleShare} variant="outline" className="flex items-center space-x-2">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {highlightData.game.name}
        </h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {highlightData.stats.holesPlayed}
            </div>
            <div className="text-sm text-gray-600">Holes Played</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {highlightData.stats.averageScore}
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {highlightData.stats.photosShared}
            </div>
            <div className="text-sm text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {highlightData.stats.ordersPlaced}
            </div>
            <div className="text-sm text-gray-600">F&B Orders</div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'story', label: 'Story', icon: '📖' },
          { key: 'moments', label: 'Key Moments', icon: '⭐' },
          { key: 'photos', label: 'Photos', icon: '📸' },
          { key: 'timeline', label: 'Timeline', icon: '⏱️' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'story' && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Your Round Story</h3>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {highlightData.narrative}
                </p>
              </div>
            </Card>
          )}

          {activeTab === 'moments' && (
            <div className="space-y-4">
              {highlightData.keyMoments.map((moment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`p-4 border-l-4 ${getMomentColor(moment.type)}`}>
                    <div className="flex items-start space-x-3">
                      {getMomentIcon(moment.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {moment.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {moment.holeNumber && (
                            <Badge variant="outline" className="text-xs">
                              Hole {moment.holeNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-800">{moment.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(moment.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highlightData.photos.map((photo, index) => (
                <motion.div
                  key={photo._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.aiCaption || 'Golf moment'}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {photo.aiCaption || photo.caption || 'Great golf moment!'}
                      </p>
                      {photo.holeNumber && (
                        <Badge variant="outline" className="text-xs mt-2">
                          Hole {photo.holeNumber}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Round Timeline</h3>
              <div className="space-y-4">
                {highlightData.timeline.map((event, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      {event.type === 'score' && <Trophy className="w-4 h-4 text-green-600" />}
                      {event.type === 'photo' && <Camera className="w-4 h-4 text-blue-600" />}
                      {event.type === 'order' && <ShoppingBag className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {event.type === 'score' && `Hole ${event.holeNumber}: ${event.data.strokes} strokes`}
                          {event.type === 'photo' && `Photo captured${event.holeNumber ? ` at hole ${event.holeNumber}` : ''}`}
                          {event.type === 'order' && `Ordered ${event.data.items.join(', ')}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.aiCaption || 'Golf moment'}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="p-4">
                <p className="text-gray-800 mb-2">
                  {selectedPhoto.aiCaption || selectedPhoto.caption || 'Great golf moment!'}
                </p>
                <div className="flex items-center justify-between">
                  {selectedPhoto.holeNumber && (
                    <Badge variant="outline">
                      Hole {selectedPhoto.holeNumber}
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {new Date(selectedPhoto.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HighlightReel;