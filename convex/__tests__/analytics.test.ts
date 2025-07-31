import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

describe("Analytics Functions", () => {
  let t: any;
  let courseId: Id<"courses">;
  let sponsorId: Id<"sponsors">;
  let gameId: Id<"games">;
  let playerId: Id<"players">;
  let userId: Id<"users">;
  let guestId: Id<"guests">;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create test user
    userId = await t.mutation(api.users.create, {
      name: "Test User",
      email: "test@example.com",
      tokenIdentifier: "test-token",
    });

    // Create test guest
    guestId = await t.mutation(api.guests.createGuestSession, {
      name: "Test Guest",
    });

    // Create test course
    courseId = await t.mutation(api.courses.createCourse, {
      name: "Test Golf Course",
      address: "123 Golf St",
      city: "Golf City",
      state: "GC",
      partnershipLevel: "premium",
      revenueShare: 15,
    });

    // Create test sponsor
    sponsorId = await t.mutation(api.sponsors.createSponsor, {
      name: "Test Sponsor",
      logo: "https://example.com/logo.png",
      description: "Test sponsor description",
      rewardBudget: 10000,
    });

    // Create test game
    gameId = await t.mutation(api.games.createGame, {
      name: "Test Game",
      createdBy: userId,
      courseId,
    });

    // Create test player
    playerId = await t.mutation(api.games.joinGameAsGuest, {
      gameId,
      guestId,
    });
  });

  describe("getCourseAnalytics", () => {
    test("should return comprehensive course analytics", async () => {
      // Create some test data
      await t.mutation(api.games.recordScore, {
        playerId,
        holeNumber: 1,
        strokes: 4,
      });

      // Create F&B order
      const orderId = await t.mutation(api.foodOrders.createOrder, {
        playerId,
        gameId,
        courseId,
        items: [{ name: "Beer", quantity: 2, price: 500, description: "Cold beer" }],
        totalAmount: 1000,
        deliveryLocation: "hole",
        holeNumber: 1,
      });

      // Finish the game
      await t.mutation(api.games.finishGame, { gameId });

      // Create sponsor reward and redemption
      const rewardId = await t.mutation(api.sponsors.createSponsorReward, {
        sponsorId,
        name: "Free Beer",
        description: "Free beer reward",
        type: "product",
        value: 500,
        imageUrl: "https://example.com/beer.png",
      });

      await t.mutation(api.sponsors.redeemReward, {
        rewardId,
        playerId,
        gameId,
      });

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId,
      });

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalGames).toBe(1);
      expect(analytics.overview.totalPlayers).toBe(1);
      expect(analytics.overview.totalRevenue).toBe(1000);
      expect(analytics.overview.totalRedemptions).toBe(1);
      expect(analytics.trends).toBeDefined();
      expect(analytics.engagement).toBeDefined();
      expect(analytics.lastUpdated).toBeTypeOf("number");
    });

    test("should handle date range filtering", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId,
        startDate: yesterdayStr,
        endDate: new Date().toISOString().split('T')[0],
      });

      expect(analytics).toBeDefined();
      expect(analytics.overview.totalGames).toBe(1); // Game created today should be included
    });

    test("should return zero metrics for course with no activity", async () => {
      const emptyCourseId = await t.mutation(api.courses.createCourse, {
        name: "Empty Course",
        address: "456 Empty St",
        partnershipLevel: "basic",
        revenueShare: 10,
      });

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId: emptyCourseId,
      });

      expect(analytics.overview.totalGames).toBe(0);
      expect(analytics.overview.totalPlayers).toBe(0);
      expect(analytics.overview.totalRevenue).toBe(0);
      expect(analytics.overview.conversionRate).toBe(0);
    });
  });

  describe("getSponsorEngagementAnalytics", () => {
    test("should return sponsor engagement metrics", async () => {
      // Create sponsor reward
      const rewardId = await t.mutation(api.sponsors.createSponsorReward, {
        sponsorId,
        name: "Test Reward",
        description: "Test reward description",
        type: "discount",
        value: 1000,
        imageUrl: "https://example.com/reward.png",
      });

      // Finish game to enable redemption
      await t.mutation(api.games.finishGame, { gameId });

      // Redeem reward
      await t.mutation(api.sponsors.redeemReward, {
        rewardId,
        playerId,
        gameId,
      });

      const analytics = await t.query(api.analytics.getSponsorEngagementAnalytics, {
        courseId,
      });

      expect(analytics).toBeDefined();
      expect(analytics.totalRedemptions).toBe(1);
      expect(analytics.totalValue).toBe(1000);
      expect(analytics.uniqueSponsors).toBe(1);
      expect(analytics.sponsorBreakdown).toHaveLength(1);
      expect(analytics.topPerformingSponsors).toHaveLength(1);
      expect(analytics.topPerformingSponsors[0].sponsorName).toBe("Test Sponsor");
    });

    test("should filter by sponsor ID", async () => {
      // Create another sponsor
      const sponsor2Id = await t.mutation(api.sponsors.createSponsor, {
        name: "Sponsor 2",
        logo: "https://example.com/logo2.png",
        rewardBudget: 5000,
      });

      const analytics = await t.query(api.analytics.getSponsorEngagementAnalytics, {
        courseId,
        sponsorId: sponsor2Id,
      });

      expect(analytics.totalRedemptions).toBe(0);
      expect(analytics.uniqueSponsors).toBe(0);
    });
  });

  describe("getPlayerJourneyAnalytics", () => {
    test("should return player journey metrics", async () => {
      // Create social post
      await t.mutation(api.socialPosts.createPost, {
        gameId,
        playerId,
        type: "custom",
        content: "Great shot!",
      });

      // Create F&B order
      await t.mutation(api.foodOrders.createOrder, {
        playerId,
        gameId,
        courseId,
        items: [{ name: "Snack", quantity: 1, price: 300 }],
        totalAmount: 300,
        deliveryLocation: "clubhouse",
      });

      const analytics = await t.query(api.analytics.getPlayerJourneyAnalytics, {
        courseId,
      });

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalPlayers).toBe(1);
      expect(analytics.overview.guestPlayers).toBe(1);
      expect(analytics.overview.convertedPlayers).toBe(0);
      expect(analytics.engagement).toBeDefined();
      expect(analytics.conversionFunnel).toBeDefined();
      expect(analytics.dropoffRates).toBeDefined();
    });

    test("should calculate conversion rates correctly", async () => {
      // Convert guest to user
      await t.mutation(api.userConversion.convertGuestToUser, {
        guestId,
        name: "Converted User",
        email: "converted@example.com",
      });

      const analytics = await t.query(api.analytics.getPlayerJourneyAnalytics, {
        courseId,
      });

      expect(analytics.overview.convertedPlayers).toBe(1);
      expect(analytics.overview.conversionRate).toBeGreaterThan(0);
    });
  });

  describe("getRealTimeDashboard", () => {
    test("should return real-time dashboard data", async () => {
      // Create activity for today
      await t.mutation(api.games.recordScore, {
        playerId,
        holeNumber: 1,
        strokes: 4,
      });

      const dashboard = await t.query(api.analytics.getRealTimeDashboard, {
        courseId,
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.today).toBeDefined();
      expect(dashboard.today.totalGames).toBe(1);
      expect(dashboard.today.activeGames).toBe(1);
      expect(dashboard.liveActivity).toBeDefined();
      expect(dashboard.liveActivity.activeGames).toHaveLength(1);
      expect(dashboard.lastUpdated).toBeTypeOf("number");
    });

    test("should show recent activity", async () => {
      // Create F&B order (recent activity)
      await t.mutation(api.foodOrders.createOrder, {
        playerId,
        gameId,
        courseId,
        items: [{ name: "Water", quantity: 1, price: 200 }],
        totalAmount: 200,
        deliveryLocation: "hole",
        holeNumber: 2,
      });

      const dashboard = await t.query(api.analytics.getRealTimeDashboard, {
        courseId,
      });

      expect(dashboard.liveActivity.recentActivity.length).toBeGreaterThan(0);
    });
  });

  describe("generateAutomatedReport", () => {
    test("should generate daily report", async () => {
      const report = await t.mutation(api.analytics.generateAutomatedReport, {
        courseId,
        reportType: "daily",
        recipientEmail: "partner@example.com",
      });

      expect(report).toBeDefined();
      expect(report.reportId).toContain(courseId);
      expect(report.reportType).toBe("daily");
      expect(report.status).toBe("generated");
      expect(report.data).toBeDefined();
      expect(report.recipientEmail).toBe("partner@example.com");
    });

    test("should generate weekly report", async () => {
      const report = await t.mutation(api.analytics.generateAutomatedReport, {
        courseId,
        reportType: "weekly",
        recipientEmail: "partner@example.com",
      });

      expect(report.reportType).toBe("weekly");
      expect(report.status).toBe("generated");
    });

    test("should generate monthly report", async () => {
      const report = await t.mutation(api.analytics.generateAutomatedReport, {
        courseId,
        reportType: "monthly",
        recipientEmail: "partner@example.com",
      });

      expect(report.reportType).toBe("monthly");
      expect(report.status).toBe("generated");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle invalid course ID", async () => {
      const invalidCourseId = "invalid-id" as Id<"courses">;
      
      await expect(
        t.query(api.analytics.getCourseAnalytics, {
          courseId: invalidCourseId,
        })
      ).rejects.toThrow();
    });

    test("should handle empty date ranges", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId,
        startDate: futureDateStr,
        endDate: futureDateStr,
      });

      expect(analytics.overview.totalGames).toBe(0);
    });

    test("should handle courses with no games", async () => {
      const newCourseId = await t.mutation(api.courses.createCourse, {
        name: "New Course",
        address: "789 New St",
        partnershipLevel: "basic",
        revenueShare: 5,
      });

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId: newCourseId,
      });

      expect(analytics.overview.totalGames).toBe(0);
      expect(analytics.overview.totalPlayers).toBe(0);
      expect(analytics.engagement.averagePlayersPerGame).toBe(0);
    });
  });

  describe("Performance and Data Consistency", () => {
    test("should handle multiple games and players", async () => {
      // Create multiple games and players
      for (let i = 0; i < 5; i++) {
        const newGameId = await t.mutation(api.games.createGame, {
          name: `Game ${i}`,
          createdBy: userId,
          courseId,
        });

        const newGuestId = await t.mutation(api.guests.createGuestSession, {
          name: `Guest ${i}`,
        });

        await t.mutation(api.games.joinGameAsGuest, {
          gameId: newGameId,
          guestId: newGuestId,
        });
      }

      const analytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId,
      });

      expect(analytics.overview.totalGames).toBe(6); // Original + 5 new
      expect(analytics.overview.totalPlayers).toBe(6);
    });

    test("should maintain data consistency across different analytics queries", async () => {
      // Create comprehensive test data
      await t.mutation(api.games.recordScore, {
        playerId,
        holeNumber: 1,
        strokes: 4,
      });

      await t.mutation(api.foodOrders.createOrder, {
        playerId,
        gameId,
        courseId,
        items: [{ name: "Drink", quantity: 1, price: 400 }],
        totalAmount: 400,
        deliveryLocation: "hole",
        holeNumber: 1,
      });

      await t.mutation(api.games.finishGame, { gameId });

      const rewardId = await t.mutation(api.sponsors.createSponsorReward, {
        sponsorId,
        name: "Test Reward",
        description: "Test reward",
        type: "product",
        value: 300,
        imageUrl: "https://example.com/reward.png",
      });

      await t.mutation(api.sponsors.redeemReward, {
        rewardId,
        playerId,
        gameId,
      });

      // Get analytics from different endpoints
      const courseAnalytics = await t.query(api.analytics.getCourseAnalytics, {
        courseId,
      });

      const sponsorAnalytics = await t.query(api.analytics.getSponsorEngagementAnalytics, {
        courseId,
      });

      const playerJourney = await t.query(api.analytics.getPlayerJourneyAnalytics, {
        courseId,
      });

      // Verify consistency
      expect(courseAnalytics.overview.totalGames).toBe(1);
      expect(courseAnalytics.overview.totalRedemptions).toBe(1);
      expect(sponsorAnalytics.totalRedemptions).toBe(1);
      expect(playerJourney.overview.totalPlayers).toBe(1);
    });
  });
});