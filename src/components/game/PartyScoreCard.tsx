import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { QuickScoreInput } from './QuickScoreInput';

interface Player {
  _id: string;
  name: string;
  totalStrokes: number;
  holesPlayed: number;
  avatar?: string;
}

interface PartyScoreCardProps {
  player: Player;
  currentHole: number;
  currentScore?: number;
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number) => void;
  rank?: number;
  isLeader?: boolean;
}

export function PartyScoreCard({
  player,
  currentHole,
  currentScore,
  onScoreUpdate,
  rank,
  isLeader = false
}: PartyScoreCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getPlayerAverage = () => {
    if (player.holesPlayed === 0) return 0;
    return (player.totalStrokes / player.holesPlayed).toFixed(1);
  };

  const getPerformanceIcon = () => {
    const avg = parseFloat(getPlayerAverage());
    if (avg < 4) return <TrendingDown className="w-4 h-4 text-green-400" />;
    if (avg > 4.5) return <TrendingUp className="w-4 h-4 text-red-400" />;
    return null;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden transition-all ${
        isLeader
          ? 'bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 border border-cyan-500/20'
          : 'bg-white/[0.02] border border-white/10'
      } backdrop-blur-xl rounded-2xl`}
    >
      {/* Subtle premium glow */}
      <div className={`absolute inset-0 rounded-2xl ${
        isLeader ? 'shadow-lg shadow-cyan-500/10' : ''
      }`} />
      
      <div className="relative p-4 flex items-center gap-4">
        {/* Elegant Avatar */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-medium text-sm border ${
            isLeader 
              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white border-cyan-300/50 shadow-lg shadow-cyan-500/25' 
              : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white border-slate-600/50'
          }`}>
            {getPlayerInitials(player.name)}
          </div>
          
          {isLeader && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Trophy className="w-3 h-3 text-white" />
            </motion.div>
          )}
          
          {rank && rank > 1 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-300">{rank}</span>
            </div>
          )}
        </div>

        {/* Player Info - Minimal & Clean */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-medium text-base tracking-tight ${
              isLeader ? 'text-cyan-400' : 'text-white'
            }`}>
              {player.name}
            </h3>
            {getPerformanceIcon()}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {player.totalStrokes} total • {(player.totalStrokes / Math.max(player.holesPlayed, 1)).toFixed(1)} avg
          </div>
        </div>

        {/* Premium Score Display */}
        <div className="flex-shrink-0">
          <QuickScoreInput
            playerId={player._id}
            playerName={player.name}
            currentScore={currentScore}
            holeNumber={currentHole}
            onScoreUpdate={onScoreUpdate}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
            compact={true}
            premium={true}
          />
        </div>
      </div>

      {/* Party Effects for Great Scores */}
      {currentScore && currentScore <= 3 && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 0.5, 
              repeat: Infinity, 
              repeatDelay: 2 
            }}
          >
            {currentScore === 1 ? '🏌️‍♂️' : currentScore === 2 ? '🦅' : '🐦'}
          </motion.div>
        </motion.div>
      )}

      {/* Additional celebration for hole-in-one */}
      {currentScore === 1 && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{ 
                  x: '50%', 
                  y: '50%',
                  scale: 0
                }}
                animate={{ 
                  x: Math.cos(i * Math.PI / 3) * 100 + '50%',
                  y: Math.sin(i * Math.PI / 3) * 100 + '50%',
                  scale: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  delay: i * 0.1
                }}
              />
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}