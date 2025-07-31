import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoleNavigatorProps {
  currentHole: number;
  totalHoles?: number;
  onHoleChange: (hole: number) => void;
  holesCompleted?: Set<number>;
}

export function HoleNavigator({ 
  currentHole, 
  totalHoles = 18, 
  onHoleChange,
  holesCompleted = new Set()
}: HoleNavigatorProps) {
  const holes = Array.from({ length: totalHoles }, (_, i) => i + 1);

  const handlePrevious = () => {
    if (currentHole > 1) {
      onHoleChange(currentHole - 1);
    }
  };

  const handleNext = () => {
    if (currentHole < totalHoles) {
      onHoleChange(currentHole + 1);
    }
  };

  const getHoleStatus = (hole: number) => {
    if (holesCompleted.has(hole)) return 'completed';
    if (hole === currentHole) return 'current';
    return 'pending';
  };

  const getHoleColors = (hole: number) => {
    const status = getHoleStatus(hole);
    switch (status) {
      case 'completed':
        return 'bg-green-500/30 text-green-400 border-green-500/50';
      case 'current':
        return 'gradient-party-button text-white shadow-lg shadow-green-500/25';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
    }
  };

  return (
    <div className="relative">
      {/* Premium Hole Navigation - Sleek & Minimal */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          onClick={handlePrevious}
          disabled={currentHole === 1}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          whileHover={{ scale: currentHole > 1 ? 1.05 : 1 }}
          whileTap={{ scale: currentHole > 1 ? 0.95 : 1 }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </motion.button>

        {/* Elegant Hole Display */}
        <motion.div
          key={currentHole}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative"
        >
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-6 text-center shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative">
              <div className="text-xs font-medium text-slate-400 tracking-wide uppercase mb-1">Hole</div>
              <div className="text-4xl font-light text-white tracking-tight">{currentHole}</div>
              <div className="text-xs text-slate-500 mt-1">of {totalHoles}</div>
            </div>
          </div>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/5 to-transparent blur-xl -z-10" />
        </motion.div>

        <motion.button
          onClick={handleNext}
          disabled={currentHole === totalHoles}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          whileHover={{ scale: currentHole < totalHoles ? 1.05 : 1 }}
          whileTap={{ scale: currentHole < totalHoles ? 0.95 : 1 }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      {/* Minimal Progress Indicator */}
      <div className="mt-6 px-8">
        <div className="flex items-center justify-between text-xs font-medium mb-3">
          <span className="text-slate-400 tracking-wide">Progress</span>
          <span className="text-white font-mono">{holesCompleted.size}/{totalHoles}</span>
        </div>
        <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(holesCompleted.size / totalHoles) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}