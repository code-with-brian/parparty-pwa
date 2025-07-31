import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, Crosshair, Navigation2, Zap } from 'lucide-react';

interface RangefinderTarget {
  name: string;
  distance: number;
  bearing: number;
  type: 'pin' | 'front' | 'middle' | 'back' | 'hazard' | 'layup';
  elevation?: number;
}

interface GPSRangefinderProps {
  currentPosition: { lat: number; lng: number };
  targets: RangefinderTarget[];
  selectedTarget?: string;
  onTargetSelect?: (targetName: string) => void;
  accuracy: 'high' | 'medium' | 'low';
}

export function GPSRangefinder({ 
  currentPosition, 
  targets, 
  selectedTarget, 
  onTargetSelect,
  accuracy = 'high' 
}: GPSRangefinderProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>('compact');

  const primaryTarget = targets.find(t => t.name === selectedTarget) || targets.find(t => t.type === 'pin');
  
  const getTargetIcon = (type: RangefinderTarget['type']) => {
    switch (type) {
      case 'pin': return '📍';
      case 'front': return '⬆️';
      case 'middle': return '🎯';
      case 'back': return '⬇️';
      case 'hazard': return '⚠️';
      case 'layup': return '🎯';
      default: return '📍';
    }
  };

  const getTargetColor = (type: RangefinderTarget['type']) => {
    switch (type) {
      case 'pin': return 'text-yellow-400';
      case 'front': return 'text-green-400';
      case 'middle': return 'text-cyan-400';
      case 'back': return 'text-blue-400';
      case 'hazard': return 'text-red-400';
      case 'layup': return 'text-purple-400';
      default: return 'text-white';
    }
  };

  const getAccuracyIndicator = () => {
    switch (accuracy) {
      case 'high': return { color: 'text-green-400', symbol: '●●●', text: 'GPS: ±1yd' };
      case 'medium': return { color: 'text-yellow-400', symbol: '●●○', text: 'GPS: ±3yd' };
      case 'low': return { color: 'text-red-400', symbol: '●○○', text: 'GPS: ±5yd' };
    }
  };

  const accuracyInfo = getAccuracyIndicator();

  const formatBearing = (bearing: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="relative overflow-hidden bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10" />
      
      <div className="relative p-4">
        {/* Rangefinder Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg relative">
              <Crosshair className="w-5 h-5 text-white" />
              {isLocating && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/50"
                  animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <h3 className="text-lg font-light text-white tracking-tight">GPS Rangefinder</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${accuracyInfo.color}`}>{accuracyInfo.symbol}</span>
                <span className="text-xs text-slate-400">{accuracyInfo.text}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setDisplayMode(displayMode === 'compact' ? 'detailed' : 'compact')}
            className="px-3 py-1 bg-white/10 rounded-lg text-xs text-white hover:bg-white/20 transition-all"
          >
            {displayMode === 'compact' ? 'DETAIL' : 'COMPACT'}
          </button>
        </div>

        {displayMode === 'compact' ? (
          /* Compact Rangefinder Display */
          <div className="space-y-3">
            {/* Primary Target - Large Display */}
            {primaryTarget && (
              <motion.button
                onClick={() => onTargetSelect?.(primaryTarget.name)}
                className="w-full bg-black/40 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTargetIcon(primaryTarget.type)}</span>
                    <div className="text-left">
                      <div className="text-white font-medium">{primaryTarget.name}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">{primaryTarget.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-light text-white tracking-tight">
                      {primaryTarget.distance}<span className="text-lg text-slate-400">y</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {formatBearing(primaryTarget.bearing)}
                      {primaryTarget.elevation && (
                        <span className="ml-2">
                          {primaryTarget.elevation > 0 ? '↗' : '↘'} {Math.abs(primaryTarget.elevation)}ft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            )}

            {/* Quick Distance Grid */}
            <div className="grid grid-cols-3 gap-2">
              {targets.filter(t => t !== primaryTarget).slice(0, 3).map((target) => (
                <motion.button
                  key={target.name}
                  onClick={() => onTargetSelect?.(target.name)}
                  className={`p-3 rounded-xl border transition-all ${
                    target.name === selectedTarget
                      ? 'bg-cyan-500/20 border-cyan-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    {target.type}
                  </div>
                  <div className={`text-lg font-medium ${getTargetColor(target.type)}`}>
                    {target.distance}y
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* Detailed Rangefinder Display */
          <div className="space-y-2">
            {targets.map((target) => (
              <motion.button
                key={target.name}
                onClick={() => onTargetSelect?.(target.name)}
                className={`w-full p-3 rounded-xl border transition-all ${
                  target.name === selectedTarget
                    ? 'bg-cyan-500/20 border-cyan-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: targets.indexOf(target) * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTargetIcon(target.type)}</span>
                    <div className="text-left">
                      <div className="text-white font-medium text-sm">{target.name}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">{target.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-medium ${getTargetColor(target.type)}`}>
                      {target.distance}<span className="text-sm text-slate-400">y</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {formatBearing(target.bearing)}
                      {target.elevation && (
                        <span className="ml-1">
                          {target.elevation > 0 ? '↗' : '↘'}{Math.abs(target.elevation)}ft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* GPS Status Bar */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-green-400" />
            <span className="text-slate-400 font-mono">
              {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation2 className="w-3 h-3 text-cyan-400" />
            <span className="text-white">GPS Active</span>
          </div>
        </div>

        {/* Professional Rangefinder Footer */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">ParParty Pro GPS</span>
          <span className="text-slate-500">Tournament Grade</span>
        </div>
      </div>

      {/* Premium rangefinder glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/10 to-transparent blur-2xl -z-10" />
    </div>
  );
}