import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, MessageCircle, TrendingUp, Wind, Target, Zap, ChevronDown, ChevronUp, AlertCircle, RefreshCcw } from 'lucide-react';
import { useAutoAICaddie } from '@/hooks/useAICaddie';

interface CourseConditions {
  windSpeed: number;
  windDirection: string;
  temperature: number;
  humidity: number;
  greenSpeed: 'slow' | 'medium' | 'fast';
  firmness: 'soft' | 'medium' | 'firm';
}

interface PlayerStats {
  averageDriver: number;
  average7Iron: number;
  averageWedge: number;
  recentRounds: number[];
  strengths: string[];
  improvements: string[];
}


interface AICaddiePanelProps {
  holeNumber: number;
  par: number;
  distanceToPin: number;
  conditions: CourseConditions;
  playerStats: PlayerStats;
  pinDifficulty: 'easy' | 'medium' | 'hard';
  hazards: Array<{ type: string; distance: number; carry: number }>;
  onClubSelect?: (club: string) => void;
}

export function AICaddiePanel({ 
  holeNumber, 
  par,
  distanceToPin, 
  conditions, 
  playerStats,
  pinDifficulty,
  hazards,
  onClubSelect 
}: AICaddiePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [chatMode, setChatMode] = useState(false);

  // Use the AI service for recommendations
  const holeInfo = {
    number: holeNumber,
    par,
    distanceToPin,
    pinDifficulty,
    hazards,
  };

  const {
    recommendation,
    loading: isThinking,
    error: aiError,
    getRecommendation,
    clearError,
  } = useAutoAICaddie(holeInfo, conditions, playerStats, true);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (aiError) {
      clearError();
    }
    await getRecommendation(holeInfo, conditions, playerStats);
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
    }
  };

  if (!recommendation && !isThinking) return null;

  return (
    <motion.div 
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
      
      <div className="relative p-4">
        {/* AI Caddie Header */}
        <motion.div
          className="w-full flex items-center gap-3 mb-4 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-lg relative">
            {isThinking ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Brain className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-light text-white tracking-tight">AI Caddie</h3>
              {aiError && <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {isThinking ? 'Analyzing with OpenAI...' : 
               aiError ? 'Using fallback logic' :
               `${recommendation?.confidence}% confidence`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              disabled={isThinking}
            >
              <RefreshCcw className={`w-4 h-4 text-cyan-400 ${isThinking ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChatMode(!chatMode);
              }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <MessageCircle className="w-4 h-4 text-cyan-400" />
            </button>
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </motion.div>

        {/* Quick Recommendation */}
        {!isThinking && recommendation && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <motion.button
              onClick={() => onClubSelect?.(recommendation.club)}
              className="bg-white/[0.02] rounded-2xl p-3 border border-white/5 hover:bg-white/[0.05] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Recommended</div>
              <div className="text-lg font-medium text-cyan-400">{recommendation.club}</div>
              <div className="text-xs text-slate-500">{recommendation.strategy}</div>
            </motion.button>
            
            <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Risk Level</div>
              <div className={`text-lg font-medium ${getRiskColor(recommendation.riskLevel)}`}>
                {recommendation.riskLevel.toUpperCase()}
              </div>
              <div className="text-xs text-slate-500">{recommendation.confidence}% confident</div>
            </div>
          </div>
        )}

        {/* Conditions Strip */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-slate-400" />
            <span className="text-white font-mono">{conditions.windSpeed}mph {conditions.windDirection}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-slate-400" />
            <span className="text-white font-mono">{distanceToPin}y</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-slate-400" />
            <span className="text-white">{conditions.temperature}°F</span>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && !isThinking && recommendation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* AI Reasoning */}
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">
                    {aiError ? 'Fallback Analysis' : 'AI Strategy Analysis'}
                  </span>
                  {!aiError && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      OpenAI Powered
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reasoning}</p>
                
                {/* Key Considerations (AI-enhanced feature) */}
                {recommendation.keyConsiderations && recommendation.keyConsiderations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Key Considerations</div>
                    <ul className="space-y-1">
                      {recommendation.keyConsiderations.map((consideration, index) => (
                        <li key={index} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-cyan-400 mt-1">•</span>
                          {consideration}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Alternative Clubs */}
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Alternatives</span>
                </div>
                <div className="flex gap-2">
                  {recommendation.alternativeClubs.map((club) => (
                    <button
                      key={club}
                      onClick={() => onClubSelect?.(club)}
                      className="px-3 py-2 bg-white/5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {club}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Conditions Impact */}
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Conditions Impact</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400">Wind Effect</div>
                    <div className="text-white font-mono">
                      {conditions.windSpeed > 10 ? '+/- 10-15y' : '+/- 5y'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">
                      {recommendation.yardageAdjustment !== undefined ? 'AI Adjustment' : 'Temp Effect'}
                    </div>
                    <div className="text-white font-mono">
                      {recommendation.yardageAdjustment !== undefined 
                        ? `${recommendation.yardageAdjustment > 0 ? '+' : ''}${recommendation.yardageAdjustment}y`
                        : (conditions.temperature < 50 ? '+5y' : conditions.temperature > 80 ? '-5y' : 'Neutral')
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Green Speed</div>
                    <div className="text-white">{conditions.greenSpeed}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Firmness</div>
                    <div className="text-white">{conditions.firmness}</div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">Your Performance</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-slate-400">Driver</div>
                    <div className="text-white font-mono">{playerStats.averageDriver}y</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400">7 Iron</div>
                    <div className="text-white font-mono">{playerStats.average7Iron}y</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400">Wedge</div>
                    <div className="text-white font-mono">{playerStats.averageWedge}y</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-transparent blur-2xl -z-10" />
    </motion.div>
  );
}