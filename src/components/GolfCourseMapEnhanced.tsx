import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { GoogleMap } from './GoogleMap';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Navigation, Target, Info, Flag, Circle } from 'lucide-react';
import { logger } from '@/utils/logger';
import { POI_TYPES, LOCATION_TYPES } from '@/utils/golfApiClient';

// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;

interface GolfCourseMapEnhancedProps {
  courseId: Id<'courses'>;
  currentHole?: number;
  playerLocation?: { lat: number; lng: number };
  onHoleSelect?: (holeNumber: number) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  className?: string;
  showPlayerLocation?: boolean;
  showHoleInfo?: boolean;
}

export const GolfCourseMapEnhanced: React.FC<GolfCourseMapEnhancedProps> = ({
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
            component: 'GolfCourseMapEnhanced',
            courseId,
            location,
          });
        },
        (error) => {
          setLocationError(error.message);
          logger.warn('Failed to get user location', {
            component: 'GolfCourseMapEnhanced',
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

  // Generate map markers based on real coordinate data
  const mapMarkers = useMemo(() => {
    if (!courseDetails || !courseDetails.holes) return [];

    const markers = [];
    const holesToShow = showAllHoles 
      ? courseDetails.holes 
      : courseDetails.holes.filter(h => h.holeNumber === selectedHole);

    holesToShow.forEach(hole => {
      if (!hole.coordinates) return;

      // Group coordinates by type
      const tees = hole.coordinates.filter(c => c.type === 'tee');
      const greenFront = hole.coordinates.find(c => c.type === 'green_front');
      const greenCenter = hole.coordinates.find(c => c.type === 'green_center');
      const hazards = hole.coordinates.filter(c => 
        ['hazard_start', 'hazard_middle', 'hazard_end'].includes(c.type)
      );

      // Add tee markers
      tees.forEach(tee => {
        const teeType = LOCATION_TYPES[tee.location as keyof typeof LOCATION_TYPES] || 'tee';
        markers.push({
          position: { lat: tee.latitude, lng: tee.longitude },
          title: `Hole ${hole.holeNumber} - ${teeType} tee`,
          info: `
            <div class="p-3 min-w-[200px]">
              <h3 class="font-bold text-lg mb-2">Hole ${hole.holeNumber}</h3>
              <div class="space-y-1 text-sm">
                <div><strong>Tee:</strong> ${teeType}</div>
                <div><strong>Par:</strong> ${hole.par}</div>
              </div>
            </div>
          `,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="${selectedHole === hole.holeNumber ? '#EF4444' : '#3B82F6'}" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">${hole.holeNumber}</text>
              </svg>
            `),
            scaledSize: { width: 32, height: 32 },
          },
        });
      });

      // Add green markers
      if (greenCenter) {
        markers.push({
          position: { lat: greenCenter.latitude, lng: greenCenter.longitude },
          title: `Hole ${hole.holeNumber} - Green`,
          info: `<div class="p-2"><strong>Hole ${hole.holeNumber}</strong><br/>Green Center</div>`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0L12 28" stroke="#DC2626" stroke-width="3" fill="none"/>
                <path d="M12 2L20 8L12 14Z" fill="#DC2626"/>
              </svg>
            `),
            scaledSize: { width: 24, height: 32 },
          },
        });
      }

      // Add hazard markers (simplified)
      if (hazards.length > 0 && !showAllHoles) {
        hazards.forEach((hazard, idx) => {
          markers.push({
            position: { lat: hazard.latitude, lng: hazard.longitude },
            title: `Hazard`,
            info: `<div class="p-2"><strong>Hazard</strong><br/>Be careful!</div>`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" fill="#F59E0B" stroke="white" stroke-width="2"/>
                  <text x="10" y="14" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">!</text>
                </svg>
              `),
              scaledSize: { width: 20, height: 20 },
            },
          });
        });
      }
    });

    // Add user location marker
    if (userLocation && showPlayerLocation) {
      markers.push({
        position: userLocation,
        title: 'Your Location',
        info: '<div class="p-2"><strong>Your Current Location</strong></div>',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
              <circle cx="10" cy="10" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: { width: 20, height: 20 },
        },
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
      // Center on the first tee of selected hole
      const firstTee = hole.coordinates.find(c => c.type === 'tee' && c.location === 1);
      if (firstTee) {
        return { lat: firstTee.latitude, lng: firstTee.longitude };
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
        zoom={showAllHoles ? 14 : 16}
        markers={mapMarkers}
        onMarkerClick={(marker, index) => {
          logger.debug('Map marker clicked', {
            component: 'GolfCourseMapEnhanced',
            markerIndex: index,
          });
        }}
        className="rounded-lg overflow-hidden"
        style={{ width: '100%', height: '450px' }}
        gestureHandling="greedy"
      />

      {/* Selected Hole Info */}
      {showHoleInfo && courseDetails.holes && (
        <Card>
          <CardHeader>
            <CardTitle>
              Hole {selectedHole} Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const hole = courseDetails.holes.find(h => h.holeNumber === selectedHole);
              if (!hole) return <p>No data available for this hole</p>;

              const teeCount = hole.coordinates?.filter(c => c.type === 'tee').length || 0;
              const hazardCount = hole.coordinates?.filter(c => c.type.includes('hazard')).length || 0;

              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Par:</strong> {hole.par}
                    </div>
                    <div>
                      <strong>Tee Boxes:</strong> {teeCount}
                    </div>
                    <div>
                      <strong>Hazards:</strong> {hazardCount > 0 ? hazardCount : 'None'}
                    </div>
                    <div>
                      <strong>GPS Points:</strong> {hole.coordinates?.length || 0}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GolfCourseMapEnhanced;