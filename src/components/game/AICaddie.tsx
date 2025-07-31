import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Wind, Target, TrendingUp, MapPin } from 'lucide-react';

interface AICaddieProps {
  holeNumber: number;
  distanceToPin: number;
  windSpeed: number;
  windDirection: string;
  playerStats?: {
    averageDriver: number;
    averageIron: number;
    recentForm: 'hot' | 'cold' | 'steady';
  };
}

export function AICaddie({ 
  holeNumber, 
  distanceToPin, 
  windSpeed, 
  windDirection,
  playerStats 
}: AICaddieProps) {
  const [expanded, setExpanded] = useState(false);

  // AI recommendations based on hole and conditions
  const getRecommendation = () => {
    const baseDistance = distanceToPin;
    const windAdjustment = windSpeed * (windDirection === 'against' ? 1.2 : windDirection === 'with' ? -0.8 : 0);
    const adjustedDistance = baseDistance + windAdjustment;

    if (adjustedDistance <= 100) {
      return {
        club: 'Wedge',
        strategy: 'Pin hunting',
        confidence: 92,
        note: 'Perfect scoring opportunity. Attack the pin.',
        icon: '🎯'
      };
    } else if (adjustedDistance <= 150) {
      return {
        club: '9-8 Iron',
        strategy: 'Center green',
        confidence: 88,
        note: 'Play it safe to the middle of the green.',
        icon: '📍'
      };
    } else if (adjustedDistance <= 200) {
      return {
        club: '7-6 Iron',
        strategy: 'Two-putt zone',
        confidence: 85,
        note: 'Focus on distance control.',
        icon: '🎯'
      };
    } else {
      return {
        club: 'Hybrid/Wood',
        strategy: 'Get it in play',
        confidence: 78,
        note: 'Keep it in bounds, avoid trouble.',
        icon: '⚡'
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <motion.div 
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
      
      <div className="relative p-4">
        {/* AI Caddie Header */}
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 mb-4"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-light text-white tracking-tight">AI Caddie</h3>
            <p className="text-xs text-slate-400 font-mono">Hole {holeNumber} • {distanceToPin}y to pin</p>
          </div>
          <div className="text-2xl">{recommendation.icon}</div>
        </motion.button>

        {/* Quick Recommendation */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Recommended</div>
            <div className="text-lg font-medium text-cyan-400">{recommendation.club}</div>
            <div className="text-xs text-slate-500">{recommendation.strategy}</div>
          </div>
          <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Confidence</div>
            <div className="text-lg font-medium text-white">{recommendation.confidence}%</div>
            <div className="text-xs text-slate-500">AI Analysis</div>
          </div>
        </div>

        {/* Conditions Strip */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-white font-mono">{windSpeed}mph {windDirection}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-white font-mono">{distanceToPin}y</span>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Strategy Note</span>
              </div>
              <p className="text-sm text-slate-300">{recommendation.note}</p>
            </div>

            {playerStats && (
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Your Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400">Avg Driver</div>
                    <div className="text-white font-mono">{playerStats.averageDriver}y</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Avg Iron</div>
                    <div className="text-white font-mono">{playerStats.averageIron}y</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Course Intel</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <div>• Green slopes back to front</div>
                <div>• Bunker protection left</div>
                <div>• Pin position: back right</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-transparent blur-2xl -z-10" />
    </motion.div>
  );
}