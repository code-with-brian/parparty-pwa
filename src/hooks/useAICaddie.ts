import { useState, useEffect, useCallback } from 'react';
import { aiCaddieService } from '@/utils/aiCaddieService';
import type { CourseConditions, PlayerStats, HoleInfo, AIRecommendation } from '@/types/aiCaddie';
import { logger } from '@/utils/logger';

interface UseAICaddieReturn {
  recommendation: AIRecommendation | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  getRecommendation: (holeInfo: HoleInfo, conditions: CourseConditions, playerStats: PlayerStats) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook to manage AI Caddie recommendations
 */
export const useAICaddie = (): UseAICaddieReturn => {
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getRecommendation = useCallback(async (
    holeInfo: HoleInfo,
    conditions: CourseConditions,
    playerStats: PlayerStats
  ) => {
    setLoading(true);
    setError(null);

    try {
      logger.info('Requesting AI caddie recommendation', {
        component: 'useAICaddie',
        hole: holeInfo.number,
        distance: holeInfo.distanceToPin,
      });

      const result = await aiCaddieService.getRecommendation(holeInfo, conditions, playerStats);
      
      setRecommendation(result);
      setLastUpdated(new Date());

      logger.info('AI caddie recommendation received', {
        component: 'useAICaddie',
        hole: holeInfo.number,
        club: result.club,
        confidence: result.confidence,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI recommendation';
      setError(errorMessage);
      
      logger.error('Failed to get AI caddie recommendation in hook', err as Error, {
        component: 'useAICaddie',
        hole: holeInfo.number,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recommendation,
    loading,
    error,
    lastUpdated,
    getRecommendation,
    clearError,
  };
};

/**
 * Hook for automatic AI caddie recommendations with dependency tracking
 */
export const useAutoAICaddie = (
  holeInfo: HoleInfo | null,
  conditions: CourseConditions | null,
  playerStats: PlayerStats | null,
  enabled: boolean = true
): UseAICaddieReturn => {
  const {
    recommendation,
    loading,
    error,
    lastUpdated,
    getRecommendation,
    clearError,
  } = useAICaddie();

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (enabled && holeInfo && conditions && playerStats) {
      getRecommendation(holeInfo, conditions, playerStats);
    }
  }, [
    enabled,
    holeInfo?.number,
    holeInfo?.distanceToPin,
    holeInfo?.pinDifficulty,
    conditions?.windSpeed,
    conditions?.windDirection,
    conditions?.temperature,
    playerStats?.averageDriver,
    getRecommendation,
  ]);

  return {
    recommendation,
    loading,
    error,
    lastUpdated,
    getRecommendation,
    clearError,
  };
};

export default useAICaddie;