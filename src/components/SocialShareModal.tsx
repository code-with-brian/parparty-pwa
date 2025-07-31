import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { SocialSharingManager } from '../utils/socialSharing';
import type { ShareContent, ShareOptions } from '../utils/socialSharing';
import toast from 'react-hot-toast';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ShareContent;
  type?: 'highlight' | 'achievement' | 'game' | 'referral';
  gameId?: string;
  playerName?: string;
  onShare?: (platform: string, success: boolean) => void;
}

const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  content,
  type = 'highlight',
  gameId,
  playerName,
  onShare,
}) => {
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const handleShare = async (platform: string) => {
    setIsSharing(platform);
    
    try {
      let result;
      const options: ShareOptions = { platform: platform as any };

      switch (type) {
        case 'highlight':
          if (gameId && playerName) {
            result = await SocialSharingManager.shareHighlights(
              gameId,
              playerName,
              content.text,
              {},
              options
            );
          } else {
            result = await SocialSharingManager.shareContent(content, options);
          }
          break;
        
        case 'achievement':
          if (gameId && playerName) {
            result = await SocialSharingManager.shareAchievement(
              content.title,
              gameId,
              playerName,
              options
            );
          } else {
            result = await SocialSharingManager.shareContent(content, options);
          }
          break;
        
        case 'game':
          if (gameId) {
            result = await SocialSharingManager.shareGameQR(
              gameId,
              content.title,
              options
            );
          } else {
            result = await SocialSharingManager.shareContent(content, options);
          }
          break;
        
        default:
          result = await SocialSharingManager.shareContent(content, options);
      }

      if (result.success) {
        if (platform === 'copy') {
          setCopiedToClipboard(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopiedToClipboard(false), 2000);
        } else {
          toast.success(`Shared to ${SocialSharingManager.getPlatformInfo(platform).name}!`);
        }
        
        onShare?.(platform, true);
        
        // Close modal after successful share (except for copy)
        if (platform !== 'copy') {
          setTimeout(() => onClose(), 1000);
        }
      } else {
        toast.error(result.error || 'Failed to share');
        onShare?.(platform, false);
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share');
      onShare?.(platform, false);
    } finally {
      setIsSharing(null);
    }
  };

  const platforms = SocialSharingManager.getAvailablePlatforms().filter(p => p !== 'native');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-green-600" />
                <h3 id="share-modal-title" className="text-lg font-semibold">Share</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1"
                aria-label="Close share modal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-1">
                {content.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-3">
                {content.text}
              </p>
              <p className="text-xs text-blue-600 mt-2 truncate">
                {content.url}
              </p>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Share to:</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                  const platformInfo = SocialSharingManager.getPlatformInfo(platform);
                  const isLoading = isSharing === platform;
                  const isCopied = platform === 'copy' && copiedToClipboard;
                  
                  return (
                    <Button
                      key={platform}
                      variant="outline"
                      onClick={() => handleShare(platform)}
                      disabled={isSharing !== null}
                      className={`flex items-center space-x-2 h-12 ${platformInfo.color} ${
                        platform !== 'copy' ? 'text-white border-transparent hover:opacity-90' : ''
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-base">{platformInfo.icon}</span>
                      )}
                      <span className="text-sm font-medium">
                        {isCopied ? 'Copied!' : platformInfo.name}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Native Share Button (if available) */}
              {SocialSharingManager.getAvailablePlatforms().includes('native') && (
                <Button
                  onClick={() => handleShare('native')}
                  disabled={isSharing !== null}
                  className="w-full flex items-center space-x-2 h-12 bg-blue-500 text-white hover:bg-blue-600"
                >
                  {isSharing === 'native' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span>Share via System</span>
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> Share your golf moments to inspire friends to join ParParty!
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SocialShareModal;