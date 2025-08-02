import { v } from "convex/values";
import { action } from "./_generated/server";

// Golf API proxy to bypass CORS restrictions
const GOLF_API_BASE_URL = "https://www.golfapi.io/api/v2.3";

// Search for golf clubs by location
export const searchClubsByLocation = action({
  args: {
    location: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("🔍 Searching Golf API from backend with location:", args.location);
      
      // Try different search parameters for better location filtering
      // The API might need more specific parameters
      const url = `${GOLF_API_BASE_URL}/clubs?location=${encodeURIComponent(args.location)}&limit=20&key=${args.apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Method 2: Also try API key in header if query param fails
          'X-API-Key': args.apiKey,
          'Authorization': `Bearer ${args.apiKey}`,
        },
      });

      const responseText = await response.text();
      console.log("📡 Golf API Response Status:", response.status);
      console.log("📄 Response Text:", responseText.substring(0, 200));

      if (!response.ok) {
        throw new Error(`Golf API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log("✅ Successfully fetched", data.clubs?.length || 0, "clubs");
      console.log("🏌️ Sample clubs:", data.clubs?.slice(0, 3).map((c: any) => ({
        name: c.clubName,
        city: c.city,
        state: c.state,
        distance: c.distance
      })));
      
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("❌ Golf API proxy error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Get course coordinates
export const getCourseCoordinates = action({
  args: {
    courseId: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("📍 Fetching coordinates for course:", args.courseId);
      
      const url = `${GOLF_API_BASE_URL}/coordinates?courseID=${args.courseId}&key=${args.apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': args.apiKey,
          'Authorization': `Bearer ${args.apiKey}`,
        },
      });

      const responseText = await response.text();
      console.log("📡 Coordinates API Response Status:", response.status);

      if (!response.ok) {
        throw new Error(`Golf API coordinates error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log("✅ Successfully fetched", data.numCoordinates || 0, "coordinates");
      
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("❌ Golf API coordinates error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Test API key validity
export const testApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Test with a simple search
      const url = `${GOLF_API_BASE_URL}/clubs?location=Toronto&key=${args.apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': args.apiKey,
          'Authorization': `Bearer ${args.apiKey}`,
        },
      });

      const responseText = await response.text();
      
      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? "API key is valid" : `Invalid API key: ${responseText}`,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        message: error instanceof Error ? error.message : "Failed to test API key",
      };
    }
  },
});