import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Crown } from 'lucide-react';
import { IceTrayScoreInput } from './IceTrayScoreInput';

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
  currentPutts?: number;
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number, putts?: number) => void;
  rank?: number;
  isLeader?: boolean;
  par: number;
}

export function PartyScoreCard({
  player,
  currentHole,
  currentScore,
  currentPutts,
  onScoreUpdate,
  rank,
  isLeader = false,
  par
}: PartyScoreCardProps) {
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

  const getScoreToPar = () => {
    // Assuming average par of 4 per hole
    const expectedPar = player.holesPlayed * 4;
    const diff = player.totalStrokes - expectedPar;
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
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
      
      <div className="relative p-4">
        {/* Player Info Header */}
        <div className="flex items-center gap-4 mb-4">
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
                className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Crown className="w-3 h-3 text-white" />
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
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                Score: <span className="text-slate-300 font-medium">{player.totalStrokes}</span>
              </span>
              <span className={`font-bold ${
                player.totalStrokes - (player.holesPlayed * 4) <= 0 
                  ? 'text-green-400' 
                  : 'text-orange-400'
              }`}>
                {getScoreToPar()}
              </span>
              <span className="text-slate-500">
                Avg: <span className="text-slate-300">{getPlayerAverage()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Ice Tray Score Input */}
        <IceTrayScoreInput
          playerId={player._id}
          playerName={player.name}
          currentScore={currentScore}
          currentPutts={currentPutts}
          holeNumber={currentHole}
          par={par}
          onScoreUpdate={onScoreUpdate}
          isLeader={isLeader}
        />
      </div>
    </motion.div>
  );
}