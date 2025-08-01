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

// Import sample data (for testing)
export const importSamplePeterboroughCourses = mutation({
  handler: async (ctx) => {
    // Peterborough Golf and Country Club data
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
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: [4, 4, 4, 3, 5, 4, 4, 5, 4, 4, 5, 3, 3, 4, 5, 3, 4, 4][i], // Standard par setup
        coordinates: [], // Will be populated from coordinates data
      })),
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

// Batch import courses
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