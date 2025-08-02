import React from 'react';
import { GoogleMap } from '../GoogleMap';
import { MapPin, Target, Zap } from 'lucide-react';
import { logger } from '@/utils/logger';
import { POI_TYPES } from '@/utils/golfApiClient';

interface HazardData {
  type: 'water' | 'bunker' | 'trees' | 'rough';
  carryDistance?: number;
  name: string;
}

interface HoleData {
  number: number;
  par: number;
  yardage: number;
  hazards?: HazardData[];
}

interface GPSCoordinates {
  teeBox: { lat: number; lng: number };
  pin: { lat: number; lng: number };
  playerLocation?: { lat: number; lng: number };
  pois?: Array<{ 
    lat: number; 
    lng: number; 
    poi: number; // POI type (1-12)
    location: number; // Position (1-3)
    sideFW: number; // Fairway side (1-3)
  }>;
}

interface CompactHoleMapProps {
  holeData: HoleData;
  gpsCoordinates?: GPSCoordinates;
  distanceToPin?: number;
  className?: string;
  onMapClick?: () => void;
}

export const CompactHoleMap: React.FC<CompactHoleMapProps> = ({
  holeData,
  gpsCoordinates,
  distanceToPin,
  className = '',
  onMapClick,
}) => {
  if (!gpsCoordinates) {
    return null; // Don't show anything if no GPS data
  }

  // Enhanced POI icon creation for compact view
  const createCompactPOIIcon = (poiType: string, size: number = 20): any => {
    const baseProps = {
      scaledSize: { width: size, height: size },
    };

    switch (poiType) {
      case 'green':
        return {
          ...baseProps,
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="#22C55E" stroke="white" stroke-width="1"/>
              <path d="M${size/2} ${size/3}L${size/2} ${2*size/3}" stroke="white" stroke-width="1"/>
            </svg>
          `),
        };
      case 'water':
        return {
          ...baseProps,
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="#3B82F6" stroke="white" stroke-width="1"/>
              <text x="${size/2}" y="${size/2 + 2}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/3}" font-weight="bold">~</text>
            </svg>
          `),
        };
      case 'fairway_bunker':
      case 'green_bunker':
        return {
          ...baseProps,
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="#F59E0B" stroke="white" stroke-width="1"/>
              <text x="${size/2}" y="${size/2 + 2}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/3}" font-weight="bold">B</text>
            </svg>
          `),
        };
      default:
        return {
          ...baseProps,
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="#6B7280" stroke="white" stroke-width="1"/>
            </svg>
          `),
        };
    }
  };

  // Generate enhanced Google Maps markers for the compact view
  const getMapMarkers = () => {
    const markers = [];

    // Add enhanced POI markers if available
    if (gpsCoordinates.pois) {
      gpsCoordinates.pois.forEach(poi => {
        const poiType = POI_TYPES[poi.poi as keyof typeof POI_TYPES] || 'unknown';
        markers.push({
          position: { lat: poi.lat, lng: poi.lng },
          title: `${poiType} - Hole ${holeData.number}`,
          info: `<div style="padding: 8px; background: #1f2937; color: #f9fafb; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong style="color: #f9fafb;">${poiType}</strong><br/>Hole ${holeData.number}</div>`,
          icon: createCompactPOIIcon(poiType, 20),
        });
      });
    } else {
      // Fallback to basic tee and pin markers
      markers.push(
        {
          position: gpsCoordinates.teeBox,
          title: `Hole ${holeData.number} Tee`,
          info: `<div style="padding: 8px; background: #1f2937; color: #f9fafb; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong style="color: #f9fafb;">Hole ${holeData.number} Tee</strong><br/>Par ${holeData.par} • ${holeData.yardage} yards</div>`,
          icon: createCompactPOIIcon('front_tee', 20),
        },
        {
          position: gpsCoordinates.pin,
          title: `Hole ${holeData.number} Pin`,
          info: `<div style="padding: 8px; background: #1f2937; color: #f9fafb; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong style="color: #f9fafb;">Hole ${holeData.number} Pin</strong><br/>Target location</div>`,
          icon: createCompactPOIIcon('green', 20),
        }
      );
    }

    // Player location marker
    if (gpsCoordinates.playerLocation) {
      markers.push({
        position: gpsCoordinates.playerLocation,
        title: 'Your Position',
        info: '<div style="padding: 8px; background: #1f2937; color: #f9fafb; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;"><strong style="color: #f9fafb;">Your Current Position</strong></div>',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" fill="#3B82F6" stroke="white" stroke-width="2"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          `),
          scaledSize: { width: 16, height: 16 },
        },
      });
    }

    return markers;
  };

  const mapCenter = gpsCoordinates.teeBox;

  const handleMapClick = () => {
    logger.debug('Compact hole map clicked', {
      component: 'CompactHoleMap',
      hole: holeData.number,
    });
    onMapClick?.();
  };

  return (
    <div className={`relative bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 ${className}`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Hole {holeData.number}</span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-400">{holeData.yardage}y</span>
        </div>
        
        {distanceToPin && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">{distanceToPin}y</span>
          </div>
        )}
      </div>

      {/* Compact Google Map */}
      <div 
        className="relative rounded-xl overflow-hidden border border-green-500/30 cursor-pointer hover:border-green-500/50 transition-colors"
        onClick={handleMapClick}
      >
        <GoogleMap
          center={mapCenter}
          zoom={16}
          markers={getMapMarkers()}
          mapTypeId="satellite"
          style={{ width: '100%', height: '120px' }}
          gestureHandling="none"
          zoomControl={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          disableDefaultUI={true}
        />
        
        {/* Overlay for click indication */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs">
            Tap to expand
          </div>
        </div>
      </div>

      {/* Carry Distances */}
      {holeData.hazards && holeData.hazards.some(h => h.carryDistance) && (
        <div className="mt-4 bg-white/[0.03] backdrop-blur-sm rounded-xl p-3 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Carry Distances</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {holeData.hazards
              .filter(h => h.carryDistance)
              .map((hazard, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    hazard.type === 'water' ? 'bg-blue-400' :
                    hazard.type === 'bunker' ? 'bg-yellow-500' :
                    'bg-green-600'
                  }`} />
                  <span className="text-white font-mono">{hazard.carryDistance}y</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactHoleMap;