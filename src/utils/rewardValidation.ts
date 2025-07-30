// Import Id type - will be available at runtime
type Id<_T> = string;

export interface RewardConditions {
  minScore?: number;
  maxScore?: number;
  requiredHoles?: number;
  gameFormat?: string;
}

export interface GameData {
  _id: Id<"games">;
  name: string;
  createdBy: Id<"users">;
  courseId?: Id<"courses">;
  startedAt: number;
  endedAt?: number;
  status: "waiting" | "active" | "finished";
  format: "stroke" | "match" | "scramble" | "best_ball";
  metadata?: {
    weather?: string;
    courseConditions?: string;
    eventType?: string;
  };
}

export interface PlayerScore {
  _id: Id<"scores">;
  playerId: Id<"players">;
  gameId: Id<"games">;
  holeNumber: number;
  strokes: number;
  putts?: number;
  timestamp: number;
  gpsLocation?: { lat: number; lng: number };
}

export interface SponsorReward {
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
  conditions?: RewardConditions;
  createdAt: number;
}

/**
 * Validates if a reward is available for redemption
 */
export const validateRewardAvailability = (
  reward: SponsorReward,
  gameData: GameData,
  playerScores: PlayerScore[],
  existingRedemptions: number = 0
): {
  isValid: boolean;
  reason?: string;
} => {
  // Check if reward is active
  if (!reward.isActive) {
    return { isValid: false, reason: 'Reward is not active' };
  }

  // Check expiration
  const now = Date.now();
  if (reward.expiresAt && reward.expiresAt < now) {
    return { isValid: false, reason: 'Reward has expired' };
  }

  // Check max redemptions
  if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
    return { isValid: false, reason: 'Reward redemption limit reached' };
  }

  // Check if player already redeemed
  if (existingRedemptions > 0) {
    return { isValid: false, reason: 'Already redeemed by player' };
  }

  // Check game completion
  if (gameData.status !== 'finished') {
    return { isValid: false, reason: 'Game must be completed' };
  }

  // Check conditions if they exist
  if (reward.conditions) {
    const validationResult = validateRewardConditions(
      reward.conditions,
      gameData,
      playerScores
    );
    if (!validationResult.isValid) {
      return validationResult;
    }
  }

  return { isValid: true };
};

/**
 * Validates reward conditions against game and player data
 */
export const validateRewardConditions = (
  conditions: RewardConditions,
  gameData: GameData,
  playerScores: PlayerScore[]
): {
  isValid: boolean;
  reason?: string;
} => {
  const totalScore = playerScores.reduce((sum, score) => sum + score.strokes, 0);
  const holesPlayed = playerScores.length;

  // Check minimum score requirement
  if (conditions.minScore && totalScore < conditions.minScore) {
    return {
      isValid: false,
      reason: `Score too low (${totalScore} < ${conditions.minScore})`
    };
  }

  // Check maximum score requirement
  if (conditions.maxScore && totalScore > conditions.maxScore) {
    return {
      isValid: false,
      reason: `Score too high (${totalScore} > ${conditions.maxScore})`
    };
  }

  // Check required holes
  if (conditions.requiredHoles && holesPlayed < conditions.requiredHoles) {
    return {
      isValid: false,
      reason: `Not enough holes played (${holesPlayed} < ${conditions.requiredHoles})`
    };
  }

  // Check game format
  if (conditions.gameFormat && gameData.format !== conditions.gameFormat) {
    return {
      isValid: false,
      reason: `Wrong game format (${gameData.format} != ${conditions.gameFormat})`
    };
  }

  return { isValid: true };
};

/**
 * Checks if a reward is expiring soon (within 7 days)
 */
export const isRewardExpiringSoon = (reward: SponsorReward): boolean => {
  if (!reward.expiresAt) return false;
  
  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
  
  return reward.expiresAt <= sevenDaysFromNow && reward.expiresAt > now;
};

/**
 * Gets the time remaining until reward expires
 */
export const getTimeUntilExpiration = (reward: SponsorReward): string | null => {
  if (!reward.expiresAt) return null;
  
  const now = Date.now();
  const timeLeft = reward.expiresAt - now;
  
  if (timeLeft <= 0) return 'Expired';
  
  const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
  const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  } else {
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
  }
};

/**
 * Calculates reward availability percentage
 */
export const getRewardAvailabilityPercentage = (reward: SponsorReward): number => {
  if (!reward.maxRedemptions) return 100;
  
  const remaining = reward.maxRedemptions - reward.currentRedemptions;
  return Math.max(0, (remaining / reward.maxRedemptions) * 100);
};

/**
 * Generates a unique redemption code
 */
export const generateRedemptionCode = (
  sponsorId: Id<"sponsors">,
  playerId: Id<"players">,
  timestamp: number = Date.now()
): string => {
  const sponsorCode = sponsorId.slice(-4).toUpperCase();
  const playerCode = playerId.slice(-4).toUpperCase();
  const timeCode = timestamp.toString(36).toUpperCase();
  
  return `${sponsorCode}-${playerCode}-${timeCode}`;
};

/**
 * Formats reward value for display
 */
export const formatRewardValue = (reward: SponsorReward): string => {
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

/**
 * Gets appropriate icon for reward type
 */
export const getRewardTypeIcon = (type: string): string => {
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