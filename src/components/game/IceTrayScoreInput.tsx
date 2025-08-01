import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface IceTrayScoreInputProps {
  playerId: string;
  playerName: string;
  currentScore?: number;
  currentPutts?: number;
  holeNumber: number;
  par: number;
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number, putts?: number) => void;
  isLeader?: boolean;
}

export function IceTrayScoreInput({
  playerId,
  playerName,
  currentScore,
  currentPutts,
  holeNumber,
  par,
  onScoreUpdate,
  isLeader = false
}: IceTrayScoreInputProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(currentScore || null);
  const [selectedPutts, setSelectedPutts] = useState<number>(currentPutts || 2);
  const [showPutts, setShowPutts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Score options with emphasis on common scores
  const scoreOptions = [
    { value: 1, size: 'small' },
    { value: 2, size: 'small' },
    { value: 3, size: 'medium' },
    { value: 4, size: 'large' },
    { value: 5, size: 'large' },
    { value: 6, size: 'medium' },
    { value: 7, size: 'small' },
    { value: 8, size: 'small' },
    { value: 9, size: 'small' }
  ];
  
  const getScoreGradient = (score: number) => {
    const diff = score - par;
    if (score === 1) return 'from-yellow-400 via-amber-400 to-orange-500'; // Hole in one
    if (diff <= -2) return 'from-yellow-400 via-amber-400 to-orange-500'; // Eagle or better
    if (diff === -1) return 'from-emerald-400 via-green-400 to-teal-500'; // Birdie
    if (diff === 0) return 'from-blue-400 via-cyan-400 to-blue-500'; // Par
    if (diff === 1) return 'from-amber-400 via-orange-400 to-yellow-500'; // Bogey
    if (diff === 2) return 'from-red-400 via-red-400 to-pink-500'; // Double
    return 'from-red-500 via-red-500 to-red-600'; // Triple or worse
  };

  const getButtonSize = (size: string) => {
    switch (size) {
      case 'large': return 'w-14 h-14 text-lg';
      case 'medium': return 'w-12 h-12 text-base';
      default: return 'w-10 h-10 text-sm';
    }
  };

  const triggerCelebration = (score: number) => {
    const diff = score - par;
    
    if (score === 1 || diff <= -2) {
      // Fireworks for hole-in-one or eagle
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    } else if (diff === -1) {
      // Confetti for birdie
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
    setShowPutts(true);
    
    // Auto-submit after a delay if putts aren't selected
    setTimeout(() => {
      if (!isSubmitting) {
        submitScore(score, selectedPutts);
      }
    }, 2000);
  };

  const submitScore = (score: number, putts: number) => {
    setIsSubmitting(true);
    triggerCelebration(score);
    
    setTimeout(() => {
      onScoreUpdate(playerId, holeNumber, score, putts);
      setIsSubmitting(false);
      setShowPutts(false);
    }, 300);
  };

  const handlePuttChange = (delta: number) => {
    const newPutts = Math.max(0, Math.min(5, selectedPutts + delta));
    setSelectedPutts(newPutts);
  };

  const handlePuttSelect = (putts: number) => {
    setSelectedPutts(putts);
    if (selectedScore) {
      submitScore(selectedScore, putts);
    }
  };

  // Update selected score when currentScore changes
  useEffect(() => {
    if (currentScore) {
      setSelectedScore(currentScore);
    }
  }, [currentScore]);

  return (
    <div className={`relative rounded-2xl overflow-hidden transition-all ${
      isLeader 
        ? 'bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30' 
        : 'bg-white/5 border border-white/10'
    }`}>
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative p-3">
        {/* Score input ice tray */}
        <div className="flex items-center justify-center gap-1 mb-2">
          {scoreOptions.map(({ value, size }) => {
            const isSelected = selectedScore === value;
            const isCurrent = currentScore === value && !selectedScore;
            const scoreGradient = getScoreGradient(value);
            const buttonSize = getButtonSize(size);
            
            return (
              <motion.button
                key={value}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleScoreSelect(value)}
                disabled={isSubmitting}
                className={`relative ${buttonSize} rounded-xl font-bold transition-all transform ${
                  isSelected
                    ? `bg-gradient-to-br ${scoreGradient} text-white shadow-lg scale-110`
                    : isCurrent
                    ? 'bg-white/20 text-white border-2 border-white/50'
                    : value === par
                    ? 'bg-white/15 text-white/90 hover:bg-white/25'
                    : value < par
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                } ${size === 'large' ? 'mx-0.5' : ''}`}
              >
                {/* Score number */}
                <span className="relative z-10">{value}</span>
                
                {/* Par indicator */}
                {value === par && !isSelected && !isCurrent && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                )}
                
                {/* Selection animation */}
                <AnimatePresence>
                  {isSelected && !isSubmitting && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 rounded-xl border-2 border-white"
                    />
                  )}
                </AnimatePresence>
                
                {/* Submit checkmark */}
                <AnimatePresence>
                  {isSelected && isSubmitting && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Optional putt counter */}
        <AnimatePresence>
          {showPutts && selectedScore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">Putts:</span>
                  
                  {/* Quick putt selection dots */}
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((putts) => (
                      <motion.button
                        key={putts}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handlePuttSelect(putts)}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                          selectedPutts === putts
                            ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-400'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {putts}
                      </motion.button>
                    ))}
                  </div>
                  
                  {/* Fine adjustment */}
                  <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handlePuttChange(-1)}
                      className="w-6 h-6 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </motion.button>
                    <div className="w-8 text-center text-sm font-medium text-white">
                      {selectedPutts}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handlePuttChange(1)}
                      className="w-6 h-6 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}