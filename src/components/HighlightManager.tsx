import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Sparkles, RefreshCw, Share2, Eye, Calendar, Loader2 } from 'lucide-react';
import HighlightReel from './HighlightReel';
import toast from 'react-hot-toast';

interface HighlightManagerProps {
  gameId: Id<"games">;
  playerId: Id<"players">;
  className?: string;
}

const HighlightManager: React.FC<HighlightManagerProps> = ({
  gameId,
  playerId,
  className = "",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullReel, setShowFullReel] = useState(false);

  // Queries
  const highlightReel = useQuery(api.highlights.assembleHighlightReel, {
    gameId,
    playerId,
  });

  const playerHighlights = useQuery(api.highlights.getPlayerHighlights, {
    gameId,
    playerId,
  });

  // Mutations
  const generateHighlights = useMutation(api.highlights.generateHighlights);
  const incrementViewCount = useMutation(api.highlights.incrementViewCount);
  const generateShareableContent = useMutation(api.highlights.generateShareableContent);

  const handleGenerateHighlights = async () => {
    setIsGenerating(true);
    try {
      await generateHighlights({ gameId, playerId });
      toast.success('🎬 Your highlight reel has been generated!');
    } catch (error) {
      console.error('Failed to generate highlights:', error);
      toast.error('Failed to generate highlights. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewIncrement = async () => {
    if (playerHighlights?._id) {
      try {
        await incrementViewCount({ highlightId: playerHighlights._id });
      } catch (error) {
        console.error('Failed to increment view count:', error);
      }
    }
  };

  const handleShare = async (content: any) => {
    try {
      const shareableContent = await generateShareableContent({ gameId, playerId });
      
      // Track sharing analytics
      console.log('Highlight shared:', shareableContent);
      toast.success('Highlight shared successfully!');
    } catch (error) {
      console.error('Failed to generate shareable content:', error);
      toast.error('Failed to share highlight.');
    }
  };

  if (!playerHighlights && !isGenerating) {
    return (
      <div className={`${className}`}>
        <Card className="p-8 text-center bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="mb-6">
            <Sparkles className="w-16 h-16 mx-auto text-purple-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Create Your AI Highlight Reel
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Transform your round into a personalized story with AI-generated captions, 
              key moments, and a narrative that captures your golf experience.
            </p>
          </div>
          
          <Button
            onClick={handleGenerateHighlights}
            disabled={isGenerating}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Your Highlights...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate AI Highlights
              </>
            )}
          </Button>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>✨ AI-powered narrative generation</p>
            <p>📸 Smart photo captions</p>
            <p>🏆 Key moment detection</p>
            <p>📱 Easy social sharing</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className={`${className}`}>
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 mx-auto text-purple-500 animate-spin" />
              <Sparkles className="w-8 h-8 absolute top-2 right-2 text-yellow-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
              Creating Your Highlight Reel
            </h3>
            <p className="text-gray-600">
              Our AI is analyzing your round, generating captions, and crafting your story...
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <span>Analyzing your scores and key moments</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <span>Generating AI captions for your photos</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span>Creating your personalized narrative</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!highlightReel) {
    return (
      <div className={`${className}`}>
        <Card className="p-6 text-center">
          <p className="text-gray-600">Loading your highlight reel...</p>
        </Card>
      </div>
    );
  }

  if (showFullReel) {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button
            onClick={() => setShowFullReel(false)}
            variant="outline"
            size="sm"
          >
            ← Back to Summary
          </Button>
        </div>
        <HighlightReel
          highlightData={highlightReel}
          onShare={handleShare}
          onViewIncrement={handleViewIncrement}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Your AI Highlight Reel
              </h3>
              <p className="text-sm text-gray-600">
                Personalized story of your round
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleGenerateHighlights}
              disabled={isGenerating}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button
              onClick={() => setShowFullReel(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              View Full Reel
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {highlightReel.keyMoments.length}
            </div>
            <div className="text-xs text-gray-600">Key Moments</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {highlightReel.photos.length}
            </div>
            <div className="text-xs text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {highlightReel.stats.holesPlayed}
            </div>
            <div className="text-xs text-gray-600">Holes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">
              {highlightReel.viewCount}
            </div>
            <div className="text-xs text-gray-600">Views</div>
          </div>
        </div>

        {/* Narrative Preview */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Your Story</h4>
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {highlightReel.narrative}
          </p>
        </div>

        {/* Key Moments Preview */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Top Moments</h4>
          <div className="space-y-2">
            {highlightReel.keyMoments.slice(0, 3).map((moment, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {moment.type.replace('_', ' ')}
                </Badge>
                <span className="text-gray-700 line-clamp-1">
                  {moment.description}
                </span>
              </div>
            ))}
            {highlightReel.keyMoments.length > 3 && (
              <p className="text-xs text-gray-500">
                +{highlightReel.keyMoments.length - 3} more moments
              </p>
            )}
          </div>
        </div>

        {/* Photo Preview */}
        {highlightReel.photos.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Photos</h4>
            <div className="flex space-x-2 overflow-x-auto">
              {highlightReel.photos.slice(0, 4).map((photo) => (
                <img
                  key={photo._id}
                  src={photo.url}
                  alt={photo.aiCaption || photo.caption || 'Golf moment'}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ))}
              {highlightReel.photos.length > 4 && (
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-600">
                    +{highlightReel.photos.length - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {highlightReel.game.date}
            </span>
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {highlightReel.viewCount} views
            </span>
          </div>
          
          <Button
            onClick={async () => {
              const shareableContent = await generateShareableContent({ gameId, playerId });
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: shareableContent.title,
                    text: shareableContent.shortSummary,
                    url: highlightReel.shareableUrl || window.location.href,
                  });
                } catch (error) {
                  console.log('Share cancelled');
                }
              } else {
                try {
                  await navigator.clipboard.writeText(
                    highlightReel.shareableUrl || window.location.href
                  );
                  toast.success('Link copied to clipboard!');
                } catch (error) {
                  toast.error('Failed to copy link');
                }
              }
            }}
            variant="outline"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HighlightManager;