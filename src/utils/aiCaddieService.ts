import { logger } from './logger';
import type { CourseConditions, PlayerStats, HoleInfo, AIRecommendation } from '@/types/aiCaddie';

// Re-export types for convenience
export type { CourseConditions, PlayerStats, HoleInfo, AIRecommendation } from '@/types/aiCaddie';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AICaddieService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private cache = new Map<string, { data: AIRecommendation; expiry: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache for recommendations

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get AI-powered caddie recommendation
   */
  async getRecommendation(
    holeInfo: HoleInfo,
    conditions: CourseConditions,
    playerStats: PlayerStats
  ): Promise<AIRecommendation> {
    const cacheKey = this.generateCacheKey(holeInfo, conditions, playerStats);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      logger.debug('Returning cached AI caddie recommendation', {
        service: 'AICaddieService',
        hole: holeInfo.number,
        cacheHit: true,
      });
      return cached.data;
    }

    try {
      logger.info('Getting AI caddie recommendation', {
        service: 'AICaddieService',
        hole: holeInfo.number,
        distance: holeInfo.distanceToPin,
        conditions: `${conditions.windSpeed}mph ${conditions.windDirection}`,
      });

      const prompt = this.buildPrompt(holeInfo, conditions, playerStats);
      const response = await this.callOpenAI(prompt);
      const recommendation = this.parseResponse(response);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: recommendation,
        expiry: Date.now() + this.cacheTimeout,
      });

      logger.info('AI caddie recommendation generated successfully', {
        service: 'AICaddieService',
        hole: holeInfo.number,
        recommendedClub: recommendation.club,
        confidence: recommendation.confidence,
      });

      return recommendation;
    } catch (error) {
      logger.error('Failed to get AI caddie recommendation', error as Error, {
        service: 'AICaddieService',
        hole: holeInfo.number,
      });

      // Fallback to rule-based recommendation
      return this.getFallbackRecommendation(holeInfo, conditions, playerStats);
    }
  }

  /**
   * Build the prompt for OpenAI
   */
  private buildPrompt(holeInfo: HoleInfo, conditions: CourseConditions, playerStats: PlayerStats): string {
    const hazardText = holeInfo.hazards.length > 0 
      ? holeInfo.hazards.map(h => `${h.type} at ${h.distance}y (carry ${h.carry}y)`).join(', ')
      : 'No significant hazards';

    return `You are a professional golf caddie with 20+ years of experience. Provide a club recommendation and strategy for this shot.

HOLE INFORMATION:
- Hole ${holeInfo.number}, Par ${holeInfo.par}
- Distance to pin: ${holeInfo.distanceToPin} yards
- Pin difficulty: ${holeInfo.pinDifficulty}
- Hazards: ${hazardText}

CONDITIONS:
- Wind: ${conditions.windSpeed}mph ${conditions.windDirection}
- Temperature: ${conditions.temperature}°F
- Humidity: ${conditions.humidity}%
- Green speed: ${conditions.greenSpeed}
- Green firmness: ${conditions.firmness}

PLAYER STATS:
- Driver average: ${playerStats.averageDriver} yards
- 7-iron average: ${playerStats.average7Iron} yards
- Wedge average: ${playerStats.averageWedge} yards
- Recent scores: ${playerStats.recentRounds.join(', ')}
- Strengths: ${playerStats.strengths.join(', ')}
- Areas for improvement: ${playerStats.improvements.join(', ')}

Please respond with ONLY a valid JSON object in this exact format:
{
  "club": "Primary club recommendation",
  "confidence": 85,
  "strategy": "Brief strategy (e.g., 'Attack pin', 'Play safe to center')",
  "reasoning": "Detailed explanation of why this is the best choice considering all factors",
  "alternativeClubs": ["Club 1", "Club 2", "Club 3"],
  "riskLevel": "low",
  "yardageAdjustment": 5,
  "keyConsiderations": ["Wind will push ball right", "Pin is tucked behind bunker", "Green slopes back to front"]
}

Consider:
1. Wind effect on ball flight and distance
2. Temperature impact on ball carry
3. Pin position difficulty and approach angle
4. Player's strengths and recent performance
5. Hazard avoidance and risk management
6. Green conditions for ball behavior on landing
7. Best miss areas if shot isn't perfect

Confidence should be 60-95 based on conditions difficulty.
Risk level: "low" (safe shot), "medium" (calculated risk), "high" (aggressive/difficult)
Yardage adjustment: account for wind/temperature effects (+/- yards from normal)`;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use the fast, cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a professional golf caddie. Always respond with valid JSON only, no additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent recommendations
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse OpenAI response
   */
  private parseResponse(responseText: string): AIRecommendation {
    try {
      // Clean up the response text - remove any markdown formatting
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!parsed.club || !parsed.strategy || !parsed.reasoning) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        club: parsed.club,
        confidence: Math.max(60, Math.min(95, parsed.confidence || 75)),
        strategy: parsed.strategy,
        reasoning: parsed.reasoning,
        alternativeClubs: Array.isArray(parsed.alternativeClubs) ? parsed.alternativeClubs : [],
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
        yardageAdjustment: parsed.yardageAdjustment || 0,
        keyConsiderations: Array.isArray(parsed.keyConsiderations) ? parsed.keyConsiderations : [],
      };
    } catch (error) {
      logger.error('Failed to parse AI caddie response', error as Error, {
        service: 'AICaddieService',
        responseText: responseText.substring(0, 200),
      });
      throw error;
    }
  }

  /**
   * Fallback rule-based recommendation when AI fails
   */
  private getFallbackRecommendation(
    holeInfo: HoleInfo,
    conditions: CourseConditions,
    playerStats: PlayerStats
  ): AIRecommendation {
    logger.warn('Using fallback rule-based caddie recommendation', {
      service: 'AICaddieService',
      hole: holeInfo.number,
    });

    const windAdjustment = conditions.windSpeed * (
      ['N', 'NE', 'NW'].includes(conditions.windDirection) ? 1.1 : 
      ['S', 'SE', 'SW'].includes(conditions.windDirection) ? 0.9 : 1.0
    );
    
    const effectiveDistance = Math.round(holeInfo.distanceToPin * windAdjustment);
    const tempAdjustment = conditions.temperature < 50 ? 1.05 : conditions.temperature > 80 ? 0.95 : 1.0;
    const finalDistance = Math.round(effectiveDistance * tempAdjustment);

    let club: string;
    let confidence: number;
    let strategy: string;
    let reasoning: string;
    let alternativeClubs: string[];
    let riskLevel: 'low' | 'medium' | 'high';

    if (finalDistance <= 100) {
      club = 'Sand Wedge';
      confidence = 85;
      strategy = 'Attack pin';
      reasoning = `${finalDistance} yards is ideal wedge distance with good control.`;
      alternativeClubs = ['Lob Wedge', 'Gap Wedge'];
      riskLevel = 'low';
    } else if (finalDistance <= 150) {
      club = '9 Iron';
      confidence = 80;
      strategy = 'Smooth tempo';
      reasoning = `9 iron allows for controlled approach to the pin.`;
      alternativeClubs = ['Pitching Wedge', '8 Iron'];
      riskLevel = 'medium';
    } else if (finalDistance <= 170) {
      club = '7 Iron';
      confidence = 75;
      strategy = 'Center green';
      reasoning = `7 iron gives best distance control for this yardage.`;
      alternativeClubs = ['8 Iron', '6 Iron'];
      riskLevel = 'medium';
    } else {
      club = '6 Iron';
      confidence = 70;
      strategy = 'Get it on green';
      reasoning = `Longer approach requires conservative target.`;
      alternativeClubs = ['7 Iron', '5 Iron'];
      riskLevel = 'high';
    }

    return {
      club,
      confidence,
      strategy,
      reasoning,
      alternativeClubs,
      riskLevel,
      yardageAdjustment: Math.round(finalDistance - holeInfo.distanceToPin),
      keyConsiderations: [`${conditions.windSpeed}mph ${conditions.windDirection} wind`],
    };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(holeInfo: HoleInfo, conditions: CourseConditions, playerStats: PlayerStats): string {
    return `${holeInfo.number}-${holeInfo.distanceToPin}-${conditions.windSpeed}-${conditions.windDirection}-${conditions.temperature}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('AI caddie cache cleared', {
      service: 'AICaddieService',
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create and export a default AI caddie service instance
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!openaiApiKey) {
  logger.warn('OpenAI API key not found in environment variables', {
    service: 'AICaddieService',
    envVar: 'OPENAI_API_KEY',
  });
}

export const aiCaddieService = new AICaddieService(openaiApiKey || '');

// Hook for using AI caddie in React components
export const useAICaddie = () => {
  return {
    getRecommendation: aiCaddieService.getRecommendation.bind(aiCaddieService),
    clearCache: aiCaddieService.clearCache.bind(aiCaddieService),
    getCacheStats: aiCaddieService.getCacheStats.bind(aiCaddieService),
  };
};

export default aiCaddieService;