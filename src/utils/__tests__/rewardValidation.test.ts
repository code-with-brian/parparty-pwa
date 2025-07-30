import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateRewardAvailability,
  validateRewardConditions,
  isRewardExpiringSoon,
  getTimeUntilExpiration,
  getRewardAvailabilityPercentage,
  generateRedemptionCode,
  formatRewardValue,
  getRewardTypeIcon,
  type SponsorReward,
  type GameData,
  type PlayerScore,
} from '../rewardValidation';

// Mock Id type for testing
type Id<T> = string;

describe('rewardValidation', () => {
  let mockReward: SponsorReward;
  let mockGameData: GameData;
  let mockPlayerScores: PlayerScore[];

  beforeEach(() => {
    mockReward = {
      _id: 'reward123' as Id<"sponsorRewards">,
      sponsorId: 'sponsor123' as Id<"sponsors">,
      name: 'Test Reward',
      description: 'A test reward',
      type: 'discount',
      value: 20,
      imageUrl: 'https://example.com/image.jpg',
      maxRedemptions: 100,
      currentRedemptions: 10,
      isActive: true,
      createdAt: Date.now(),
    };

    mockGameData = {
      _id: 'game123' as Id<"games">,
      name: 'Test Game',
      createdBy: 'user123' as Id<"users">,
      startedAt: Date.now() - 3600000, // 1 hour ago
      endedAt: Date.now() - 1800000, // 30 minutes ago
      status: 'finished',
      format: 'stroke',
    };

    mockPlayerScores = [
      {
        _id: 'score1' as Id<"scores">,
        playerId: 'player123' as Id<"players">,
        gameId: 'game123' as Id<"games">,
        holeNumber: 1,
        strokes: 4,
        timestamp: Date.now(),
      },
      {
        _id: 'score2' as Id<"scores">,
        playerId: 'player123' as Id<"players">,
        gameId: 'game123' as Id<"games">,
        holeNumber: 2,
        strokes: 5,
        timestamp: Date.now(),
      },
    ];
  });

  describe('validateRewardAvailability', () => {
    it('should return valid for a properly configured reward', () => {
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return invalid for inactive reward', () => {
      mockReward.isActive = false;
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Reward is not active');
    });

    it('should return invalid for expired reward', () => {
      mockReward.expiresAt = Date.now() - 1000; // 1 second ago
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Reward has expired');
    });

    it('should return invalid when redemption limit reached', () => {
      mockReward.maxRedemptions = 10;
      mockReward.currentRedemptions = 10;
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Reward redemption limit reached');
    });

    it('should return invalid when player already redeemed', () => {
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores, 1);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Already redeemed by player');
    });

    it('should return invalid for unfinished game', () => {
      mockGameData.status = 'active';
      const result = validateRewardAvailability(mockReward, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Game must be completed');
    });
  });

  describe('validateRewardConditions', () => {
    it('should return valid when no conditions are set', () => {
      const result = validateRewardConditions({}, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(true);
    });

    it('should validate minimum score requirement', () => {
      const conditions = { minScore: 10 };
      const result = validateRewardConditions(conditions, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Score too low');
    });

    it('should validate maximum score requirement', () => {
      const conditions = { maxScore: 5 };
      const result = validateRewardConditions(conditions, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Score too high');
    });

    it('should validate required holes', () => {
      const conditions = { requiredHoles: 5 };
      const result = validateRewardConditions(conditions, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Not enough holes played');
    });

    it('should validate game format', () => {
      const conditions = { gameFormat: 'match' };
      const result = validateRewardConditions(conditions, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Wrong game format');
    });

    it('should pass all conditions when requirements are met', () => {
      const conditions = {
        minScore: 5,
        maxScore: 15,
        requiredHoles: 2,
        gameFormat: 'stroke',
      };
      const result = validateRewardConditions(conditions, mockGameData, mockPlayerScores);
      expect(result.isValid).toBe(true);
    });
  });

  describe('isRewardExpiringSoon', () => {
    it('should return false for reward without expiration', () => {
      const result = isRewardExpiringSoon(mockReward);
      expect(result).toBe(false);
    });

    it('should return true for reward expiring within 7 days', () => {
      mockReward.expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 days from now
      const result = isRewardExpiringSoon(mockReward);
      expect(result).toBe(true);
    });

    it('should return false for reward expiring after 7 days', () => {
      mockReward.expiresAt = Date.now() + (10 * 24 * 60 * 60 * 1000); // 10 days from now
      const result = isRewardExpiringSoon(mockReward);
      expect(result).toBe(false);
    });

    it('should return false for already expired reward', () => {
      mockReward.expiresAt = Date.now() - 1000; // 1 second ago
      const result = isRewardExpiringSoon(mockReward);
      expect(result).toBe(false);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return null for reward without expiration', () => {
      const result = getTimeUntilExpiration(mockReward);
      expect(result).toBeNull();
    });

    it('should return "Expired" for expired reward', () => {
      mockReward.expiresAt = Date.now() - 1000;
      const result = getTimeUntilExpiration(mockReward);
      expect(result).toBe('Expired');
    });

    it('should return days for reward expiring in days', () => {
      mockReward.expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000);
      const result = getTimeUntilExpiration(mockReward);
      expect(result).toBe('3 days left');
    });

    it('should return hours for reward expiring in hours', () => {
      mockReward.expiresAt = Date.now() + (5 * 60 * 60 * 1000);
      const result = getTimeUntilExpiration(mockReward);
      expect(result).toBe('5 hours left');
    });

    it('should return minutes for reward expiring in minutes', () => {
      mockReward.expiresAt = Date.now() + (30 * 60 * 1000);
      const result = getTimeUntilExpiration(mockReward);
      expect(result).toBe('30 minutes left');
    });
  });

  describe('getRewardAvailabilityPercentage', () => {
    it('should return 100% for reward without max redemptions', () => {
      delete mockReward.maxRedemptions;
      const result = getRewardAvailabilityPercentage(mockReward);
      expect(result).toBe(100);
    });

    it('should calculate correct percentage', () => {
      mockReward.maxRedemptions = 100;
      mockReward.currentRedemptions = 25;
      const result = getRewardAvailabilityPercentage(mockReward);
      expect(result).toBe(75);
    });

    it('should return 0% when fully redeemed', () => {
      mockReward.maxRedemptions = 50;
      mockReward.currentRedemptions = 50;
      const result = getRewardAvailabilityPercentage(mockReward);
      expect(result).toBe(0);
    });
  });

  describe('generateRedemptionCode', () => {
    it('should generate a properly formatted redemption code', () => {
      const sponsorId = 'sponsor123456' as Id<"sponsors">;
      const playerId = 'player789012' as Id<"players">;
      const timestamp = 1640995200000; // Fixed timestamp for testing
      
      const result = generateRedemptionCode(sponsorId, playerId, timestamp);
      
      expect(result).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]+$/);
      expect(result.startsWith('3456-9012-')).toBe(true);
    });
  });

  describe('formatRewardValue', () => {
    it('should format discount rewards', () => {
      mockReward.type = 'discount';
      mockReward.value = 25;
      const result = formatRewardValue(mockReward);
      expect(result).toBe('25% off');
    });

    it('should format credit rewards', () => {
      mockReward.type = 'credit';
      mockReward.value = 50;
      const result = formatRewardValue(mockReward);
      expect(result).toBe('$50 credit');
    });

    it('should format product rewards', () => {
      mockReward.type = 'product';
      mockReward.value = 100;
      const result = formatRewardValue(mockReward);
      expect(result).toBe('$100 value');
    });

    it('should format experience rewards', () => {
      mockReward.type = 'experience';
      const result = formatRewardValue(mockReward);
      expect(result).toBe('Experience');
    });
  });

  describe('getRewardTypeIcon', () => {
    it('should return correct icons for each reward type', () => {
      expect(getRewardTypeIcon('discount')).toBe('🏷️');
      expect(getRewardTypeIcon('product')).toBe('🎁');
      expect(getRewardTypeIcon('experience')).toBe('🎯');
      expect(getRewardTypeIcon('credit')).toBe('💳');
      expect(getRewardTypeIcon('unknown')).toBe('🏆');
    });
  });
});