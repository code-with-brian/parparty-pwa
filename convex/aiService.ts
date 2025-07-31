import { v } from "convex/values";
import { action } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Types for AI service
interface GameMoment {
  type: "score" | "photo" | "order" | "achievement" | "social";
  holeNumber?: number;
  description: string;
  timestamp: number;
  data?: any;
}

interface AIGenerationContext {
  playerName: string;
  gameName: string;
  totalStrokes: number;
  holesPlayed: number;
  bestScore: number;
  worstScore: number;
  photos: Array<{ url: string; caption?: string; holeNumber?: number }>;
  orders: Array<{ items: string[]; holeNumber?: number; timestamp: number }>;
  socialMoments: Array<{ content: string; timestamp: number }>;
  achievements: Array<{ description: string; timestamp: number }>;
}

// Mock AI service for generating captions and narratives
// In production, this would integrate with OpenAI or similar service
export const generateAICaptions = action({
  args: {
    photos: v.array(v.object({
      url: v.string(),
      caption: v.optional(v.string()),
      holeNumber: v.optional(v.number()),
      timestamp: v.number(),
    })),
    context: v.object({
      playerName: v.string(),
      gameName: v.string(),
      holesPlayed: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Mock AI caption generation
    // In production, this would call OpenAI Vision API
    const captions = args.photos.map((photo, index) => {
      if (photo.caption) return photo.caption;
      
      const holeText = photo.holeNumber ? ` on hole ${photo.holeNumber}` : "";
      const variations = [
        `${args.context.playerName} capturing a great moment${holeText}!`,
        `Perfect shot captured${holeText} during the round`,
        `Golf memories in the making${holeText}`,
        `Another fantastic moment${holeText} at ${args.context.gameName}`,
        `The beauty of golf${holeText} - captured perfectly`,
      ];
      
      return variations[index % variations.length];
    });

    return captions;
  },
});

export const generateAINarrative = action({
  args: {
    context: v.object({
      playerName: v.string(),
      gameName: v.string(),
      totalStrokes: v.number(),
      holesPlayed: v.number(),
      bestScore: v.number(),
      worstScore: v.number(),
      photoCount: v.number(),
      orderCount: v.number(),
      achievementCount: v.number(),
      keyMoments: v.array(v.object({
        type: v.string(),
        description: v.string(),
        holeNumber: v.optional(v.number()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const { context } = args;
    
    // Mock AI narrative generation
    // In production, this would call OpenAI GPT API
    let narrative = `${context.playerName}'s round at ${context.gameName} was `;
    
    // Determine the tone based on performance
    const averageScore = context.holesPlayed > 0 ? context.totalStrokes / context.holesPlayed : 0;
    
    if (context.bestScore <= 2) {
      narrative += "absolutely spectacular! ";
    } else if (averageScore <= 4) {
      narrative += "impressive and memorable! ";
    } else if (averageScore <= 6) {
      narrative += "a solid round with great moments! ";
    } else {
      narrative += "full of learning experiences and fun! ";
    }
    
    // Add performance details
    if (context.holesPlayed > 0) {
      narrative += `Playing ${context.holesPlayed} hole${context.holesPlayed !== 1 ? 's' : ''} `;
      
      if (context.bestScore <= 3) {
        const scoreType = context.bestScore === 1 ? "hole-in-one" : 
                         context.bestScore === 2 ? "eagle" : "birdie";
        narrative += `with an amazing ${scoreType} as the highlight. `;
      } else {
        narrative += `with consistent play throughout. `;
      }
    }
    
    // Add social elements
    if (context.photoCount > 0) {
      narrative += `${context.photoCount} great moment${context.photoCount !== 1 ? 's' : ''} captured for the memories. `;
    }
    
    if (context.orderCount > 0) {
      narrative += `Stayed fueled with ${context.orderCount} F&B order${context.orderCount !== 1 ? 's' : ''} during the round. `;
    }
    
    if (context.achievementCount > 0) {
      narrative += `Celebrated ${context.achievementCount} special achievement${context.achievementCount !== 1 ? 's' : ''} along the way. `;
    }
    
    // Add closing based on key moments
    const hasGreatShots = context.keyMoments.some(m => m.type === "best_shot");
    const hasChallenges = context.keyMoments.some(m => m.type === "worst_shot");
    
    if (hasGreatShots && hasChallenges) {
      narrative += "A perfect mix of brilliant shots and learning moments - that's what golf is all about!";
    } else if (hasGreatShots) {
      narrative += "Those outstanding shots made this round truly special!";
    } else if (hasChallenges) {
      narrative += "Every challenging shot is a step toward improvement - great attitude out there!";
    } else {
      narrative += "Another great day on the course with friends!";
    }
    
    return narrative;
  },
});

export const detectHighlightMoments = action({
  args: {
    gameData: v.object({
      scores: v.array(v.object({
        holeNumber: v.number(),
        strokes: v.number(),
        timestamp: v.number(),
      })),
      photos: v.array(v.object({
        holeNumber: v.optional(v.number()),
        caption: v.optional(v.string()),
        timestamp: v.number(),
        url: v.string(),
      })),
      orders: v.array(v.object({
        items: v.array(v.object({
          name: v.string(),
          quantity: v.number(),
        })),
        holeNumber: v.optional(v.number()),
        timestamp: v.number(),
      })),
      socialPosts: v.array(v.object({
        type: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const { gameData } = args;
    const moments: Array<{
      type: "best_shot" | "worst_shot" | "achievement" | "social_moment" | "order";
      holeNumber?: number;
      description: string;
      timestamp: number;
      photoId?: string;
    }> = [];
    
    // Analyze scores for notable moments
    if (gameData.scores.length > 0) {
      const scores = gameData.scores.map(s => s.strokes);
      const bestScore = Math.min(...scores);
      const worstScore = Math.max(...scores);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Best shot moments
      if (bestScore <= 3) {
        const bestScoreHole = gameData.scores.find(s => s.strokes === bestScore);
        if (bestScoreHole) {
          let description = "";
          if (bestScore === 1) {
            description = `Incredible hole-in-one on hole ${bestScoreHole.holeNumber}! 🎯`;
          } else if (bestScore === 2) {
            description = `Amazing eagle on hole ${bestScoreHole.holeNumber}! 🦅`;
          } else {
            description = `Beautiful birdie on hole ${bestScoreHole.holeNumber}! 🐦`;
          }
          
          moments.push({
            type: "best_shot",
            holeNumber: bestScoreHole.holeNumber,
            description,
            timestamp: bestScoreHole.timestamp,
          });
        }
      }
      
      // Challenging moments (but frame positively)
      if (worstScore >= 8 && worstScore > averageScore + 2) {
        const worstScoreHole = gameData.scores.find(s => s.strokes === worstScore);
        if (worstScoreHole) {
          moments.push({
            type: "worst_shot",
            holeNumber: worstScoreHole.holeNumber,
            description: `Hole ${worstScoreHole.holeNumber} provided a good challenge - part of the golf journey!`,
            timestamp: worstScoreHole.timestamp,
          });
        }
      }
      
      // Consistency achievements
      const consistentHoles = gameData.scores.filter(s => 
        Math.abs(s.strokes - averageScore) <= 1
      ).length;
      
      if (consistentHoles >= Math.floor(gameData.scores.length * 0.6)) {
        moments.push({
          type: "achievement",
          description: `Great consistency with ${consistentHoles} holes close to average!`,
          timestamp: gameData.scores[Math.floor(gameData.scores.length / 2)].timestamp,
        });
      }
    }
    
    // Add F&B order moments
    gameData.orders.forEach(order => {
      const itemNames = order.items.map(item => item.name).join(", ");
      const location = order.holeNumber ? `hole ${order.holeNumber}` : "the clubhouse";
      
      moments.push({
        type: "order",
        holeNumber: order.holeNumber,
        description: `Perfect timing for ${itemNames} at ${location}! 🍔🥤`,
        timestamp: order.timestamp,
      });
    });
    
    // Add photo moments
    gameData.photos.forEach(photo => {
      const location = photo.holeNumber ? ` on hole ${photo.holeNumber}` : "";
      moments.push({
        type: "social_moment",
        holeNumber: photo.holeNumber,
        description: photo.caption || `Great shot captured${location}! 📸`,
        timestamp: photo.timestamp,
      });
    });
    
    // Add achievement moments from social posts
    const achievementPosts = gameData.socialPosts.filter(post => 
      post.type === "achievement"
    );
    
    achievementPosts.forEach(post => {
      moments.push({
        type: "achievement",
        description: post.content,
        timestamp: post.timestamp,
      });
    });
    
    // Sort moments by timestamp
    moments.sort((a, b) => a.timestamp - b.timestamp);
    
    return moments;
  },
});

export const generateShareableContent = action({
  args: {
    highlight: v.object({
      playerName: v.string(),
      gameName: v.string(),
      narrative: v.string(),
      keyMoments: v.array(v.object({
        type: v.string(),
        description: v.string(),
        holeNumber: v.optional(v.number()),
      })),
      photoCount: v.number(),
      totalStrokes: v.number(),
      holesPlayed: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { highlight } = args;
    
    // Generate social media friendly content
    const averageScore = highlight.holesPlayed > 0 ? 
      (highlight.totalStrokes / highlight.holesPlayed).toFixed(1) : "0";
    
    const shareContent = {
      title: `${highlight.playerName}'s Golf Round at ${highlight.gameName}`,
      description: highlight.narrative,
      hashtags: ["#ParParty", "#Golf", "#GolfLife", "#GolfMemories"],
      stats: {
        holesPlayed: highlight.holesPlayed,
        averageScore,
        photosShared: highlight.photoCount,
        keyMoments: highlight.keyMoments.length,
      },
      shortSummary: `Just finished an amazing round at ${highlight.gameName}! ` +
        `${highlight.holesPlayed} holes, ${highlight.photoCount} memories captured. ` +
        `#ParParty #Golf`,
    };
    
    return shareContent;
  },
});