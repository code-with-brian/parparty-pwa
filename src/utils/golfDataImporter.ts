// Golf Data Importer - Utility to import golf course data into the system
import { GolfApiClient, POI_TYPES } from './golfApiClient';
import type { GolfApiClub, GolfApiCourse, GolfApiCoordinate } from './golfApiClient';
import { PETERBOROUGH_GOLF_COORDINATES } from '@/data/peterboroughCoordinates';

// Sample Peterborough clubs data
export const SAMPLE_PETERBOROUGH_CLUBS = {
  "apiRequestsLeft": "19.9",
  "numClubs": 6,
  "numAllClubs": 6,
  "clubs": [
    {
      "clubID": "1179674867844",
      "clubName": "Heron Landing Golf Club",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "2361 Lansdowne Street West",
      "timestampUpdated": "1745528384",
      "distance": "",
      "courses": [
        {
          "courseID": "0121179674867844",
          "courseName": "18-hole course",
          "numHoles": 18,
          "timestampUpdated": "1745528384",
          "hasGPS": 1
        }
      ]
    },
    {
      "clubID": "1179765682852",
      "clubName": "Kawartha Golf Club",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "777 Clonsilla Avenue",
      "timestampUpdated": "1745528302",
      "distance": "",
      "courses": [
        {
          "courseID": "0121179765682852",
          "courseName": "18-hole course",
          "numHoles": 18,
          "timestampUpdated": "1745528302",
          "hasGPS": 1
        }
      ]
    },
    {
      "clubID": "1461629435523023",
      "clubName": "Keystone Links Golf & Country Club",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "Clifford Line",
      "timestampUpdated": "1745528447",
      "distance": "",
      "courses": [
        {
          "courseID": "0121461629435520569",
          "courseName": "Keystone Links",
          "numHoles": 18,
          "timestampUpdated": "1745528447",
          "hasGPS": 1
        }
      ]
    },
    {
      "clubID": "1462621171666187",
      "clubName": "Liftlock Golfland",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "2320 Ashburnham Drive",
      "timestampUpdated": "1745528510",
      "distance": "",
      "courses": [
        {
          "courseID": "0121462621171660464",
          "courseName": "Liftlock Golfland",
          "numHoles": 18,
          "timestampUpdated": "1745528510",
          "hasGPS": 1
        }
      ]
    },
    {
      "clubID": "1318783705473019",
      "clubName": "Peterborough Golf and Country Club",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "1030 Armour Road",
      "timestampUpdated": "1749412584",
      "distance": "",
      "courses": [
        {
          "courseID": "0121318782152310",
          "courseName": "Peterborough",
          "numHoles": 18,
          "timestampUpdated": "1749412584",
          "hasGPS": 1
        }
      ]
    },
    {
      "clubID": "1594060223987979",
      "clubName": "Pine Crest Golf Club Ltd",
      "city": "Peterborough",
      "state": "ON",
      "country": "Canada",
      "address": "2455 Base Line",
      "timestampUpdated": "1745528575",
      "distance": "",
      "courses": [
        {
          "courseID": "0121594060223987979",
          "courseName": "18-hole course",
          "numHoles": 18,
          "timestampUpdated": "1745528575",
          "hasGPS": 1
        }
      ]
    }
  ]
};

// Sample coordinates for Peterborough Golf and Country Club (truncated for brevity)
export const SAMPLE_PETERBOROUGH_COORDINATES = {
  "apiRequestsLeft": "15.9",
  "courseID": "0121318782152310",
  "numCoordinates": 128,
  "coordinates": [
    // Hole 1
    { "poi": 1, "location": 3, "sideFW": 2, "hole": 1, "latitude": 44.328396, "longitude": -78.307219 },
    { "poi": 1, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.3285222, "longitude": -78.3072008 },
    { "poi": 1, "location": 1, "sideFW": 2, "hole": 1, "latitude": 44.3286603, "longitude": -78.3072545 },
    { "poi": 6, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.329373, "longitude": -78.307508 },
    { "poi": 7, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.329708, "longitude": -78.307673 },
    { "poi": 8, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.330143, "longitude": -78.307752 },
    { "poi": 11, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.3308494, "longitude": -78.3077254 },
    { "poi": 12, "location": 2, "sideFW": 2, "hole": 1, "latitude": 44.3317521, "longitude": -78.3070855 },
    // Additional holes data would be included here...
  ]
};

// Default par values for 18 holes (standard golf course)
export const DEFAULT_PARS = [4, 4, 4, 3, 5, 4, 4, 5, 4, 4, 5, 3, 3, 4, 5, 3, 4, 4];

export class GolfDataImporter {
  constructor(apiKey?: string) {
    // API client would be used for live API calls
    if (apiKey) {
      // For future use with live API
    }
  }

  // Transform club and course data for database insertion
  transformClubData(club: GolfApiClub, course: GolfApiCourse, coordinates?: GolfApiCoordinate[]) {
    const holes = this.createHolesFromCoordinates(coordinates);

    return {
      externalId: course.courseID,
      clubName: club.clubName,
      courseName: course.courseName,
      address: club.address,
      city: club.city,
      state: club.state,
      country: club.country,
      courseId: course.courseID,
      numHoles: course.numHoles,
      hasGPS: course.hasGPS === 1,
      holes,
    };
  }

  // Create hole data from coordinates
  private createHolesFromCoordinates(coordinates?: GolfApiCoordinate[]) {
    if (!coordinates || coordinates.length === 0) {
      // Return default 18 holes without coordinates
      return Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: DEFAULT_PARS[i],
        coordinates: [],
      }));
    }

    // Group coordinates by hole
    const holesMap = new Map<number, any>();

    coordinates.forEach(coord => {
      if (!holesMap.has(coord.hole)) {
        holesMap.set(coord.hole, {
          holeNumber: coord.hole,
          par: DEFAULT_PARS[coord.hole - 1] || 4,
          coordinates: [],
        });
      }

      const hole = holesMap.get(coord.hole);
      const poiType = POI_TYPES[coord.poi as keyof typeof POI_TYPES] || 'unknown';
      hole.coordinates.push({
        type: poiType,
        location: coord.location,
        latitude: coord.latitude,
        longitude: coord.longitude,
        poi: coord.poi,
      });
    });

    // Convert to array and sort by hole number
    return Array.from(holesMap.values()).sort((a, b) => a.holeNumber - b.holeNumber);
  }

  // Get sample data for a specific course
  getSampleCourseData(courseId: string) {
    const club = SAMPLE_PETERBOROUGH_CLUBS.clubs.find(c => 
      c.courses.some(course => course.courseID === courseId)
    );

    if (!club) return null;

    const course = club.courses.find(c => c.courseID === courseId);
    if (!course) return null;

    // Use full coordinates for Peterborough Golf and Country Club
    const coordinates = courseId === "0121318782152310" 
      ? PETERBOROUGH_GOLF_COORDINATES.coordinates 
      : undefined;

    return this.transformClubData(club, course, coordinates);
  }

  // Get all sample courses
  getAllSampleCourses() {
    return SAMPLE_PETERBOROUGH_CLUBS.clubs.flatMap(club =>
      club.courses.map(course => {
        const coordinates = course.courseID === "0121318782152310" 
          ? PETERBOROUGH_GOLF_COORDINATES.coordinates 
          : undefined;
        return this.transformClubData(club, course, coordinates);
      })
    );
  }

  // Load full coordinates data (for Peterborough Golf and Country Club)
  getFullPeterboroughCoordinates() {
    return PETERBOROUGH_GOLF_COORDINATES;
  }
}