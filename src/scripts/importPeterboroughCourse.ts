// Script to import Peterborough Golf and Country Club with full coordinate data
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { GolfDataImporter } from "@/utils/golfDataImporter";
import { PETERBOROUGH_GOLF_COORDINATES } from "@/data/peterboroughCoordinates";

// This script should be run from a component or admin page
export async function importPeterboroughCourseWithFullData(convexUrl: string) {
  const client = new ConvexHttpClient(convexUrl);
  const importer = new GolfDataImporter();
  
  try {
    // Get the specific course data with full coordinates
    const courseData = importer.getSampleCourseData("0121318782152310");
    
    if (!courseData) {
      throw new Error("Could not find Peterborough Golf and Country Club data");
    }
    
    console.log(`Importing ${courseData.clubName} with ${courseData.holes.length} holes`);
    console.log(`Total coordinates: ${courseData.holes.reduce((sum, hole) => sum + hole.coordinates.length, 0)}`);
    
    // Import the course with all coordinate data
    const result = await client.mutation(api.golfCourses.upsertGolfCourse, courseData);
    
    console.log("Import successful! Course ID:", result);
    
    // Log some statistics
    courseData.holes.forEach(hole => {
      const teeCount = hole.coordinates.filter(c => c.type === 'tee').length;
      const greenCount = hole.coordinates.filter(c => c.type === 'green_center' || c.type === 'green_front').length;
      console.log(`Hole ${hole.holeNumber}: ${teeCount} tees, ${greenCount} green points, ${hole.coordinates.length} total points`);
    });
    
    return result;
  } catch (error) {
    console.error("Error importing course:", error);
    throw error;
  }
}

// Function to verify the imported data
export async function verifyImportedCourse(convexUrl: string, courseId: string) {
  const client = new ConvexHttpClient(convexUrl);
  
  try {
    const course = await client.query(api.golfCourses.getCourseDetails, { courseId });
    
    if (!course) {
      throw new Error("Course not found");
    }
    
    console.log(`Course: ${course.clubName} - ${course.name}`);
    console.log(`Location: ${course.city}, ${course.state}, ${course.country}`);
    console.log(`Total holes: ${course.totalHoles}`);
    
    if (course.holes) {
      console.log(`\nHole details:`);
      course.holes.forEach(hole => {
        console.log(`Hole ${hole.holeNumber} - Par ${hole.par}`);
        if (hole.coordinates) {
          const coordsByType = hole.coordinates.reduce((acc, coord) => {
            acc[coord.type] = (acc[coord.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`  Coordinates:`, coordsByType);
        }
      });
    }
    
    return course;
  } catch (error) {
    console.error("Error verifying course:", error);
    throw error;
  }
}