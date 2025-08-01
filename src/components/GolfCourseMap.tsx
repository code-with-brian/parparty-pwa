import React, { useState, useEffect } from 'react';
import { GoogleMap } from './GoogleMap';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MapPin, Navigation, Target, Info } from 'lucide-react';
import { logger } from '@/utils/logger';

interface HoleLocation {
  holeNumber: number;
  teeBox: { lat: number; lng: number };
  pin: { lat: number; lng: number };
  par: number;
  yardage: number;
  description?: string;
}

interface GolfCourseMapProps {
  courseId?: string;
  courseName?: string;
  courseLocation?: { lat: number; lng: number };
  holes?: HoleLocation[];
  currentHole?: number;
  playerLocation?: { lat: number; lng: number };
  onHoleSelect?: (holeNumber: number) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  className?: string;
  showPlayerLocation?: boolean;
  showHoleInfo?: boolean;
}

export const GolfCourseMap: React.FC<GolfCourseMapProps> = ({
  courseId,
  courseName = 'Golf Course',
  courseLocation,
  holes = [],
  currentHole,
  playerLocation,
  onHoleSelect,
  onLocationUpdate,
  className = '',
  showPlayerLocation = true,
  showHoleInfo = true,
}) => {
  const [selectedHole, setSelectedHole] = useState<HoleLocation | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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
            component: 'GolfCourseMap',
            courseId,
            location,
          });
        },
        (error) => {
          setLocationError(error.message);
          logger.warn('Failed to get user location', {
            component: 'GolfCourseMap',
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

  // Generate map markers for holes
  const mapMarkers = [
    // Course location marker
    ...(courseLocation ? [{
      position: courseLocation,
      title: courseName,
      info: `<div class="p-2"><strong>${courseName}</strong><br/>Golf Course</div>`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
            <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">⛳</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
      },
    }] : []),
    
    // Hole markers
    ...holes.map(hole => ({
      position: hole.teeBox,
      title: `Hole ${hole.holeNumber} - Par ${hole.par}`,
      info: `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-lg mb-2">Hole ${hole.holeNumber}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>Par:</strong> ${hole.par}</div>
            <div><strong>Yardage:</strong> ${hole.yardage} yards</div>
            ${hole.description ? `<div><strong>Description:</strong> ${hole.description}</div>` : ''}
          </div>
          <button 
            onclick="window.selectHole(${hole.holeNumber})" 
            class="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Select Hole
          </button>
        </div>
      `,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${currentHole === hole.holeNumber ? '#EF4444' : '#3B82F6'}" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">${hole.holeNumber}</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
      },
    })),

    // Pin markers for holes
    ...holes.map(hole => ({
      position: hole.pin,
      title: `Hole ${hole.holeNumber} Pin`,
      info: `<div class="p-2"><strong>Hole ${hole.holeNumber} Pin</strong><br/>Target location</div>`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L12 22M8 6L16 6" stroke="#DC2626" stroke-width="2" fill="none"/>
            <circle cx="12" cy="6" r="2" fill="#DC2626"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
      },
    })),

    // User location marker
    ...(userLocation && showPlayerLocation ? [{
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
        scaledSize: new google.maps.Size(20, 20),
      },
    }] : []),

    // Player location from props
    ...(playerLocation && !userLocation ? [{
      position: playerLocation,
      title: 'Player Location',
      info: '<div class="p-2"><strong>Player Location</strong></div>',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#10B981" stroke="white" stroke-width="2"/>
            <circle cx="10" cy="10" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(20, 20),
      },
    }] : []),
  ];

  // Determine map center
  const mapCenter = courseLocation || 
    (holes.length > 0 ? holes[0].teeBox : { lat: 39.8283, lng: -98.5795 });

  // Add global function for hole selection from info windows
  useEffect(() => {
    (window as any).selectHole = (holeNumber: number) => {
      const hole = holes.find(h => h.holeNumber === holeNumber);
      if (hole) {
        setSelectedHole(hole);
        onHoleSelect?.(holeNumber);
      }
    };

    return () => {
      delete (window as any).selectHole;
    };
  }, [holes, onHoleSelect]);

  const handleGetDirections = () => {
    if (selectedHole && userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${selectedHole.teeBox.lat},${selectedHole.teeBox.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Course Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            {courseName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
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
            
            {selectedHole && userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetDirections}
              >
                <Target className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            )}

            {holes.length > 0 && (
              <div className="text-sm text-gray-600 flex items-center">
                <Info className="w-4 h-4 mr-1" />
                {holes.length} holes mapped
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
        zoom={15}
        markers={mapMarkers}
        onMarkerClick={(marker, index) => {
          // Handle marker clicks
          logger.debug('Map marker clicked', {
            component: 'GolfCourseMap',
            markerIndex: index,
          });
        }}
        className="rounded-lg overflow-hidden"
        style={{ width: '100%', height: '400px' }}
        gestureHandling="greedy"
      />

      {/* Selected Hole Info */}
      {selectedHole && showHoleInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Hole {selectedHole.holeNumber} - Par {selectedHole.par}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Yardage:</strong> {selectedHole.yardage} yards
              </div>
              <div>
                <strong>Par:</strong> {selectedHole.par}
              </div>
            </div>
            {selectedHole.description && (
              <p className="mt-2 text-gray-600">{selectedHole.description}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GolfCourseMap;