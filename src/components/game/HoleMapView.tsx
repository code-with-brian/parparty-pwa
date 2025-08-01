import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, Navigation, Zap, Droplets } from 'lucide-react';

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
}

export function HoleMapView({ holeData, playerPosition, onPositionSelect, onMapClick }: HoleMapViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<{ x: number; y: number } | null>(null);
  const [mapMode, setMapMode] = useState<'overview' | 'green' | '3d'>('overview');

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

  return (
    <div 
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl cursor-pointer hover:bg-white/[0.05] transition-all"
      onClick={onMapClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
      
      <div className="relative p-4">

        {/* Interactive Hole Map */}
        <div className="relative bg-green-900/20 rounded-2xl overflow-hidden border border-green-500/20">
          <svg
            viewBox="0 0 400 300"
            className="w-full h-48"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the full screen map
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 400;
              const y = ((e.clientY - rect.top) / rect.height) * 300;
              setSelectedTarget({ x, y });
              onPositionSelect?.({ x, y });
            }}
          >
            {/* Fairway */}
            <path
              d={`M ${holeData.fairwayPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
              className="fill-green-600/40 stroke-green-500/60"
              strokeWidth="2"
            />
            
            {/* Green */}
            <ellipse
              cx={holeData.pinPosition.x}
              cy={holeData.pinPosition.y}
              rx="25"
              ry="20"
              className="fill-green-500/30 stroke-green-400"
              strokeWidth="2"
            />
            
            {/* Hazards */}
            {holeData.hazards.map((hazard, index) => (
              <g key={index}>
                <rect
                  x={hazard.coordinates.x}
                  y={hazard.coordinates.y}
                  width={hazard.coordinates.width}
                  height={hazard.coordinates.height}
                  className={getHazardColor(hazard.type)}
                  strokeWidth="1"
                  rx="4"
                />
                {hazard.carryDistance && (
                  <text
                    x={hazard.coordinates.x + hazard.coordinates.width / 2}
                    y={hazard.coordinates.y + hazard.coordinates.height / 2}
                    className="fill-white text-xs font-mono"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {hazard.carryDistance}y
                  </text>
                )}
              </g>
            ))}
            
            {/* Tee Box */}
            <rect
              x={holeData.teePosition.x - 8}
              y={holeData.teePosition.y - 4}
              width="16"
              height="8"
              className="fill-slate-600 stroke-slate-500"
              strokeWidth="1"
              rx="2"
            />
            
            {/* Pin */}
            <g>
              <circle
                cx={holeData.pinPosition.x}
                cy={holeData.pinPosition.y}
                r="3"
                className="fill-yellow-400"
              />
              <line
                x1={holeData.pinPosition.x}
                y1={holeData.pinPosition.y - 15}
                x2={holeData.pinPosition.x}
                y2={holeData.pinPosition.y}
                className="stroke-yellow-400"
                strokeWidth="1"
              />
            </g>
            
            {/* Player Position */}
            <g>
              <circle
                cx={playerPosition.x}
                cy={playerPosition.y}
                r="6"
                className="fill-cyan-400 animate-pulse"
              />
              <circle
                cx={playerPosition.x}
                cy={playerPosition.y}
                r="12"
                className="fill-none stroke-cyan-400 stroke-2 opacity-50 animate-ping"
              />
            </g>
            
            {/* Distance Line */}
            <line
              x1={playerPosition.x}
              y1={playerPosition.y}
              x2={holeData.pinPosition.x}
              y2={holeData.pinPosition.y}
              className="stroke-cyan-400/50 stroke-dashed stroke-1"
            />
            
            {/* Selected Target */}
            {selectedTarget && (
              <g>
                <circle
                  cx={selectedTarget.x}
                  cy={selectedTarget.y}
                  r="8"
                  className="fill-none stroke-red-400 stroke-2 animate-pulse"
                />
                <text
                  x={selectedTarget.x}
                  y={selectedTarget.y - 15}
                  className="fill-white text-xs font-mono"
                  textAnchor="middle"
                >
                  {Math.round(calculateDistance(playerPosition, selectedTarget))}y
                </text>
              </g>
            )}
          </svg>
        </div>


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