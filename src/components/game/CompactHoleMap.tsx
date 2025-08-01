import React from 'react';
import { GoogleMap } from '../GoogleMap';
import { MapPin, Target, Zap } from 'lucide-react';
import { logger } from '@/utils/logger';

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
  hazards?: Array<{ lat: number; lng: number; type: string; name: string }>;
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

  // Generate Google Maps markers for the compact view
  const mapMarkers = [
    // Tee box marker
    {
      position: gpsCoordinates.teeBox,
      title: `Hole ${holeData.number} Tee`,
      info: `<div class="p-2"><strong>Hole ${holeData.number} Tee</strong><br/>Par ${holeData.par} • ${holeData.yardage} yards</div>`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#10B981" stroke="white" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-family="Arial" font-size="8" font-weight="bold">T</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
      },
    },
    // Pin marker
    {
      position: gpsCoordinates.pin,
      title: `Hole ${holeData.number} Pin`,
      info: `<div class="p-2"><strong>Hole ${holeData.number} Pin</strong><br/>Target location</div>`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2L10 18M6 6L14 6" stroke="#DC2626" stroke-width="2" fill="none"/>
            <circle cx="10" cy="6" r="2" fill="#DC2626"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(20, 20),
      },
    },
    // Player location marker
    ...(gpsCoordinates.playerLocation ? [{
      position: gpsCoordinates.playerLocation,
      title: 'Your Position',
      info: '<div class="p-2"><strong>Your Current Position</strong></div>',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <circle cx="8" cy="8" r="2" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(16, 16),
      },
    }] : []),
  ];

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
          markers={mapMarkers}
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