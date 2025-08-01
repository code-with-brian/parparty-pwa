import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, Navigation, Zap, Droplets, Satellite, Map } from 'lucide-react';
import { GoogleMap } from '../GoogleMap';
import { logger } from '@/utils/logger';

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
  // Optional GPS coordinates for real Google Maps integration
  gpsCoordinates?: {
    teeBox: { lat: number; lng: number };
    pin: { lat: number; lng: number };
    playerLocation?: { lat: number; lng: number };
    hazards?: Array<{ lat: number; lng: number; type: HazardData['type']; name: string }>;
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

  // Generate Google Maps markers if GPS coordinates are available
  const googleMapMarkers = gpsCoordinates ? [
    // Tee box marker
    {
      position: gpsCoordinates.teeBox,
      title: `Hole ${holeData.number} Tee`,
      info: `<div class="p-2"><strong>Hole ${holeData.number} Tee</strong><br/>Par ${holeData.par} • ${holeData.yardage} yards</div>`,
      icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    },
    // Pin marker
    {
      position: gpsCoordinates.pin,
      title: `Hole ${holeData.number} Pin`,
      info: `<div class="p-2"><strong>Hole ${holeData.number} Pin</strong><br/>${holeData.pinPosition.description}</div>`,
      icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    },
    // Player location marker
    ...(gpsCoordinates.playerLocation ? [{
      position: gpsCoordinates.playerLocation,
      title: 'Your Position',
      info: '<div class="p-2"><strong>Your Current Position</strong></div>',
      icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    }] : []),
    // Hazard markers
    ...(gpsCoordinates.hazards?.map(hazard => ({
      position: { lat: hazard.lat, lng: hazard.lng },
      title: hazard.name,
      info: `<div class="p-2"><strong>${hazard.name}</strong><br/>Type: ${hazard.type}</div>`,
      icon: hazard.type === 'water' ? 'https://maps.google.com/mapfiles/ms/icons/blue.png' : 
            hazard.type === 'bunker' ? 'https://maps.google.com/mapfiles/ms/icons/yellow.png' :
            'https://maps.google.com/mapfiles/ms/icons/tree.png',
    })) || []),
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