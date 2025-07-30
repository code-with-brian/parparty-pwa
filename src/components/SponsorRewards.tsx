import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Import Id type - will be available at runtime
type Id<_T> = string;
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface SponsorRewardsProps {
  gameId: Id<"games">;
  playerId: Id<"players">;
  onRewardRedeemed?: (redemption: any) => void;
}

interface RewardWithSponsor {
  _id: Id<"sponsorRewards">;
  sponsorId: Id<"sponsors">;
  name: string;
  description: string;
  type: "discount" | "product" | "experience" | "credit";
  value: number;
  imageUrl: string;
  redemptionCode?: string;
  expiresAt?: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  isActive: boolean;
  conditions?: {
    minScore?: number;
    maxScore?: number;
    requiredHoles?: number;
    gameFormat?: string;
  };
  createdAt: number;
  sponsor: {
    _id: Id<"sponsors">;
    name: string;
    logo: string;
    description?: string;
    website?: string;
    contactEmail?: string;
    rewardBudget: number;
    isActive: boolean;
    createdAt: number;
  };
}

export const SponsorRewards: React.FC<SponsorRewardsProps> = ({
  gameId,
  playerId,
  onRewardRedeemed,
}) => {
  const [redeeming, setRedeeming] = useState<Id<"sponsorRewards"> | null>(null);
  
  const availableRewards = useQuery(api.sponsors.getAvailableRewards, {
    gameId,
    playerId,
  }) as RewardWithSponsor[] | undefined;
  
  const redeemReward = useMutation(api.sponsors.redeemReward);

  const handleRedeemReward = async (rewardId: Id<"sponsorRewards">) => {
    try {
      setRedeeming(rewardId);
      const redemption = await redeemReward({
        rewardId,
        playerId,
        gameId,
      });
      
      if (onRewardRedeemed) {
        onRewardRedeemed(redemption);
      }
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      alert('Failed to redeem reward. Please try again.');
    } finally {
      setRedeeming(null);
    }
  };

  const formatRewardValue = (reward: RewardWithSponsor) => {
    switch (reward.type) {
      case 'discount':
        return `${reward.value}% off`;
      case 'credit':
        return `$${reward.value} credit`;
      case 'product':
        return `$${reward.value} value`;
      case 'experience':
        return 'Experience';
      default:
        return `$${reward.value}`;
    }
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return '🏷️';
      case 'product':
        return '🎁';
      case 'experience':
        return '🎯';
      case 'credit':
        return '💳';
      default:
        return '🏆';
    }
  };

  if (!availableRewards) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rewards...</p>
        </div>
      </div>
    );
  }

  if (availableRewards.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Great Round!
        </h3>
        <p className="text-gray-600 mb-4">
          No rewards available right now, but keep playing for future opportunities!
        </p>
        <p className="text-sm text-gray-500">
          Rewards are based on game completion, score, and sponsor availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎉 Pick Your Prize!
        </h2>
        <p className="text-gray-600">
          You've earned {availableRewards.length} reward{availableRewards.length !== 1 ? 's' : ''} from our sponsors
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableRewards.map((reward) => (
          <Card key={reward._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://via.placeholder.com/300x200?text=${encodeURIComponent(reward.name)}`;
                }}
              />
              <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md">
                <img
                  src={reward.sponsor.logo}
                  alt={reward.sponsor.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-medium">
                {getRewardTypeIcon(reward.type)} {formatRewardValue(reward)}
              </div>
            </div>
            
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{reward.name}</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                by {reward.sponsor.name}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                {reward.description}
              </p>
              
              {reward.expiresAt && (
                <p className="text-xs text-orange-600 mb-3">
                  Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                </p>
              )}
              
              {reward.maxRedemptions && (
                <p className="text-xs text-gray-500 mb-3">
                  {reward.maxRedemptions - reward.currentRedemptions} remaining
                </p>
              )}
              
              <Button
                onClick={() => handleRedeemReward(reward._id)}
                disabled={redeeming === reward._id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {redeeming === reward._id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redeeming...
                  </div>
                ) : (
                  'Claim Reward'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SponsorRewards;