import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Gift, Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { SocialSharingManager } from '../utils/socialSharing';
import toast from 'react-hot-toast';

interface ReferralStats {
  totalReferrals: number;
  successfulJoins: number;
  rewardsEarned: number;
  currentStreak: number;
}

interface ReferralReward {
  id: string;
  name: string;
  description: string;
  threshold: number;
  earned: boolean;
  icon: string;
}

interface ReferralTrackerProps {
  gameId: string;
  gameName: string;
  referrerId: string;
  referrerName: string;
  stats?: ReferralStats;
  rewards?: ReferralReward[];
  onReferralShare?: (platform: string) => void;
  className?: string;
}

const ReferralTracker: React.FC<ReferralTrackerProps> = ({
  gameId,
  gameName,
  referrerId,
  referrerName,
  stats = {
    totalReferrals: 0,
    successfulJoins: 0,
    rewardsEarned: 0,
    currentStreak: 0,
  },
  rewards = [
    {
      id: 'first_referral',
      name: 'First Invite',
      description: 'Invite your first friend',
      threshold: 1,
      earned: stats.totalReferrals >= 1,
      icon: '🎯',
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Invite 5 friends to games',
      threshold: 5,
      earned: stats.totalReferrals >= 5,
      icon: '🦋',
    },
    {
      id: 'party_starter',
      name: 'Party Starter',
      description: 'Get 10 friends to join',
      threshold: 10,
      earned: stats.successfulJoins >= 10,
      icon: '🎉',
    },
    {
      id: 'golf_ambassador',
      name: 'Golf Ambassador',
      description: 'Maintain a 5-game referral streak',
      threshold: 5,
      earned: stats.currentStreak >= 5,
      icon: '👑',
    },
  ],
  onReferralShare,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  const referralUrl = SocialSharingManager.generateReferralLink(gameId, referrerId);

  const handleShare = async (platform: string) => {
    try {
      const result = await SocialSharingManager.shareReferral(
        gameId,
        gameName,
        referrerName,
        referrerId,
        { platform: platform as any }
      );

      if (result.success) {
        setShareCount(prev => prev + 1);
        onReferralShare?.(platform);
        
        if (platform === 'copy') {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        
        toast.success(`Referral shared via ${SocialSharingManager.getPlatformInfo(platform).name}!`);
      }
    } catch (error) {
      console.error('Referral share failed:', error);
      toast.error('Failed to share referral');
    }
  };

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const getProgressPercentage = (current: number, threshold: number) => {
    return Math.min((current / threshold) * 100, 100);
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Invite Friends</h2>
          </div>
          <p className="text-gray-600">
            Share "{gameName}" and earn rewards when friends join!
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.totalReferrals}
          </div>
          <div className="text-sm text-gray-600">Total Invites</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.successfulJoins}
          </div>
          <div className="text-sm text-gray-600">Friends Joined</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.rewardsEarned}
          </div>
          <div className="text-sm text-gray-600">Rewards Earned</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.currentStreak}
          </div>
          <div className="text-sm text-gray-600">Current Streak</div>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Share2 className="w-5 h-5 text-green-600" />
          <span>Your Referral Link</span>
        </h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-mono text-gray-700 break-all">
              {referralUrl}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopyReferralLink}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
            
            <Button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </Button>
            
            <Button
              onClick={() => handleShare('sms')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>📱</span>
              <span>SMS</span>
            </Button>
            
            <Button
              onClick={() => handleShare('email')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>📧</span>
              <span>Email</span>
            </Button>
          </div>
          
          {shareCount > 0 && (
            <div className="text-sm text-green-600 flex items-center space-x-1">
              <Share2 className="w-4 h-4" />
              <span>Shared {shareCount} times</span>
            </div>
          )}
        </div>
      </Card>

      {/* Rewards */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span>Referral Rewards</span>
        </h3>
        
        <div className="space-y-4">
          {rewards.map((reward) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border-2 transition-colors ${
                reward.earned
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{reward.icon}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {reward.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {reward.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {reward.earned ? (
                    <Badge className="bg-green-100 text-green-800">
                      <Gift className="w-3 h-3 mr-1" />
                      Earned!
                    </Badge>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {reward.threshold} needed
                    </div>
                  )}
                </div>
              </div>
              
              {!reward.earned && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {Math.min(
                        reward.id === 'first_referral' || reward.id === 'social_butterfly' 
                          ? stats.totalReferrals 
                          : reward.id === 'party_starter' 
                          ? stats.successfulJoins 
                          : stats.currentStreak,
                        reward.threshold
                      )} / {reward.threshold}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(
                          reward.id === 'first_referral' || reward.id === 'social_butterfly' 
                            ? stats.totalReferrals 
                            : reward.id === 'party_starter' 
                            ? stats.successfulJoins 
                            : stats.currentStreak,
                          reward.threshold
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          💡 Referral Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Share your link before the game starts for maximum impact</li>
          <li>• Personal messages work better than generic invites</li>
          <li>• Mention specific friends who love golf in your invites</li>
          <li>• Follow up with friends who haven't joined yet</li>
          <li>• Share highlights from previous games to show the fun</li>
        </ul>
      </Card>
    </div>
  );
};

export default ReferralTracker;