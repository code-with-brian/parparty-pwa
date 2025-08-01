// Golf API Client for golfapi.io integration
// Handles fetching clubs and course coordinates data

export interface GolfApiClub {
  clubID: string;
  clubName: string;
  city: string;
  state: string;
  country: string;
  address: string;
  timestampUpdated: string;
  distance: string;
  courses: GolfApiCourse[];
}

export interface GolfApiCourse {
  courseID: string;
  courseName: string;
  numHoles: number;
  timestampUpdated: string;
  hasGPS: number;
}

export interface GolfApiCoordinate {
  poi: number;
  location: number;
  sideFW: number;
  hole: number;
  latitude: number;
  longitude: number;
}

export interface GolfApiClubsResponse {
  apiRequestsLeft: string;
  numClubs: number;
  numAllClubs: number;
  clubs: GolfApiClub[];
}

export interface GolfApiCoordinatesResponse {
  apiRequestsLeft: string;
  courseID: string;
  numCoordinates: number;
  coordinates: GolfApiCoordinate[];
}

// POI (Point of Interest) types
export const POI_TYPES = {
  1: 'tee',
  3: 'fairway_marker',
  6: 'hazard_start',
  7: 'hazard_middle',
  8: 'hazard_end',
  11: 'green_front',
  12: 'green_center',
} as const;

// Location types for tee boxes
export const LOCATION_TYPES = {
  1: 'championship',
  2: 'regular',
  3: 'forward',
} as const;

export class GolfApiClient {
  private baseUrl = 'https://www.golfapi.io/api/v2.3';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key and other params
    url.searchParams.append('key', this.apiKey);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Golf API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getClubsByLocation(country: string, state?: string, city?: string): Promise<GolfApiClubsResponse> {
    const params: Record<string, string> = { country };
    if (state) params.state = state;
    if (city) params.city = city;

    return this.fetch<GolfApiClubsResponse>('/clubs', params);
  }

  async getClubsNearby(latitude: number, longitude: number, radius: number = 50): Promise<GolfApiClubsResponse> {
    return this.fetch<GolfApiClubsResponse>('/clubs', {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
    });
  }

  async getCourseCoordinates(courseID: string): Promise<GolfApiCoordinatesResponse> {
    return this.fetch<GolfApiCoordinatesResponse>(`/coordinates/${courseID}`);
  }

  // Transform Golf API data to match our schema
  transformClubToSchema(club: GolfApiClub, course: GolfApiCourse) {
    return {
      name: club.clubName,
      address: club.address,
      city: club.city,
      state: club.state,
      country: club.country,
      externalId: club.clubID,
      courseId: course.courseID,
      courseName: course.courseName,
      numHoles: course.numHoles,
      hasGPS: course.hasGPS === 1,
    };
  }

  // Transform coordinates to our hole data structure
  transformCoordinatesToHoles(coordinates: GolfApiCoordinate[]) {
    const holesMap = new Map<number, any>();

    coordinates.forEach(coord => {
      if (!holesMap.has(coord.hole)) {
        holesMap.set(coord.hole, {
          holeNumber: coord.hole,
          par: 4, // Default par, should be fetched from another endpoint
          coordinates: [],
        });
      }

      const hole = holesMap.get(coord.hole);
      hole.coordinates.push({
        type: POI_TYPES[coord.poi as keyof typeof POI_TYPES] || 'unknown',
        location: coord.location,
        latitude: coord.latitude,
        longitude: coord.longitude,
        poi: coord.poi,
      });
    });

    return Array.from(holesMap.values()).sort((a, b) => a.holeNumber - b.holeNumber);
  }
}

// Helper function to parse the POI type
export function getPOIDescription(poi: number, location?: number): string {
  const poiType = POI_TYPES[poi as keyof typeof POI_TYPES];
  
  if (poiType === 'tee' && location) {
    const locType = LOCATION_TYPES[location as keyof typeof LOCATION_TYPES];
    return `${locType} tee`;
  }
  
  return poiType || 'unknown';
}