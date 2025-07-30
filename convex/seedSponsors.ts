import { mutation } from "./_generated/server";

// Seed function to create sample sponsors and rewards for testing
export const seedSampleSponsors = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if sponsors already exist
    const existingSponsors = await ctx.db.query("sponsors").collect();
    if (existingSponsors.length > 0) {
      return { message: "Sponsors already exist, skipping seed" };
    }

    const now = Date.now();
    
    // Create sample sponsors
    const brewery = await ctx.db.insert("sponsors", {
      name: "Local Craft Brewery",
      logo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop&crop=center",
      description: "Your neighborhood craft brewery with the best local beers",
      website: "https://localbrewery.com",
      contactEmail: "rewards@localbrewery.com",
      rewardBudget: 5000,
      isActive: true,
      createdAt: now,
    });

    const proShop = await ctx.db.insert("sponsors", {
      name: "Golf Pro Shop",
      logo: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=200&h=200&fit=crop&crop=center",
      description: "Premium golf equipment and apparel",
      website: "https://golfproshop.com",
      contactEmail: "deals@golfproshop.com",
      rewardBudget: 3000,
      isActive: true,
      createdAt: now,
    });

    const restaurant = await ctx.db.insert("sponsors", {
      name: "19th Hole Grill",
      logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop&crop=center",
      description: "Delicious food and drinks after your round",
      website: "https://19thholegrill.com",
      contactEmail: "specials@19thholegrill.com",
      rewardBudget: 2000,
      isActive: true,
      createdAt: now,
    });

    // Create sample rewards for brewery
    await ctx.db.insert("sponsorRewards", {
      sponsorId: brewery,
      name: "Free Craft Beer",
      description: "Enjoy a complimentary craft beer from our tap selection",
      type: "product",
      value: 8,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&crop=center",
      maxRedemptions: 100,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 9,
      },
      createdAt: now,
    });

    await ctx.db.insert("sponsorRewards", {
      sponsorId: brewery,
      name: "Brewery Tour & Tasting",
      description: "Free brewery tour with tasting flight for completing 18 holes",
      type: "experience",
      value: 25,
      imageUrl: "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=300&fit=crop&crop=center",
      maxRedemptions: 20,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 18,
        maxScore: 100,
      },
      createdAt: now,
    });

    // Create sample rewards for pro shop
    await ctx.db.insert("sponsorRewards", {
      sponsorId: proShop,
      name: "20% Off Next Purchase",
      description: "Get 20% off your next purchase of golf equipment or apparel",
      type: "discount",
      value: 20,
      imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop&crop=center",
      expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      maxRedemptions: 50,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 9,
      },
      createdAt: now,
    });

    await ctx.db.insert("sponsorRewards", {
      sponsorId: proShop,
      name: "Free Golf Glove",
      description: "Complimentary premium golf glove for players who finish under par",
      type: "product",
      value: 25,
      imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center",
      maxRedemptions: 25,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 18,
        maxScore: 71, // Under par for typical course
      },
      createdAt: now,
    });

    // Create sample rewards for restaurant
    await ctx.db.insert("sponsorRewards", {
      sponsorId: restaurant,
      name: "$10 Food Credit",
      description: "Enjoy $10 off your meal at the 19th Hole Grill",
      type: "credit",
      value: 10,
      imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&crop=center",
      expiresAt: now + (14 * 24 * 60 * 60 * 1000), // 14 days from now
      maxRedemptions: 75,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 9,
      },
      createdAt: now,
    });

    await ctx.db.insert("sponsorRewards", {
      sponsorId: restaurant,
      name: "Free Appetizer",
      description: "Complimentary appetizer with purchase of an entree",
      type: "product",
      value: 12,
      imageUrl: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=300&fit=crop&crop=center",
      expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxRedemptions: 40,
      currentRedemptions: 0,
      isActive: true,
      conditions: {
        requiredHoles: 18,
      },
      createdAt: now,
    });

    return {
      message: "Successfully seeded sample sponsors and rewards",
      sponsors: 3,
      rewards: 6,
    };
  },
});

// Function to clear all sponsor data (for testing)
export const clearSponsorData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all redemptions first (foreign key constraint)
    const redemptions = await ctx.db.query("rewardRedemptions").collect();
    for (const redemption of redemptions) {
      await ctx.db.delete(redemption._id);
    }

    // Delete all rewards
    const rewards = await ctx.db.query("sponsorRewards").collect();
    for (const reward of rewards) {
      await ctx.db.delete(reward._id);
    }

    // Delete all sponsors
    const sponsors = await ctx.db.query("sponsors").collect();
    for (const sponsor of sponsors) {
      await ctx.db.delete(sponsor._id);
    }

    return {
      message: "Successfully cleared all sponsor data",
      deletedRedemptions: redemptions.length,
      deletedRewards: rewards.length,
      deletedSponsors: sponsors.length,
    };
  },
});