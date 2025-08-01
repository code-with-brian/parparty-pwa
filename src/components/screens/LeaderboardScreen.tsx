import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Medal, Crown, Award } from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  totalStrokes: number;
  holesPlayed: number;
  currentPosition: number;
  avatar?: string;
}

interface LeaderboardScreenProps {
  players: Player[];
  currentPlayerId?: string;
}

export function LeaderboardScreen({ players, currentPlayerId }: LeaderboardScreenProps) {
  // Sort players by current position (already calculated in backend)
  const sortedPlayers = [...players].sort((a, b) => a.currentPosition - b.currentPosition);
  
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return Crown;
      case 2: return Medal;
      case 3: return Award;
      default: return Trophy;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-400 bg-yellow-400/20';
      case 2: return 'text-gray-300 bg-gray-300/20';
      case 3: return 'text-amber-600 bg-amber-600/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  const getStrokesDisplay = (player: Player) => {
    if (player.holesPlayed === 0) return 'E';
    
    const averagePar = 4; // Assuming average par of 4
    const expectedStrokes = player.holesPlayed * averagePar;
    const relativeScore = player.totalStrokes - expectedStrokes;
    
    if (relativeScore === 0) return 'E';
    if (relativeScore > 0) return `+${relativeScore}`;
    return `${relativeScore}`;
  };

  const getScoreColor = (player: Player) => {
    if (player.holesPlayed === 0) return 'text-slate-400';
    
    const averagePar = 4;
    const expectedStrokes = player.holesPlayed * averagePar;
    const relativeScore = player.totalStrokes - expectedStrokes;
    
    if (relativeScore < 0) return 'text-green-400';
    if (relativeScore === 0) return 'text-blue-400';
    if (relativeScore <= 2) return 'text-yellow-500';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
      
      <div className="relative pb-20">
        {/* Header */}
        <div className="pt-4 px-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
              <p className="text-slate-400 text-sm">Live tournament standings</p>
            </div>
            
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium">LIVE</span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="px-6 space-y-3">
          {sortedPlayers.map((player, index) => {
            const PositionIcon = getPositionIcon(player.currentPosition);
            const positionColors = getPositionColor(player.currentPosition);
            const isCurrentPlayer = player._id === currentPlayerId;
            const strokesDisplay = getStrokesDisplay(player);
            const scoreColor = getScoreColor(player);
            
            return (
              <motion.div
                key={player._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-3xl ${
                  isCurrentPlayer 
                    ? 'bg-cyan-500/10 border-2 border-cyan-500/30' 
                    : 'bg-white/[0.02] border border-white/10'
                } backdrop-blur-xl`}
              >
                {/* Position indicator for current player */}
                {isCurrentPlayer && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent" />
                )}
                
                <div className="relative p-4">
                  <div className="flex items-center justify-between">
                    {/* Left side - Position & Player */}
                    <div className="flex items-center gap-4">
                      {/* Position */}
                      <div className={`w-12 h-12 rounded-2xl ${positionColors} flex items-center justify-center flex-shrink-0`}>
                        {player.currentPosition <= 3 ? (
                          <PositionIcon className="w-6 h-6" />
                        ) : (
                          <span className="text-lg font-bold">{player.currentPosition}</span>
                        )}
                      </div>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${
                            isCurrentPlayer ? 'text-cyan-400' : 'text-white'
                          }`}>
                            {player.name}
                          </h3>
                          {isCurrentPlayer && (
                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-medium">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-slate-400 text-sm">
                            {player.holesPlayed} holes played
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 text-sm">
                            {player.totalStrokes} total strokes
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Score */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${scoreColor}`}>
                        {strokesDisplay}
                      </div>
                      {player.holesPlayed > 0 && (
                        <div className="text-xs text-slate-500">
                          {(player.totalStrokes / player.holesPlayed).toFixed(1)} avg
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCurrentPlayer ? 'bg-cyan-400' : 'bg-slate-600'
                        }`}
                        style={{ width: `${(player.holesPlayed / 18) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 min-w-0">
                      {player.holesPlayed}/18
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {/* Empty state */}
          {sortedPlayers.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No scores yet</h3>
              <p className="text-slate-400">Scores will appear here as players complete holes</p>
            </div>
          )}
        </div>

        {/* Tournament Info */}
        {sortedPlayers.length > 0 && (
          <div className="px-6 mt-8">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-4">
              <h3 className="text-white font-medium mb-3">Tournament Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {sortedPlayers.length}
                  </div>
                  <div className="text-xs text-slate-400">Players</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {Math.max(...sortedPlayers.map(p => p.holesPlayed))}
                  </div>
                  <div className="text-xs text-slate-400">Holes Completed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}