import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Check, X } from 'lucide-react';

interface QuickScoreInputProps {
  playerId: string;
  playerName: string;
  currentScore?: number;
  holeNumber: number;
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number) => void;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  compact?: boolean;
  premium?: boolean;
}

export function QuickScoreInput({
  playerId,
  playerName,
  currentScore,
  holeNumber,
  onScoreUpdate,
  isEditing,
  onEditingChange,
  compact = false,
  premium = false
}: QuickScoreInputProps) {
  const [tempScore, setTempScore] = useState(currentScore?.toString() || '4');

  const getScoreDisplay = (score?: number) => {
    if (!score) return '-';
    
    // Assuming par 4 for color coding (this could be enhanced with actual par data)
    const par = 4;
    const diff = score - par;
    
    if (diff <= -2) return `${score} 🦅`; // Eagle or better
    if (diff === -1) return `${score} 🐦`; // Birdie
    if (diff === 0) return `${score} ⚪`; // Par
    if (diff === 1) return `${score} 🟡`; // Bogey
    return `${score} 🔴`; // Double bogey or worse
  };

  const getScoreColors = (score?: number) => {
    if (!score) return 'bg-slate-700/50 text-slate-500 border-slate-600/50';
    
    const par = 4;
    const diff = score - par;
    
    if (diff <= -2) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-md shadow-yellow-500/10';
    if (diff === -1) return 'bg-green-500/20 text-green-400 border-green-500/30 shadow-md shadow-green-500/10';
    if (diff === 0) return 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-md shadow-blue-500/10';
    if (diff === 1) return 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-md shadow-orange-500/10';
    return 'bg-red-500/20 text-red-400 border-red-500/30 shadow-md shadow-red-500/10';
  };

  const quickScores = [
    { score: 2, label: '🦅 Eagle', color: 'from-yellow-500 to-amber-500' },
    { score: 3, label: '🐦 Birdie', color: 'from-emerald-500 to-green-500' },
    { score: 4, label: '⚪ Par', color: 'from-blue-500 to-cyan-500' },
    { score: 5, label: '🟡 Bogey', color: 'from-orange-500 to-yellow-500' },
    { score: 6, label: '🔴 Double', color: 'from-red-500 to-pink-500' },
    { score: 7, label: '⚫ Triple+', color: 'from-purple-500 to-violet-500' }
  ];

  const handleQuickScore = (score: number) => {
    onScoreUpdate(playerId, holeNumber, score);
  };

  const handleManualSubmit = () => {
    const score = parseInt(tempScore);
    if (score >= 1 && score <= 20) {
      onScoreUpdate(playerId, holeNumber, score);
      onEditingChange(false);
    }
  };

  const adjustScore = (delta: number) => {
    const current = parseInt(tempScore) || 4;
    const newScore = Math.max(1, Math.min(20, current + delta));
    setTempScore(newScore.toString());
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col gap-3 p-4 glass-party rounded-xl border border-green-500/40"
      >
        <div className="text-center text-green-400 font-semibold">Manual Score Entry</div>
        
        {/* Manual Input */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustScore(-1)}
            className="w-10 h-10 p-0 rounded-full border-green-500/30 hover:bg-green-500/20 text-green-400"
          >
            <Minus className="w-4 h-4" />
          </Button>
          
          <div className="w-20 h-12 rounded-xl gradient-party-button flex items-center justify-center">
            <Input
              type="number"
              min="1"
              max="20"
              value={tempScore}
              onChange={(e) => setTempScore(e.target.value)}
              className="w-full h-full text-center text-2xl font-bold bg-transparent border-0 text-white"
              autoFocus
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustScore(1)}
            className="w-10 h-10 p-0 rounded-full border-green-500/30 hover:bg-green-500/20 text-green-400"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleManualSubmit}
            className="flex-1 gradient-party-button text-white hover:scale-105"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Score
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditingChange(false)}
            className="border-slate-600 text-slate-400 px-4"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (compact) {
    if (premium) {
      return (
        <div className="flex items-center gap-3">
          {/* Premium Score Display */}
          <motion.button
            onClick={() => onEditingChange(true)}
            className={`relative w-16 h-16 rounded-2xl font-bold text-xl transition-all border backdrop-blur-sm ${
              currentScore 
                ? getScoreColors(currentScore).replace('bg-', 'bg-').replace('/20', '/10').replace('/30', '/20')
                : 'bg-white/5 border-white/20 text-slate-400'
            } hover:scale-105 active:scale-95`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
            <span className="relative">{currentScore || '–'}</span>
          </motion.button>

          {/* Minimal Quick Scores */}
          {!isEditing && (
            <div className="flex flex-col gap-1">
              {[3, 4, 5].map((score) => (
                <motion.button
                  key={score}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuickScore(score)}
                  className={`w-8 h-6 rounded-lg font-medium text-xs transition-all ${
                    currentScore === score
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {score}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        {/* Compact Current Score Display */}
        <motion.button
          onClick={() => onEditingChange(true)}
          className={`w-12 h-12 rounded-xl font-bold text-lg transition-all border-2 shadow-md ${getScoreColors(currentScore)}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {currentScore || '-'}
        </motion.button>

        {/* Quick Score Dropdown/Menu */}
        {!isEditing && (
          <div className="flex flex-wrap gap-1">
            {quickScores.slice(0, 3).map((item) => ( // Show only first 3 options
              <motion.button
                key={item.score}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleQuickScore(item.score)}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition-all border ${
                  currentScore === item.score
                    ? `bg-gradient-to-r ${item.color} text-white border-white/30`
                    : 'bg-slate-700/50 text-slate-300 border-slate-600/30 hover:bg-slate-600/50'
                }`}
              >
                {item.score}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Score Display */}
      <motion.div
        className="text-center"
        whileTap={{ scale: 0.98 }}
      >
        <div className="text-xs text-slate-400 mb-1">Current Score</div>
        <motion.button
          onClick={() => onEditingChange(true)}
          className={`w-20 h-20 rounded-2xl font-bold text-2xl transition-all border-2 shadow-lg ${getScoreColors(currentScore)}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {getScoreDisplay(currentScore)}
        </motion.button>
        <div className="text-xs text-slate-500 mt-1">Tap to edit manually</div>
      </motion.div>

      {/* Quick Score Buttons Grid */}
      <div className="space-y-2">
        <div className="text-center text-sm text-gradient font-semibold">Quick Score</div>
        <div className="grid grid-cols-2 gap-2">
          {quickScores.map((item) => (
            <motion.button
              key={item.score}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleQuickScore(item.score)}
              className={`p-3 rounded-xl font-semibold text-sm transition-all border ${
                currentScore === item.score
                  ? `bg-gradient-to-r ${item.color} text-white border-white/30 shadow-lg`
                  : 'bg-slate-700/30 text-slate-300 border-slate-600/30 hover:bg-slate-600/50'
              }`}
            >
              <div className="text-lg">{item.score}</div>
              <div className="text-xs opacity-90">{item.label}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}