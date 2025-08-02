import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { GoogleMap } from './GoogleMap';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Navigation, Target, Info, Flag, Circle, AlertTriangle, TreePine, Waves, Route } from 'lucide-react';
import { logger } from '@/utils/logger';
import { POI_TYPES, LOCATION_TYPES } from '@/utils/golfApiClient';

// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;

interface GolfCourseMapMeaningfulProps {
  courseId: Id<'courses'>;
  currentHole?: number;
  playerLocation?: { lat: number; lng: number };
  onHoleSelect?: (holeNumber: number) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  className?: string;
  showPlayerLocation?: boolean;
  showHoleInfo?: boolean;
}

// Enhanced POI icon generators with meaningful graphics
const createPOIIcon = (poiType: string, size: number = 32): any => {
  const baseProps = {
    scaledSize: { width: size, height: size },
  };

  switch (poiType) {
    case 'green':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#22C55E" stroke="white" stroke-width="2"/>
            <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#16A34A" stroke="white" stroke-width="1"/>
            <path d="M${size/2} ${size/4}L${size/2} ${3*size/4}" stroke="white" stroke-width="2"/>
          </svg>
        `),
      };

    case 'green_bunker':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#FBBF24" stroke="white" stroke-width="2"/>
            <path d="M${size/4} ${size/2} Q${size/2} ${size/4} ${3*size/4} ${size/2} Q${size/2} ${3*size/4} ${size/4} ${size/2}" fill="#F59E0B"/>
            <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">B</text>
          </svg>
        `),
      };

    case 'fairway_bunker':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#F59E0B" stroke="white" stroke-width="2"/>
            <path d="M${size/4} ${size/2} Q${size/2} ${size/4} ${3*size/4} ${size/2} Q${size/2} ${3*size/4} ${size/4} ${size/2}" fill="#D97706"/>
            <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">B</text>
          </svg>
        `),
      };

    case 'water':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <path d="M${size/4} ${size/2} Q${size/3} ${size/3} ${size/2} ${size/2} Q${2*size/3} ${size/3} ${3*size/4} ${size/2} Q${2*size/3} ${2*size/3} ${size/2} ${size/2} Q${size/3} ${2*size/3} ${size/4} ${size/2}" fill="#1D4ED8"/>
            <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">~</text>
          </svg>
        `),
      };

    case 'trees':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#16A34A" stroke="white" stroke-width="2"/>
            <path d="M${size/2} ${size/4}L${size/4} ${3*size/4}L${3*size/4} ${3*size/4}Z" fill="#15803D"/>
            <rect x="${size/2 - 2}" y="${2*size/3}" width="4" height="${size/6}" fill="#92400E"/>
          </svg>
        `),
      };

    case 'marker_100':
    case 'marker_150':
    case 'marker_200':
      const yardage = poiType.split('_')[1];
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#8B5CF6" stroke="white" stroke-width="2"/>
            <text x="${size/2}" y="${size/2 + 3}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/5}" font-weight="bold">${yardage}</text>
          </svg>
        `),
      };

    case 'dogleg':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#EF4444" stroke="white" stroke-width="2"/>
            <path d="M${size/4} ${size/2}L${size/2} ${size/4}L${3*size/4} ${size/2}" stroke="white" stroke-width="2" fill="none"/>
            <path d="M${size/2} ${size/4}L${size/2 + 3} ${size/4 + 3}L${size/2 - 3} ${size/4 + 3}Z" fill="white"/>
          </svg>
        `),
      };

    case 'road':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#6B7280" stroke="white" stroke-width="2"/>
            <rect x="${size/4}" y="${size/2 - 2}" width="${size/2}" height="4" fill="#4B5563"/>
            <rect x="${size/2 - 1}" y="${size/2 - 1}" width="2" height="2" fill="white"/>
          </svg>
        `),
      };

    case 'front_tee':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#10B981" stroke="white" stroke-width="2"/>
            <rect x="${size/2 - 1}" y="${size/4}" width="2" height="${size/2}" fill="white"/>
            <circle cx="${size/2}" cy="${size/4 + 2}" r="3" fill="white"/>
            <text x="${size/2}" y="${3*size/4 + 2}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/6}" font-weight="bold">F</text>
          </svg>
        `),
      };

    case 'back_tee':
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#DC2626" stroke="white" stroke-width="2"/>
            <rect x="${size/2 - 1}" y="${size/4}" width="2" height="${size/2}" fill="white"/>
            <circle cx="${size/2}" cy="${size/4 + 2}" r="3" fill="white"/>
            <text x="${size/2}" y="${3*size/4 + 2}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/6}" font-weight="bold">B</text>
          </svg>
        `),
      };

    default:
      return {
        ...baseProps,
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#6B7280" stroke="white" stroke-width="2"/>
            <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">?</text>
          </svg>
        `),
      };
  }
};

// Enhanced POI information with proper styling
const getPOIInfo = (poi: any, hole: any): string => {
  const poiType = POI_TYPES[poi.poi as keyof typeof POI_TYPES] || 'unknown';
  const location = poi.location === 1 ? 'Front' : poi.location === 2 ? 'Middle' : 'Back';
  const side = poi.sideFW === 1 ? 'Left' : poi.sideFW === 2 ? 'Center' : 'Right';
  
  const baseInfo = `
    <div style="padding: 12px; min-width: 200px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #f9fafb;">Hole ${hole.holeNumber}</h3>
      <div style="font-size: 14px; line-height: 1.4;">
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Feature:</strong> ${getPOIDisplayName(poiType)}</div>
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Position:</strong> ${location} ${side !== 'Center' ? `(${side} side)` : ''}</div>
  `;

  switch (poiType) {
    case 'green':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Par:</strong> ${hole.par}</div>
        <div style="color: #10b981; font-weight: 500; margin-top: 6px;">🎯 Target the pin!</div>
      </div></div>`;

    case 'green_bunker':
    case 'fairway_bunker':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Hazard:</strong> Sand Bunker</div>
        <div style="color: #f59e0b; font-weight: 500; margin-top: 6px;">⚠️ Avoid if possible</div>
      </div></div>`;

    case 'water':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Hazard:</strong> Water</div>
        <div style="color: #3b82f6; font-weight: 500; margin-top: 6px;">💧 Penalty stroke if hit</div>
      </div></div>`;

    case 'trees':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Hazard:</strong> Trees</div>
        <div style="color: #10b981; font-weight: 500; margin-top: 6px;">🌲 Play around or over</div>
      </div></div>`;

    case 'marker_100':
    case 'marker_150':
    case 'marker_200':
      const yardage = poiType.split('_')[1];
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Distance:</strong> ${yardage} yards to green</div>
        <div style="color: #a855f7; font-weight: 500; margin-top: 6px;">📏 Distance marker</div>
      </div></div>`;

    case 'dogleg':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Feature:</strong> Dogleg turn</div>
        <div style="color: #ef4444; font-weight: 500; margin-top: 6px;">↻ Strategic position</div>
      </div></div>`;

    case 'road':
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Feature:</strong> Cart path/Road</div>
        <div style="color: #6b7280; font-weight: 500; margin-top: 6px;">🛣️ Out of bounds</div>
      </div></div>`;

    case 'front_tee':
    case 'back_tee':
      const teeType = poiType === 'front_tee' ? 'Forward/Red' : 'Championship/Black';
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Tee:</strong> ${teeType}</div>
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Par:</strong> ${hole.par}</div>
        <div style="color: #14b8a6; font-weight: 500; margin-top: 6px;">🏌️ Starting position</div>
      </div></div>`;

    default:
      return baseInfo + `
        <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Type:</strong> Unknown</div>
      </div></div>`;
  }
};

const getPOIDisplayName = (poiType: string): string => {
  const names: Record<string, string> = {
    green: 'Green',
    green_bunker: 'Greenside Bunker',
    fairway_bunker: 'Fairway Bunker',
    water: 'Water Hazard',
    trees: 'Trees',
    marker_100: '100 Yard Marker',
    marker_150: '150 Yard Marker',
    marker_200: '200 Yard Marker',
    dogleg: 'Dogleg',
    road: 'Cart Path/Road',
    front_tee: 'Forward Tee',
    back_tee: 'Championship Tee',
  };
  return names[poiType] || poiType;
};

export const GolfCourseMapMeaningful: React.FC<GolfCourseMapMeaningfulProps> = ({
  courseId,
  currentHole = 1,
  playerLocation,
  onHoleSelect,
  onLocationUpdate,
  className = '',
  showPlayerLocation = true,
  showHoleInfo = true,
}) => {
  const [selectedHole, setSelectedHole] = useState<number>(currentHole);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showAllHoles, setShowAllHoles] = useState(false);

  // Fetch course details with holes and coordinates
  const courseDetails = useQuery(api.golfCourses.getCourseDetails, { courseId });

  // Get user's current location
  useEffect(() => {
    if (showPlayerLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          onLocationUpdate?.(location);
          
          logger.info('User location obtained', {
            component: 'GolfCourseMapMeaningful',
            courseId,
            location,
          });
        },
        (error) => {
          setLocationError(error.message);
          logger.warn('Failed to get user location', {
            component: 'GolfCourseMapMeaningful',
            error: error.message,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  }, [showPlayerLocation, onLocationUpdate, courseId]);

  // Generate enhanced map markers with meaningful graphics
  const mapMarkers = useMemo(() => {
    if (!courseDetails || !courseDetails.holes) return [];

    const markers = [];
    const holesToShow = showAllHoles 
      ? courseDetails.holes 
      : courseDetails.holes.filter(h => h.holeNumber === selectedHole);

    holesToShow.forEach(hole => {
      if (!hole.coordinates) return;

      // Group coordinates by POI type for better organization
      hole.coordinates.forEach(coord => {
        const poiType = POI_TYPES[coord.poi as keyof typeof POI_TYPES] || 'unknown';
        
        markers.push({
          position: { lat: coord.latitude, lng: coord.longitude },
          title: `${getPOIDisplayName(poiType)} - Hole ${hole.holeNumber}`,
          info: getPOIInfo(coord, hole),
          icon: createPOIIcon(poiType, selectedHole === hole.holeNumber ? 36 : 28),
          zIndex: selectedHole === hole.holeNumber ? 1000 : 100,
        });
      });
    });

    // Add user location marker
    if (userLocation && showPlayerLocation) {
      markers.push({
        position: userLocation,
        title: 'Your Location',
        info: '<div style="padding: 12px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;"><strong style="color: #f9fafb;">Your Current Location</strong><br/>📍 You are here</div>',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
              <circle cx="12" cy="12" r="2" fill="#3B82F6"/>
            </svg>
          `),
          scaledSize: { width: 24, height: 24 },
        },
        zIndex: 2000,
      });
    }

    return markers;
  }, [courseDetails, selectedHole, showAllHoles, userLocation, showPlayerLocation]);

  // Calculate map center based on selected hole
  const mapCenter = useMemo(() => {
    if (!courseDetails || !courseDetails.holes) {
      return { lat: 44.330, lng: -78.306 }; // Default to Peterborough area
    }

    const hole = courseDetails.holes.find(h => h.holeNumber === selectedHole);
    if (hole && hole.coordinates && hole.coordinates.length > 0) {
      // Center on the green or first available coordinate
      const green = hole.coordinates.find(c => c.poi === 1);
      if (green) {
        return { lat: green.latitude, lng: green.longitude };
      }
      // Fallback to first coordinate
      return { lat: hole.coordinates[0].latitude, lng: hole.coordinates[0].longitude };
    }

    // Fallback to course center (average of all coordinates)
    let totalLat = 0, totalLng = 0, count = 0;
    courseDetails.holes.forEach(hole => {
      if (hole.coordinates) {
        hole.coordinates.forEach(coord => {
          totalLat += coord.latitude;
          totalLng += coord.longitude;
          count++;
        });
      }
    });

    if (count > 0) {
      return { lat: totalLat / count, lng: totalLng / count };
    }

    return { lat: 44.330, lng: -78.306 };
  }, [courseDetails, selectedHole]);

  const handleHoleChange = (holeNumber: string) => {
    const hole = parseInt(holeNumber);
    setSelectedHole(hole);
    onHoleSelect?.(hole);
  };

  if (!courseDetails) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const selectedHoleData = courseDetails.holes?.find(h => h.holeNumber === selectedHole);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Course Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            {courseDetails.clubName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {courseDetails.name} • {courseDetails.city}, {courseDetails.state}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Hole selector */}
            <Select value={selectedHole.toString()} onValueChange={handleHoleChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courseDetails.holes?.map(hole => (
                  <SelectItem key={hole.holeNumber} value={hole.holeNumber.toString()}>
                    Hole {hole.holeNumber} • Par {hole.par}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllHoles(!showAllHoles)}
            >
              {showAllHoles ? 'Show Current Hole' : 'Show All Holes'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    });
                  },
                  (error) => setLocationError(error.message)
                );
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Update Location
            </Button>
          </div>

          <div className="text-sm text-gray-600 flex items-center gap-4">
            <div className="flex items-center">
              <Info className="w-4 h-4 mr-1" />
              {courseDetails.totalHoles} holes • Par {courseDetails.totalPar}
            </div>
            {courseDetails.hasGPS && (
              <div className="flex items-center text-green-600">
                <Navigation className="w-4 h-4 mr-1" />
                GPS Enabled
              </div>
            )}
          </div>

          {locationError && (
            <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Location access: {locationError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Map */}
      <GoogleMap
        center={mapCenter}
        zoom={showAllHoles ? 14 : 17}
        markers={mapMarkers}
        onMarkerClick={(marker, index) => {
          logger.debug('Map marker clicked', {
            component: 'GolfCourseMapMeaningful',
            markerIndex: index,
          });
        }}
        className="rounded-lg overflow-hidden"
        style={{ width: '100%', height: '500px' }}
        gestureHandling="greedy"
        mapTypeId="hybrid"
      />

      {/* Selected Hole POI Legend */}
      {showHoleInfo && selectedHoleData && selectedHoleData.coordinates && (
        <Card>
          <CardHeader>
            <CardTitle>
              Hole {selectedHole} Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(new Set(selectedHoleData.coordinates.map(c => c.poi))).map(poiType => {
                const poiName = POI_TYPES[poiType as keyof typeof POI_TYPES] || 'unknown';
                const count = selectedHoleData.coordinates!.filter(c => c.poi === poiType).length;
                
                return (
                  <div key={poiType} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundImage: `url(${createPOIIcon(poiName, 24).url})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{getPOIDisplayName(poiName)}</div>
                      <div className="text-gray-500">{count} marker{count > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GolfCourseMapMeaningful;