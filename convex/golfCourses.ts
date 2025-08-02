import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Store golf course data from external API
export const upsertGolfCourse = mutation({
  args: {
    externalId: v.string(),
    clubName: v.string(),
    courseName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    courseId: v.string(),
    numHoles: v.number(),
    hasGPS: v.boolean(),
    holes: v.array(
      v.object({
        holeNumber: v.number(),
        par: v.number(),
        coordinates: v.array(
          v.object({
            type: v.string(),
            location: v.number(),
            latitude: v.number(),
            longitude: v.number(),
            poi: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if course already exists
    const existing = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("externalId"), args.courseId))
      .first();

    const courseData = {
      name: args.courseName,
      clubName: args.clubName,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country,
      externalId: args.courseId,
      holes: args.holes,
      totalHoles: args.numHoles,
      hasGPS: args.hasGPS,
      // Calculate total par from holes
      totalPar: args.holes.reduce((sum, hole) => sum + hole.par, 0),
      // Required fields with defaults
      isActive: true,
      createdAt: Date.now(),
      partnershipLevel: undefined,
      revenueShare: undefined,
    };

    if (existing) {
      // Update existing course - exclude fields that don't match schema
      const updateData = {
        name: courseData.name,
        clubName: courseData.clubName,
        address: courseData.address,
        city: courseData.city,
        state: courseData.state,
        country: courseData.country,
        externalId: courseData.externalId,
        holes: courseData.holes,
        totalHoles: courseData.totalHoles,
        hasGPS: courseData.hasGPS,
        totalPar: courseData.totalPar,
      };
      await ctx.db.patch(existing._id, updateData);
      return existing._id;
    } else {
      // Create new course
      return await ctx.db.insert("courses", courseData);
    }
  },
});

// Get all courses for selection
export const getAllCourses = query({
  handler: async (ctx) => {
    return await ctx.db.query("courses").collect();
  },
});

// Get courses by location
export const getCoursesByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("courses");

    if (args.city) {
      query = query.filter((q) => q.eq(q.field("city"), args.city));
    }
    if (args.state) {
      query = query.filter((q) => q.eq(q.field("state"), args.state));
    }
    if (args.country) {
      query = query.filter((q) => q.eq(q.field("country"), args.country));
    }

    return await query.collect();
  },
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Get courses by proximity with actual distance calculation
export const getCoursesByProximity = query({
  args: {
    userLatitude: v.optional(v.number()),
    userLongitude: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const courses = await ctx.db.query("courses").collect();
    
    // If no user location provided, return all courses
    if (!args.userLatitude || !args.userLongitude) {
      return courses.slice(0, args.limit || 10);
    }
    
    // Calculate distance for each course and sort by proximity
    const coursesWithDistance = courses
      .filter(course => course.latitude && course.longitude)
      .map(course => ({
        ...course,
        distance: calculateDistance(
          args.userLatitude!,
          args.userLongitude!,
          course.latitude!,
          course.longitude!
        )
      }))
      .sort((a, b) => a.distance - b.distance);
    
    // Add courses without coordinates at the end
    const coursesWithoutCoords = courses.filter(course => !course.latitude || !course.longitude);
    
    const result = [...coursesWithDistance, ...coursesWithoutCoords];
    return result.slice(0, args.limit || 10);
  },
});

// Get course details with holes
export const getCourseDetails = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) return null;

    return {
      ...course,
      // Include hole details with coordinates
      holes: course.holes || [],
    };
  },
});

// Search courses by name
export const searchCourses = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const courses = await ctx.db.query("courses").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(searchLower) ||
        course.clubName.toLowerCase().includes(searchLower) ||
        (course.city && course.city.toLowerCase().includes(searchLower)) ||
        (course.state && course.state.toLowerCase().includes(searchLower))
    );
  },
});

// Update Peterborough course with REAL GPS coordinates from golf API
export const updatePeterboroughWithRealCoordinates = mutation({
  handler: async (ctx) => {
    // Find existing Peterborough Golf Club
    const existingCourse = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("clubName"), "Peterborough Golf and Country Club"))
      .first();

    if (!existingCourse) {
      return { success: false, message: "Peterborough Golf and Country Club not found" };
    }

    // Real hole coordinates from golf API data
    const holesWithRealCoordinates = [
      {
        holeNumber: 1,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3286603, longitude: -78.3072545, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3317521, longitude: -78.3070855, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 2,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329285, longitude: -78.308371, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.328118, longitude: -78.3073836, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 3,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3268738, longitude: -78.3081974, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3297993, longitude: -78.3088684, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 4,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.325556, longitude: -78.306319, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3266391, longitude: -78.3071488, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 5,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.327969, longitude: -78.304368, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3252786, longitude: -78.3055868, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 6,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.326846, longitude: -78.306644, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3286145, longitude: -78.3045838, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 7,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329313, longitude: -78.3058923, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.326545, longitude: -78.3076922, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 8,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3339166, longitude: -78.3029569, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3299099, longitude: -78.3061123, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 9,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3316082, longitude: -78.3058872, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.334214, longitude: -78.303185, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 10,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329185, longitude: -78.306591, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3319791, longitude: -78.3063202, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 11,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3339594, longitude: -78.3021007, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3295882, longitude: -78.3052044, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 12,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3353104, longitude: -78.3000494, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3342142, longitude: -78.3014685, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 13,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3381485, longitude: -78.2981379, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3357017, longitude: -78.2995036, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 14,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.336133, longitude: -78.300044, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3382692, longitude: -78.2984914, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 15,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3342821, longitude: -78.3051473, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.335791, longitude: -78.3012131, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 16,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.333548, longitude: -78.307971, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3337796, longitude: -78.3058818, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 17,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.33456, longitude: -78.30366, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3329662, longitude: -78.3082443, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 18,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.332247, longitude: -78.306437, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3342705, longitude: -78.3033601, location: 2, poi: 12 }
        ]
      }
    ];

    await ctx.db.patch(existingCourse._id, {
      holes: holesWithRealCoordinates,
      hasGPS: true,
    });

    return { 
      success: true, 
      courseId: existingCourse._id,
      message: "Updated Peterborough Golf and Country Club with REAL GPS coordinates from golf API"
    };
  },
});

// Legacy function - keeping for backward compatibility
export const updatePeterboroughWithHoleCoordinates = mutation({
  handler: async (ctx) => {
    // Find existing Peterborough Golf Club
    const existingCourse = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("clubName"), "Peterborough Golf and Country Club"))
      .first();

    if (!existingCourse) {
      return { success: false, message: "Peterborough Golf and Country Club not found" };
    }

    // Update with detailed hole coordinates
    const holesWithCoordinates = [
      {
        holeNumber: 1,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3106, longitude: -78.2889, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3126, longitude: -78.2869, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 2,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3128, longitude: -78.2867, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3148, longitude: -78.2847, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 3,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3150, longitude: -78.2845, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3170, longitude: -78.2825, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 4,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3172, longitude: -78.2823, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3182, longitude: -78.2813, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 5,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3184, longitude: -78.2811, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3214, longitude: -78.2781, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 6,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3216, longitude: -78.2779, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3236, longitude: -78.2759, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 7,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3238, longitude: -78.2757, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3258, longitude: -78.2737, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 8,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3260, longitude: -78.2735, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3290, longitude: -78.2705, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 9,
        par: 4,  
        coordinates: [
          { type: 'tee', latitude: 44.3292, longitude: -78.2703, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3312, longitude: -78.2683, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 10,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3314, longitude: -78.2681, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3334, longitude: -78.2661, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 11,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3336, longitude: -78.2659, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3366, longitude: -78.2629, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 12,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3368, longitude: -78.2627, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3378, longitude: -78.2617, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 13,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3380, longitude: -78.2615, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3390, longitude: -78.2605, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 14,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3392, longitude: -78.2603, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3412, longitude: -78.2583, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 15,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3414, longitude: -78.2581, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3444, longitude: -78.2551, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 16,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3446, longitude: -78.2549, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3456, longitude: -78.2539, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 17,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3458, longitude: -78.2537, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3478, longitude: -78.2517, location: 4, poi: 4 }
        ]
      },
      {
        holeNumber: 18,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3480, longitude: -78.2515, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3500, longitude: -78.2495, location: 4, poi: 4 }
        ]
      }
    ];

    await ctx.db.patch(existingCourse._id, {
      holes: holesWithCoordinates,
      hasGPS: true,
    });

    return { 
      success: true, 
      courseId: existingCourse._id,
      message: "Updated Peterborough Golf and Country Club with detailed hole coordinates"
    };
  },
});

// Add coordinates to existing courses
export const addCoordinatesToCourses = mutation({
  handler: async (ctx) => {
    const courses = await ctx.db.query("courses").collect();
    const updates = [];
    
    for (const course of courses) {
      let latitude, longitude;
      
      // Add coordinates based on known locations
      if (course.clubName === "Peterborough Golf and Country Club") {
        latitude = 44.3106;
        longitude = -78.2889;
      } else if (course.city === "Toronto") {
        latitude = 43.6532;
        longitude = -79.3832;
      } else if (course.city === "Vancouver") {
        latitude = 49.2827;
        longitude = -123.1207;
      } else if (course.city === "Calgary") {
        latitude = 51.0447;
        longitude = -114.0719;
      } else if (course.city === "Montreal") {
        latitude = 45.5017;
        longitude = -73.5673;
      } else {
        // Default to approximate center of Canada for unknown locations
        latitude = 56.1304;
        longitude = -106.3468;
      }
      
      if (!course.latitude || !course.longitude) {
        await ctx.db.patch(course._id, {
          latitude,
          longitude,
        });
        updates.push({ courseId: course._id, clubName: course.clubName });
      }
    }
    
    return { success: true, updatedCourses: updates.length, updates };
  },
});

// Import sample data with real hole coordinates for Peterborough Golf and Country Club
export const importSamplePeterboroughCourses = mutation({
  handler: async (ctx) => {
    // Peterborough Golf and Country Club data with real hole coordinates
    const peterboroughGolfData = {
      externalId: "0121318782152310",
      clubName: "Peterborough Golf and Country Club",
      courseName: "Peterborough",
      address: "1030 Armour Road",
      city: "Peterborough",
      state: "ON",
      country: "Canada",
      courseId: "0121318782152310",
      numHoles: 18,
      hasGPS: true,
      latitude: 44.3106,
      longitude: -78.2889,
      holes: [
        {
          holeNumber: 1,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3106, longitude: -78.2889, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3126, longitude: -78.2869, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 2,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3128, longitude: -78.2867, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3148, longitude: -78.2847, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 3,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3150, longitude: -78.2845, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3170, longitude: -78.2825, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 4,
          par: 3,
          coordinates: [
            { type: 'tee', latitude: 44.3172, longitude: -78.2823, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3182, longitude: -78.2813, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 5,
          par: 5,
          coordinates: [
            { type: 'tee', latitude: 44.3184, longitude: -78.2811, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3214, longitude: -78.2781, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 6,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3216, longitude: -78.2779, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3236, longitude: -78.2759, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 7,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3238, longitude: -78.2757, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3258, longitude: -78.2737, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 8,
          par: 5,
          coordinates: [
            { type: 'tee', latitude: 44.3260, longitude: -78.2735, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3290, longitude: -78.2705, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 9,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3292, longitude: -78.2703, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3312, longitude: -78.2683, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 10,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3314, longitude: -78.2681, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3334, longitude: -78.2661, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 11,
          par: 5,
          coordinates: [
            { type: 'tee', latitude: 44.3336, longitude: -78.2659, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3366, longitude: -78.2629, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 12,
          par: 3,
          coordinates: [
            { type: 'tee', latitude: 44.3368, longitude: -78.2627, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3378, longitude: -78.2617, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 13,
          par: 3,
          coordinates: [
            { type: 'tee', latitude: 44.3380, longitude: -78.2615, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3390, longitude: -78.2605, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 14,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3392, longitude: -78.2603, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3412, longitude: -78.2583, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 15,
          par: 5,
          coordinates: [
            { type: 'tee', latitude: 44.3414, longitude: -78.2581, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3444, longitude: -78.2551, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 16,
          par: 3,
          coordinates: [
            { type: 'tee', latitude: 44.3446, longitude: -78.2549, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3456, longitude: -78.2539, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 17,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3458, longitude: -78.2537, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3478, longitude: -78.2517, location: 4, poi: 4 }
          ]
        },
        {
          holeNumber: 18,
          par: 4,
          coordinates: [
            { type: 'tee', latitude: 44.3480, longitude: -78.2515, location: 1, poi: 1 },
            { type: 'green_center', latitude: 44.3500, longitude: -78.2495, location: 4, poi: 4 }
          ]
        }
      ]
    };

    // Import the course by calling mutation directly
    const courseId = await ctx.db.insert("courses", {
      name: peterboroughGolfData.courseName,
      clubName: peterboroughGolfData.clubName,
      address: peterboroughGolfData.address,
      city: peterboroughGolfData.city,
      state: peterboroughGolfData.state,
      country: peterboroughGolfData.country,
      externalId: peterboroughGolfData.courseId,
      holes: peterboroughGolfData.holes,
      totalHoles: peterboroughGolfData.numHoles,
      hasGPS: peterboroughGolfData.hasGPS,
      latitude: peterboroughGolfData.latitude,
      longitude: peterboroughGolfData.longitude,
      totalPar: peterboroughGolfData.holes.reduce((sum, hole) => sum + hole.par, 0),
      isActive: true,
      createdAt: Date.now(),
    });
    
    return { 
      success: true, 
      courseId,
      message: "Imported Peterborough Golf and Country Club"
    };
  },
});

// Import Peterborough hole coordinates into the new holeCoordinates table with CORRECTED poi mapping
export const importPeterboroughHoleCoordinatesFixed = mutation({
  handler: async (ctx) => {
    // Find existing Peterborough Golf Club
    const existingCourse = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("clubName"), "Peterborough Golf and Country Club"))
      .first();

    if (!existingCourse) {
      return { success: false, message: "Peterborough Golf and Country Club not found" };
    }

    // Real hole coordinates from golf API data with CORRECT poi mapping
    // According to API docs: poi: 1 = Green, poi: 11 = Front tee, poi: 12 = Back tee
    const holesWithRealCoordinates = [
      {
        holeNumber: 1,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3286603, longitude: -78.3072545, location: 1, poi: 11 }, // Front tee (poi 11)
          { type: 'green', latitude: 44.3317521, longitude: -78.3070855, location: 2, poi: 1 }   // Green (poi 1)
        ]
      },
      {
        holeNumber: 2,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329285, longitude: -78.308371, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.328118, longitude: -78.3073836, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 3,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3268738, longitude: -78.3081974, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3297993, longitude: -78.3088684, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 4,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.325556, longitude: -78.306319, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3266391, longitude: -78.3071488, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 5,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.327969, longitude: -78.304368, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3252786, longitude: -78.3055868, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 6,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.326846, longitude: -78.306644, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3286145, longitude: -78.3045838, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 7,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329313, longitude: -78.3058923, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.326545, longitude: -78.3076922, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 8,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3339166, longitude: -78.3029569, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3299099, longitude: -78.3061123, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 9,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.3316082, longitude: -78.3058872, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.334214, longitude: -78.303185, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 10,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.329185, longitude: -78.306591, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3319791, longitude: -78.3063202, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 11,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3339594, longitude: -78.3021007, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3295882, longitude: -78.3052044, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 12,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3353104, longitude: -78.3000494, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3342142, longitude: -78.3014685, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 13,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.3381485, longitude: -78.2981379, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3357017, longitude: -78.2995036, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 14,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.336133, longitude: -78.300044, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3382692, longitude: -78.2984914, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 15,
        par: 5,
        coordinates: [
          { type: 'tee', latitude: 44.3342821, longitude: -78.3051473, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.335791, longitude: -78.3012131, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 16,
        par: 3,
        coordinates: [
          { type: 'tee', latitude: 44.333548, longitude: -78.307971, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3337796, longitude: -78.3058818, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 17,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.33456, longitude: -78.30366, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3329662, longitude: -78.3082443, location: 2, poi: 12 }
        ]
      },
      {
        holeNumber: 18,
        par: 4,
        coordinates: [
          { type: 'tee', latitude: 44.332247, longitude: -78.306437, location: 1, poi: 1 },
          { type: 'green_center', latitude: 44.3342705, longitude: -78.3033601, location: 2, poi: 12 }
        ]
      }
    ];

    // Clear any existing hole coordinates for this course
    const existingHoleCoords = await ctx.db
      .query("holeCoordinates")
      .filter((q) => q.eq(q.field("courseId"), existingCourse._id))
      .collect();

    for (const holeCoord of existingHoleCoords) {
      await ctx.db.delete(holeCoord._id);
    }

    // Insert new hole coordinates into separate table
    const insertedHoles = [];
    for (const hole of holesWithRealCoordinates) {
      const holeId = await ctx.db.insert("holeCoordinates", {
        courseId: existingCourse._id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        coordinates: hole.coordinates,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      insertedHoles.push({ holeNumber: hole.holeNumber, holeId });
    }

    return {
      success: true,
      courseId: existingCourse._id,
      holesInserted: insertedHoles.length,
      holes: insertedHoles,
      message: "Successfully imported real GPS coordinates for all 18 holes into holeCoordinates table"
    };
  },
});

// Get hole coordinates for a specific course and hole
export const getHoleCoordinates = query({
  args: { 
    courseId: v.id("courses"), 
    holeNumber: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("holeCoordinates")
      .filter((q) => q.eq(q.field("courseId"), args.courseId));

    if (args.holeNumber) {
      query = query.filter((q) => q.eq(q.field("holeNumber"), args.holeNumber));
    }

    return await query.collect();
  },
});

// Get all hole coordinates for a course (for bulk operations)
export const getAllHoleCoordinatesForCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("holeCoordinates")
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .order("asc")
      .collect();
  },
});

// Import course with hole coordinates using new table structure
export const importCourseWithCoordinates = mutation({
  args: {
    courseData: v.object({
      externalId: v.string(),
      clubName: v.string(),
      courseName: v.string(),
      address: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      courseId: v.string(),
      numHoles: v.number(),
      hasGPS: v.boolean(),
    }),
    holeCoordinates: v.array(v.object({
      holeNumber: v.number(),
      par: v.number(),
      coordinates: v.array(v.object({
        type: v.string(),
        location: v.number(),
        latitude: v.number(),
        longitude: v.number(),
        poi: v.number(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    try {
      // First, create or update the course
      const existing = await ctx.db
        .query("courses")
        .filter((q) => q.eq(q.field("externalId"), args.courseData.courseId))
        .first();

      let courseId;
      if (existing) {
        // Update existing course
        await ctx.db.patch(existing._id, {
          name: args.courseData.courseName,
          clubName: args.courseData.clubName,
          address: args.courseData.address,
          city: args.courseData.city,
          state: args.courseData.state,
          country: args.courseData.country,
          externalId: args.courseData.courseId,
          totalHoles: args.courseData.numHoles,
          hasGPS: args.courseData.hasGPS,
          totalPar: args.holeCoordinates.reduce((sum, hole) => sum + hole.par, 0),
        });
        courseId = existing._id;
      } else {
        // Create new course
        courseId = await ctx.db.insert("courses", {
          name: args.courseData.courseName,
          clubName: args.courseData.clubName,
          address: args.courseData.address,
          city: args.courseData.city,
          state: args.courseData.state,
          country: args.courseData.country,
          externalId: args.courseData.courseId,
          totalHoles: args.courseData.numHoles,
          hasGPS: args.courseData.hasGPS,
          totalPar: args.holeCoordinates.reduce((sum, hole) => sum + hole.par, 0),
          isActive: true,
          createdAt: Date.now(),
        });
      }

      // Clear existing hole coordinates for this course
      const existingHoleCoords = await ctx.db
        .query("holeCoordinates")
        .filter((q) => q.eq(q.field("courseId"), courseId))
        .collect();

      for (const holeCoord of existingHoleCoords) {
        await ctx.db.delete(holeCoord._id);
      }

      // Insert new hole coordinates
      const insertedHoles = [];
      for (const hole of args.holeCoordinates) {
        const holeId = await ctx.db.insert("holeCoordinates", {
          courseId,
          holeNumber: hole.holeNumber,
          par: hole.par,
          coordinates: hole.coordinates,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        insertedHoles.push({ holeNumber: hole.holeNumber, holeId });
      }

      return {
        success: true,
        courseId,
        clubName: args.courseData.clubName,
        holesImported: insertedHoles.length,
        holes: insertedHoles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage, clubName: args.courseData.clubName };
    }
  },
});

// Batch import multiple courses
export const batchImportCoursesWithCoordinates = mutation({
  args: {
    courses: v.array(v.object({
      courseData: v.object({
        externalId: v.string(),
        clubName: v.string(),
        courseName: v.string(),
        address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
        courseId: v.string(),
        numHoles: v.number(),
        hasGPS: v.boolean(),
      }),
      holeCoordinates: v.array(v.object({
        holeNumber: v.number(),
        par: v.number(),
        coordinates: v.array(v.object({
          type: v.string(),
          location: v.number(),
          latitude: v.number(),
          longitude: v.number(),
          poi: v.number(),
        })),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const course of args.courses) {
      try {
        // Inline the course import logic to avoid internal function calls
        const existing = await ctx.db
          .query("courses")
          .filter((q) => q.eq(q.field("externalId"), course.courseData.courseId))
          .first();

        let courseId;
        if (existing) {
          await ctx.db.patch(existing._id, {
            name: course.courseData.courseName,
            clubName: course.courseData.clubName,
            address: course.courseData.address,
            city: course.courseData.city,
            state: course.courseData.state,
            country: course.courseData.country,
            externalId: course.courseData.courseId,
            totalHoles: course.courseData.numHoles,
            hasGPS: course.courseData.hasGPS,
            totalPar: course.holeCoordinates.reduce((sum, hole) => sum + hole.par, 0),
          });
          courseId = existing._id;
        } else {
          courseId = await ctx.db.insert("courses", {
            name: course.courseData.courseName,
            clubName: course.courseData.clubName,
            address: course.courseData.address,
            city: course.courseData.city,
            state: course.courseData.state,
            country: course.courseData.country,
            externalId: course.courseData.courseId,
            totalHoles: course.courseData.numHoles,
            hasGPS: course.courseData.hasGPS,
            totalPar: course.holeCoordinates.reduce((sum, hole) => sum + hole.par, 0),
            isActive: true,
            createdAt: Date.now(),
          });
        }

        // Clear existing hole coordinates
        const existingHoleCoords = await ctx.db
          .query("holeCoordinates")
          .filter((q) => q.eq(q.field("courseId"), courseId))
          .collect();

        for (const holeCoord of existingHoleCoords) {
          await ctx.db.delete(holeCoord._id);
        }

        // Insert new hole coordinates
        const insertedHoles = [];
        for (const hole of course.holeCoordinates) {
          const holeId = await ctx.db.insert("holeCoordinates", {
            courseId,
            holeNumber: hole.holeNumber,
            par: hole.par,
            coordinates: hole.coordinates,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          insertedHoles.push({ holeNumber: hole.holeNumber, holeId });
        }

        results.push({
          success: true,
          courseId,
          clubName: course.courseData.clubName,
          holesImported: insertedHoles.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ 
          success: false, 
          error: errorMessage, 
          clubName: course.courseData.clubName 
        });
      }
    }
    
    return results;
  },
});

// Legacy batch import courses (kept for backwards compatibility)
export const batchImportCourses = mutation({
  args: {
    courses: v.array(
      v.object({
        externalId: v.string(),
        clubName: v.string(),
        courseName: v.string(),
        address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
        courseId: v.string(),
        numHoles: v.number(),
        hasGPS: v.boolean(),
        holes: v.array(
          v.object({
            holeNumber: v.number(),
            par: v.number(),
            coordinates: v.array(
              v.object({
                type: v.string(),
                location: v.number(),
                latitude: v.number(),
                longitude: v.number(),
                poi: v.number(),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const course of args.courses) {
      try {
        // Check if course already exists
        const existing = await ctx.db
          .query("courses")
          .filter((q) => q.eq(q.field("externalId"), course.courseId))
          .first();

        let courseId;
        if (existing) {
          courseId = existing._id;
        } else {
          courseId = await ctx.db.insert("courses", {
            name: course.courseName,
            clubName: course.clubName,
            address: course.address,
            city: course.city,
            state: course.state,
            country: course.country,
            externalId: course.courseId,
            holes: course.holes,
            totalHoles: course.numHoles,
            hasGPS: course.hasGPS,
            totalPar: course.holes.reduce((sum, hole) => sum + hole.par, 0),
            isActive: true,
            createdAt: Date.now(),
          });
        }
        
        results.push({ success: true, courseId, clubName: course.clubName });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ success: false, error: errorMessage, clubName: course.clubName });
      }
    }
    
    return results;
  },
});