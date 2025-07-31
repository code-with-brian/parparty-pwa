import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, MessageCircle, TrendingUp, Wind, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface CourseConditions {
  windSpeed: number;
  windDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
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

interface ClubRecommendation {
  club: string;
  confidence: number;
  strategy: string;
  reasoning: string;
  alternativeClubs: string[];
  riskLevel: 'low' | 'medium' | 'high';
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
  const [recommendation, setRecommendation] = useState<ClubRecommendation | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // AI Caddie Logic
  const generateRecommendation = (): ClubRecommendation => {
    const windAdjustment = conditions.windSpeed * (
      ['N', 'NE', 'NW'].includes(conditions.windDirection) ? 1.1 : 
      ['S', 'SE', 'SW'].includes(conditions.windDirection) ? 0.9 : 1.0
    );
    
    const effectiveDistance = Math.round(distanceToPin * windAdjustment);
    const tempAdjustment = conditions.temperature < 50 ? 1.05 : conditions.temperature > 80 ? 0.95 : 1.0;
    const finalDistance = Math.round(effectiveDistance * tempAdjustment);

    // Club selection algorithm
    let club: string;
    let confidence: number;
    let strategy: string;
    let reasoning: string;
    let alternativeClubs: string[];
    let riskLevel: 'low' | 'medium' | 'high';

    if (finalDistance <= 50) {
      club = 'Lob Wedge';
      confidence = 95;
      strategy = 'Pin hunting';
      reasoning = 'Short distance allows for aggressive pin attack with high spin control.';
      alternativeClubs = ['Sand Wedge', 'Gap Wedge'];
      riskLevel = 'low';
    } else if (finalDistance <= 100) {
      club = pinDifficulty === 'hard' ? 'Gap Wedge' : 'Sand Wedge';
      confidence = 90;
      strategy = pinDifficulty === 'hard' ? 'Center green' : 'Attack pin';
      reasoning = `${finalDistance} yards is perfect wedge distance. ${pinDifficulty === 'hard' ? 'Pin position suggests conservative approach.' : 'Good pin position for aggressive play.'}`;
      alternativeClubs = ['Pitching Wedge', 'Lob Wedge'];
      riskLevel = pinDifficulty === 'hard' ? 'medium' : 'low';
    } else if (finalDistance <= 130) {
      club = 'Pitching Wedge';
      confidence = 88;
      strategy = 'Full swing control';
      reasoning = `Full pitching wedge gives best distance control for ${finalDistance} yards.`;
      alternativeClubs = ['9 Iron', 'Gap Wedge'];
      riskLevel = 'low';
    } else if (finalDistance <= 150) {
      club = '9 Iron';
      confidence = 85;
      strategy = 'Smooth tempo';
      reasoning = `9 iron with smooth tempo accounts for ${conditions.windSpeed}mph wind.`;
      alternativeClubs = ['8 Iron', 'Pitching Wedge'];
      riskLevel = 'medium';
    } else if (finalDistance <= 170) {
      club = '8 Iron';
      confidence = 82;
      strategy = 'Center green';
      reasoning = `Longer iron requires center green target for best results.`;
      alternativeClubs = ['7 Iron', '9 Iron'];
      riskLevel = 'medium';
    } else if (finalDistance <= 190) {
      club = '7 Iron';
      confidence = 78;
      strategy = 'Two-putt zone';
      reasoning = `Focus on getting to two-putt range rather than pin hunting.`;
      alternativeClubs = ['6 Iron', '8 Iron'];
      riskLevel = 'medium';
    } else {
      club = finalDistance <= 210 ? '6 Iron' : '5 Iron';
      confidence = 70;
      strategy = 'Get it on green';
      reasoning = `Long approach - prioritize finding the green over pin position.`;
      alternativeClubs = finalDistance <= 210 ? ['5 Iron', '7 Iron'] : ['Hybrid', '6 Iron'];
      riskLevel = 'high';
    }

    // Adjust for hazards
    const nearbyHazards = hazards.filter(h => Math.abs(h.distance - finalDistance) < 20);
    if (nearbyHazards.length > 0) {
      confidence -= 10;
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      reasoning += ` Be aware of ${nearbyHazards[0].type} at ${nearbyHazards[0].distance} yards.`;
    }

    return {
      club,
      confidence: Math.max(confidence, 60),
      strategy,
      reasoning,
      alternativeClubs,
      riskLevel
    };
  };

  useEffect(() => {
    setIsThinking(true);
    const timer = setTimeout(() => {
      setRecommendation(generateRecommendation());
      setIsThinking(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [distanceToPin, conditions, pinDifficulty]);

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
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 mb-4"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
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
            <h3 className="text-lg font-light text-white tracking-tight">AI Caddie</h3>
            <p className="text-xs text-slate-400 font-mono">
              {isThinking ? 'Analyzing conditions...' : `${recommendation?.confidence}% confidence`}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        </motion.button>

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
                  <span className="text-sm font-medium text-white">Strategy Analysis</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reasoning}</p>
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
                    <div className="text-slate-400">Temp Effect</div>
                    <div className="text-white font-mono">
                      {conditions.temperature < 50 ? '+5y' : conditions.temperature > 80 ? '-5y' : 'Neutral'}
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