import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, Navigation, Zap, Droplets, Satellite, Map } from 'lucide-react';
import { GoogleMap } from '../GoogleMap';
import { logger } from '@/utils/logger';
import { POI_TYPES } from '@/utils/golfApiClient';

interface HazardData {
  type: 'water' | 'bunker' | 'trees' | 'rough';
  coordinates: { x: number; y: number; width: number; height: number };
  carryDistance?: number;
}

interface PinPosition {
  x: number;
  y: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

interface HoleData {
  number: number;
  par: number;
  yardage: number;
  teePosition: { x: number; y: number };
  pinPosition: PinPosition;
  fairwayPath: { x: number; y: number }[];
  hazards: HazardData[];
  greenContour: { x: number; y: number }[];
}

interface PlayerPosition {
  x: number;
  y: number;
  distanceToPin: number;
  club?: string;
}

interface HoleMapViewProps {
  holeData: HoleData;
  playerPosition: PlayerPosition;
  onPositionSelect?: (position: { x: number; y: number }) => void;
  onMapClick?: () => void;
  // GPS coordinates with enhanced POI data
  gpsCoordinates?: {
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
  };
}

export function HoleMapView({ holeData, playerPosition, onPositionSelect, onMapClick, gpsCoordinates }: HoleMapViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<{ x: number; y: number } | null>(null);
  const [mapMode, setMapMode] = useState<'satellite' | 'hybrid'>('satellite');

  const getHazardColor = (type: HazardData['type']) => {
    switch (type) {
      case 'water': return 'fill-blue-500/60 stroke-blue-400';
      case 'bunker': return 'fill-yellow-600/60 stroke-yellow-500';
      case 'trees': return 'fill-green-800/60 stroke-green-700';
      case 'rough': return 'fill-green-600/40 stroke-green-500';
      default: return 'fill-gray-500/40 stroke-gray-400';
    }
  };

  const getPinDifficultyColor = (difficulty: PinPosition['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const calculateDistance = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy) * 2; // Scale factor for yards
  };

  // Enhanced POI icon generator with meaningful graphics
  const createPOIIcon = (poiType: string, size: number = 28): any => {
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

  // Get meaningful POI info with proper styling
  const getPOIInfo = (poi: any): string => {
    const poiType = POI_TYPES[poi.poi as keyof typeof POI_TYPES] || 'unknown';
    const location = poi.location === 1 ? 'Front' : poi.location === 2 ? 'Middle' : 'Back';
    const side = poi.sideFW === 1 ? 'Left' : poi.sideFW === 2 ? 'Center' : 'Right';
    
    const getPOIDisplayName = (type: string): string => {
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
      return names[type] || type;
    };

    return `
      <div style="padding: 12px; min-width: 180px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #f9fafb;">${getPOIDisplayName(poiType)}</h3>
        <div style="font-size: 14px; line-height: 1.4;">
          <div style="margin-bottom: 4px; color: #d1d5db;"><strong style="color: #f9fafb;">Position:</strong> ${location} ${side !== 'Center' ? `(${side} side)` : ''}</div>
          ${poiType.includes('marker_') ? `<div style="color: #a855f7; font-weight: 500; margin-top: 6px;">📏 Distance marker</div>` : ''}
          ${poiType.includes('bunker') ? `<div style="color: #f59e0b; font-weight: 500; margin-top: 6px;">⚠️ Sand hazard</div>` : ''}
          ${poiType === 'water' ? `<div style="color: #3b82f6; font-weight: 500; margin-top: 6px;">💧 Water hazard</div>` : ''}
          ${poiType === 'trees' ? `<div style="color: #10b981; font-weight: 500; margin-top: 6px;">🌲 Tree line</div>` : ''}
          ${poiType === 'green' ? `<div style="color: #10b981; font-weight: 500; margin-top: 6px;">🎯 Target area</div>` : ''}
        </div>
      </div>
    `;
  };

  // Generate enhanced Google Maps markers with meaningful POI graphics
  const googleMapMarkers = gpsCoordinates ? [
    // Player location marker (highest priority)
    ...(gpsCoordinates.playerLocation ? [{
      position: gpsCoordinates.playerLocation,
      title: 'Your Position',
      info: '<div style="padding: 12px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;"><strong style="color: #f9fafb;">Your Current Position</strong><br/>📍 You are here</div>',
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
    }] : []),

    // Enhanced POI markers with meaningful graphics
    ...(gpsCoordinates.pois?.map(poi => {
      const poiType = POI_TYPES[poi.poi as keyof typeof POI_TYPES] || 'unknown';
      const location = poi.location === 1 ? 'Front' : poi.location === 2 ? 'Middle' : 'Back';
      const side = poi.sideFW === 1 ? 'Left' : poi.sideFW === 2 ? 'Center' : 'Right';
      
      const getPOIDisplayName = (type: string): string => {
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
        return names[type] || type;
      };

      return {
        position: { lat: poi.lat, lng: poi.lng },
        title: `${getPOIDisplayName(poiType)} - Hole ${holeData.number}`,
        info: getPOIInfo(poi),
        icon: createPOIIcon(poiType, 32),
        zIndex: poiType === 'green' ? 1500 : 1000,
      };
    }) || []),

    // Fallback tee and pin markers if no POI data
    ...(!gpsCoordinates.pois ? [
      {
        position: gpsCoordinates.teeBox,
        title: `Hole ${holeData.number} Tee`,
        info: `<div style="padding: 12px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong style="color: #f9fafb;">Hole ${holeData.number} Tee</strong><br/>Par ${holeData.par} • ${holeData.yardage} yards</div>`,
        icon: createPOIIcon('front_tee', 32),
        zIndex: 1000,
      },
      {
        position: gpsCoordinates.pin,
        title: `Hole ${holeData.number} Pin`,
        info: `<div style="padding: 12px; background: #1f2937; color: #f9fafb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong style="color: #f9fafb;">Hole ${holeData.number} Pin</strong><br/>${holeData.pinPosition.description}</div>`,
        icon: createPOIIcon('green', 32),
        zIndex: 1500,
      },
    ] : []),
  ] : [];

  // Determine map center for Google Maps
  const googleMapCenter = gpsCoordinates ? 
    gpsCoordinates.teeBox : 
    { lat: 39.8283, lng: -98.5795 };
    

  // Always show Google Maps if GPS coordinates are available
  const shouldShowGoogleMaps = !!gpsCoordinates;

  useEffect(() => {
    // Only log Google Maps initialization, not every render
    if (shouldShowGoogleMaps && Math.random() < 0.1) { // 10% chance to log
      logger.debug('Displaying Google Maps satellite view', {
        component: 'HoleMapView',
        hole: holeData.number,
        mapMode,
        hasGPS: !!gpsCoordinates,
      });
    }
  }, [shouldShowGoogleMaps, holeData.number, mapMode, gpsCoordinates]);

  return (
    <div 
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl cursor-pointer hover:bg-white/[0.05] transition-all"
      onClick={onMapClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
      
      <div className="relative p-4">
        {/* Map Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">Hole {holeData.number}</h3>
            <span className="text-xs text-slate-400">Par {holeData.par} • {holeData.yardage}y</span>
          </div>
          
          {gpsCoordinates && (
            <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMapMode('satellite');
                }}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  mapMode === 'satellite'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Satellite className="w-3 h-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMapMode('hybrid');
                }}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  mapMode === 'hybrid'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Satellite Map Display */}
        {shouldShowGoogleMaps ? (
          <div className="relative rounded-2xl overflow-hidden border border-green-500/20">
            <GoogleMap
              center={googleMapCenter}
              zoom={17}
              markers={googleMapMarkers}
              mapTypeId={mapMode === 'satellite' ? 'satellite' as any : 'hybrid' as any}
              onMapClick={(event) => {
                if (event.latLng) {
                  const lat = event.latLng.lat();
                  const lng = event.latLng.lng();
                  logger.debug('Google Maps clicked', {
                    component: 'HoleMapView',
                    lat,
                    lng,
                  });
                  // Convert GPS to local coordinates for compatibility
                  onPositionSelect?.({ x: lat * 1000, y: lng * 1000 });
                }
              }}
              style={{ width: '100%', height: '200px' }}
              gestureHandling="greedy"
              zoomControl={false}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
            />
          </div>
        ) : (
          /* No GPS Data Available */
          <div className="relative bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-500/20 h-48 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Satellite view not available</p>
              <p className="text-xs">GPS coordinates required</p>
            </div>
          </div>
        )}

        {/* Hazard Distances */}
        {holeData.hazards.some(h => h.carryDistance) && (
          <div className="mt-4 bg-white/[0.02] rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
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

      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/5 to-transparent blur-2xl -z-10" />
    </div>
  );
}