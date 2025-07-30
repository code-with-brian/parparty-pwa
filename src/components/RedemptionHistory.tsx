import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Import Id type - will be available at runtime
type Id<_T> = string;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Gift, ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface RedemptionHistoryProps {
  playerId: Id<"players">;
}

interface RedemptionWithDetails {
  _id: Id<"rewardRedemptions">;
  rewardId: Id<"sponsorRewards">;
  playerId: Id<"players">;
  gameId: Id<"games">;
  redemptionCode: string;
  redeemedAt: number;
  status: "pending" | "confirmed" | "used";
  reward: {
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
  };
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

const RedemptionHistory: React.FC<RedemptionHistoryProps> = ({ playerId }) => {
  const redemptions = useQuery(api.sponsors.getPlayerRedemptions, {
    playerId,
  }) as RedemptionWithDetails[] | undefined;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'used':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatRewardValue = (reward: RedemptionWithDetails['reward']) => {
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

  const isExpired = (expiresAt?: number) => {
    return expiresAt && expiresAt < Date.now();
  };

  if (!redemptions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading redemption history...</p>
        </div>
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎁</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No Rewards Yet
        </h3>
        <p className="text-gray-600 mb-4">
          You haven't redeemed any rewards yet. Keep playing to earn more!
        </p>
        <p className="text-sm text-gray-500">
          Rewards are earned by completing games and meeting sponsor criteria.
        </p>
      </div>
    );
  }

  // Sort redemptions by date (newest first)
  const sortedRedemptions = [...redemptions].sort((a, b) => b.redeemedAt - a.redeemedAt);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🏆 Your Rewards
        </h2>
        <p className="text-gray-600">
          You've redeemed {redemptions.length} reward{redemptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-4">
        {sortedRedemptions.map((redemption) => (
          <Card 
            key={redemption._id} 
            className={`overflow-hidden ${
              isExpired(redemption.reward.expiresAt) ? 'opacity-75' : ''
            }`}
          >
            <div className="flex">
              {/* Reward Image */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={redemption.reward.imageUrl}
                  alt={redemption.reward.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://via.placeholder.com/96x96?text=${encodeURIComponent(redemption.reward.name)}`;
                  }}
                />
                <div className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm">
                  <img
                    src={redemption.sponsor.logo}
                    alt={redemption.sponsor.name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Reward Details */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      {getRewardTypeIcon(redemption.reward.type)} {redemption.reward.name}
                      {isExpired(redemption.reward.expiresAt) && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">by {redemption.sponsor.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(redemption.status)}>
                      {getStatusIcon(redemption.status)}
                      <span className="ml-1 capitalize">{redemption.status}</span>
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {redemption.reward.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-blue-600">
                      <Gift className="w-4 h-4" />
                      <span className="font-medium">{formatRewardValue(redemption.reward)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {redemption.status === 'confirmed' && (
                    <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      Code: {redemption.redemptionCode}
                    </div>
                  )}
                </div>

                {/* Expiration Warning */}
                {redemption.reward.expiresAt && (
                  <div className={`mt-2 text-xs flex items-center gap-1 ${
                    isExpired(redemption.reward.expiresAt) 
                      ? 'text-red-600' 
                      : new Date(redemption.reward.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                      ? 'text-orange-600'
                      : 'text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {isExpired(redemption.reward.expiresAt) 
                      ? 'Expired' 
                      : `Expires ${new Date(redemption.reward.expiresAt).toLocaleDateString()}`
                    }
                  </div>
                )}

                {/* Sponsor Website Link */}
                {redemption.sponsor.website && redemption.status === 'confirmed' && (
                  <div className="mt-2">
                    <a
                      href={redemption.sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Visit {redemption.sponsor.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Redemption Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {redemptions.length}
              </div>
              <div className="text-sm text-gray-600">Total Rewards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {redemptions.filter(r => r.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600">Ready to Use</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {redemptions.filter(r => r.status === 'used').length}
              </div>
              <div className="text-sm text-gray-600">Used</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {redemptions.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RedemptionHistory;