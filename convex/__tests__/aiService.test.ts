import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../_generated/api';
import schema from '../schema';

describe('AI Service', () => {
  describe('generateAICaptions', () => {
    it('should generate captions for photos without existing captions', async () => {
      const t = convexTest(schema);

      const photos = [
        {
          url: 'https://example.com/photo1.jpg',
          holeNumber: 3,
          timestamp: Date.now(),
        },
        {
          url: 'https://example.com/photo2.jpg',
          caption: 'Existing caption',
          holeNumber: 7,
          timestamp: Date.now(),
        },
      ];

      const context = {
        playerName: 'John Doe',
        gameName: 'Test Golf Game',
        holesPlayed: 9,
      };

      const result = await t.action(api.aiService.generateAICaptions, {
        photos,
        context,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('John Doe');
      expect(result[0]).toContain('hole 3');
      expect(result[1]).toBe('Existing caption'); // Should preserve existing caption
    });

    it('should generate varied captions for multiple photos', async () => {
      const t = convexTest(schema);

      const photos = Array.from({ length: 6 }, (_, i) => ({
        url: `https://example.com/photo${i + 1}.jpg`,
        holeNumber: i + 1,
        timestamp: Date.now() + i * 1000,
      }));

      const context = {
        playerName: 'Jane Smith',
        gameName: 'Championship Round',
        holesPlayed: 18,
      };

      const result = await t.action(api.aiService.generateAICaptions, {
        photos,
        context,
      });

      expect(result).toHaveLength(6);
      
      // Should have variety in captions (not all the same)
      const uniqueCaptions = new Set(result);
      expect(uniqueCaptions.size).toBeGreaterThan(1);
      
      // All captions should contain player name or game name
      result.forEach((caption: string) => {
        expect(
          caption.includes('Jane Smith') || 
          caption.includes('Championship Round') ||
          caption.includes('hole')
        ).toBe(true);
      });
    });
  });

  describe('generateAINarrative', () => {
    it('should generate positive narrative for good performance', async () => {
      const t = convexTest(schema);

      const context = {
        playerName: 'John Doe',
        gameName: 'Test Golf Game',
        totalStrokes: 36,
        holesPlayed: 9,
        bestScore: 2, // Eagle
        worstScore: 5,
        photoCount: 3,
        orderCount: 1,
        achievementCount: 2,
        keyMoments: [
          {
            type: 'best_shot',
            description: 'Amazing eagle on hole 3!',
            holeNumber: 3,
          },
        ],
      };

      const result = await t.action(api.aiService.generateAINarrative, {
        context,
      });

      expect(result).toContain('John Doe');
      expect(result).toContain('Test Golf Game');
      expect(result).toContain('spectacular'); // Should be positive for good performance
      expect(result).toContain('eagle'); // Should mention the eagle
      expect(result).toContain('9 holes');
    });

    it('should generate encouraging narrative for challenging performance', async () => {
      const t = convexTest(schema);

      const context = {
        playerName: 'Jane Smith',
        gameName: 'Tough Course',
        totalStrokes: 72,
        holesPlayed: 9,
        bestScore: 5,
        worstScore: 10,
        photoCount: 2,
        orderCount: 2,
        achievementCount: 0,
        keyMoments: [
          {
            type: 'worst_shot',
            description: 'Challenging hole 8',
            holeNumber: 8,
          },
        ],
      };

      const result = await t.action(api.aiService.generateAINarrative, {
        context,
      });

      expect(result).toContain('Jane Smith');
      expect(result).toContain('Tough Course');
      expect(result).toContain('learning'); // Should be encouraging
      expect(result).not.toContain('spectacular'); // Should not be overly positive
    });

    it('should include F&B and photo mentions when present', async () => {
      const t = convexTest(schema);

      const context = {
        playerName: 'Bob Wilson',
        gameName: 'Social Round',
        totalStrokes: 45,
        holesPlayed: 9,
        bestScore: 4,
        worstScore: 6,
        photoCount: 5,
        orderCount: 3,
        achievementCount: 1,
        keyMoments: [],
      };

      const result = await t.action(api.aiService.generateAINarrative, {
        context,
      });

      expect(result).toContain('5 great moment'); // Photo count
      expect(result).toContain('3 F&B order'); // Order count
      expect(result).toContain('1 special achievement'); // Achievement count
    });
  });

  describe('detectHighlightMoments', () => {
    it('should detect best shot moments', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [
          { holeNumber: 1, strokes: 4, timestamp: Date.now() },
          { holeNumber: 2, strokes: 2, timestamp: Date.now() + 1000 }, // Eagle
          { holeNumber: 3, strokes: 5, timestamp: Date.now() + 2000 },
        ],
        photos: [],
        orders: [],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const bestShotMoment = result.find((m: any) => m.type === 'best_shot');
      expect(bestShotMoment).toBeDefined();
      expect(bestShotMoment?.holeNumber).toBe(2);
      expect(bestShotMoment?.description).toContain('eagle');
      expect(bestShotMoment?.description).toContain('🦅');
    });

    it('should detect hole-in-one moments', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [
          { holeNumber: 1, strokes: 1, timestamp: Date.now() }, // Hole-in-one
          { holeNumber: 2, strokes: 4, timestamp: Date.now() + 1000 },
        ],
        photos: [],
        orders: [],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const holeInOneMoment = result.find((m: any) => m.type === 'best_shot');
      expect(holeInOneMoment).toBeDefined();
      expect(holeInOneMoment?.description).toContain('hole-in-one');
      expect(holeInOneMoment?.description).toContain('🎯');
    });

    it('should detect F&B order moments', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [],
        photos: [],
        orders: [
          {
            items: [
              { name: 'Burger', quantity: 1 },
              { name: 'Beer', quantity: 2 },
            ],
            holeNumber: 6,
            timestamp: Date.now(),
          },
          {
            items: [{ name: 'Hot Dog', quantity: 1 }],
            timestamp: Date.now() + 1000,
          },
        ],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const orderMoments = result.filter((m: any) => m.type === 'order');
      expect(orderMoments).toHaveLength(2);
      
      expect(orderMoments[0].description).toContain('Burger, Beer');
      expect(orderMoments[0].description).toContain('hole 6');
      expect(orderMoments[0].description).toContain('🍔🥤');
      
      expect(orderMoments[1].description).toContain('Hot Dog');
      expect(orderMoments[1].description).toContain('clubhouse');
    });

    it('should detect photo moments', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [],
        photos: [
          {
            holeNumber: 3,
            caption: 'Great approach shot!',
            timestamp: Date.now(),
            url: 'https://example.com/photo1.jpg',
          },
          {
            caption: undefined,
            timestamp: Date.now() + 1000,
            url: 'https://example.com/photo2.jpg',
          },
        ],
        orders: [],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const photoMoments = result.filter((m: any) => m.type === 'social_moment');
      expect(photoMoments).toHaveLength(2);
      
      expect(photoMoments[0].description).toBe('Great approach shot!');
      expect(photoMoments[0].holeNumber).toBe(3);
      
      expect(photoMoments[1].description).toContain('Great shot captured');
      expect(photoMoments[1].description).toContain('📸');
    });

    it('should detect achievement moments from social posts', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [],
        photos: [],
        orders: [],
        socialPosts: [
          {
            type: 'achievement',
            content: 'First birdie of the season!',
            timestamp: Date.now(),
          },
          {
            type: 'custom',
            content: 'Just a regular post',
            timestamp: Date.now() + 1000,
          },
        ],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const achievementMoments = result.filter((m: any) => m.type === 'achievement');
      expect(achievementMoments).toHaveLength(1);
      expect(achievementMoments[0].description).toBe('First birdie of the season!');
    });

    it('should detect consistency achievements', async () => {
      const t = convexTest(schema);

      const gameData = {
        scores: [
          { holeNumber: 1, strokes: 4, timestamp: Date.now() },
          { holeNumber: 2, strokes: 4, timestamp: Date.now() + 1000 },
          { holeNumber: 3, strokes: 5, timestamp: Date.now() + 2000 },
          { holeNumber: 4, strokes: 4, timestamp: Date.now() + 3000 },
          { holeNumber: 5, strokes: 4, timestamp: Date.now() + 4000 },
        ],
        photos: [],
        orders: [],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      const consistencyMoment = result.find((m: any) => 
        m.type === 'achievement' && m.description.includes('consistency')
      );
      expect(consistencyMoment).toBeDefined();
      expect(consistencyMoment?.description).toContain('close to average');
    });

    it('should sort moments by timestamp', async () => {
      const t = convexTest(schema);

      const baseTime = Date.now();
      const gameData = {
        scores: [
          { holeNumber: 1, strokes: 2, timestamp: baseTime + 2000 }, // Later
        ],
        photos: [
          {
            holeNumber: 2,
            caption: 'Early photo',
            timestamp: baseTime, // Earlier
            url: 'https://example.com/photo.jpg',
          },
        ],
        orders: [
          {
            items: [{ name: 'Snack', quantity: 1 }],
            holeNumber: 3,
            timestamp: baseTime + 1000, // Middle
          },
        ],
        socialPosts: [],
      };

      const result = await t.action(api.aiService.detectHighlightMoments, {
        gameData,
      });

      expect(result).toHaveLength(3);
      expect(result[0].timestamp).toBe(baseTime); // Photo first
      expect(result[1].timestamp).toBe(baseTime + 1000); // Order second
      expect(result[2].timestamp).toBe(baseTime + 2000); // Score last
    });
  });

  describe('generateShareableContent', () => {
    it('should generate shareable content with proper formatting', async () => {
      const t = convexTest(schema);

      const highlight = {
        playerName: 'John Doe',
        gameName: 'Championship Round',
        narrative: 'John had an amazing round with great shots and memorable moments.',
        keyMoments: [
          {
            type: 'best_shot',
            description: 'Amazing eagle!',
            holeNumber: 3,
          },
          {
            type: 'order',
            description: 'Perfect timing for lunch',
          },
        ],
        photoCount: 4,
        totalStrokes: 72,
        holesPlayed: 18,
      };

      const result = await t.action(api.aiService.generateShareableContent, {
        highlight,
      });

      expect(result.title).toBe("John Doe's Golf Round at Championship Round");
      expect(result.description).toBe(highlight.narrative);
      expect(result.hashtags).toContain('#ParParty');
      expect(result.hashtags).toContain('#Golf');
      expect(result.stats.holesPlayed).toBe(18);
      expect(result.stats.averageScore).toBe('4.0');
      expect(result.stats.photosShared).toBe(4);
      expect(result.stats.keyMoments).toBe(2);
      expect(result.shortSummary).toContain('Championship Round');
      expect(result.shortSummary).toContain('18 holes');
      expect(result.shortSummary).toContain('4 memories');
    });

    it('should handle zero holes played gracefully', async () => {
      const t = convexTest(schema);

      const highlight = {
        playerName: 'Jane Smith',
        gameName: 'Practice Round',
        narrative: 'Great practice session!',
        keyMoments: [],
        photoCount: 0,
        totalStrokes: 0,
        holesPlayed: 0,
      };

      const result = await t.action(api.aiService.generateShareableContent, {
        highlight,
      });

      expect(result.stats.averageScore).toBe('0');
      expect(result.shortSummary).toContain('0 holes');
      expect(result.shortSummary).toContain('0 memories');
    });
  });
});