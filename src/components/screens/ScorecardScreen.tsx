import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Minus, Plus, Target } from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  totalStrokes: number;
  holesPlayed: number;
  avatar?: string;
}

interface Score {
  playerId: string;
  holeNumber: number;
  strokes: number;
}

interface ScorecardScreenProps {
  players: Player[];
  scores: Score[];
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number) => void;
}

export function ScorecardScreen({ players, scores, onScoreUpdate }: ScorecardScreenProps) {
  const [selectedHole, setSelectedHole] = useState(1);
  const [editingScore, setEditingScore] = useState<string | null>(null);

  // Create score lookup
  const scoresByPlayerAndHole = scores.reduce((acc, score) => {
    const key = `${score.playerId}-${score.holeNumber}`;
    acc[key] = score.strokes;
    return acc;
  }, {} as Record<string, number>);

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  const ScoreInput = ({ playerId, currentScore }: { playerId: string; currentScore?: number }) => {
    const [score, setScore] = useState(currentScore?.toString() || '');
    const isEditing = editingScore === `${playerId}-${selectedHole}`;

    const handleSubmit = () => {
      const numScore = parseInt(score);
      if (numScore >= 1 && numScore <= 20) {
        onScoreUpdate(playerId, selectedHole, numScore);
        setEditingScore(null);
      }
    };

    if (isEditing) {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newScore = Math.max(1, parseInt(score || '1') - 1);
              setScore(newScore.toString());
            }}
            className="w-8 h-8 p-0 rounded-full"
          >
            <Minus className="w-3 h-3" />
          </Button>
          
          <Input
            type="number"
            min="1"
            max="20"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') setEditingScore(null);
            }}
            className="w-16 h-8 text-center text-lg font-bold border-0 shadow-none"
            autoFocus
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newScore = Math.min(20, parseInt(score || '1') + 1);
              setScore(newScore.toString());
            }}
            className="w-8 h-8 p-0 rounded-full"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setScore(currentScore?.toString() || '4');
          setEditingScore(`${playerId}-${selectedHole}`);
        }}
        className={`w-16 h-12 rounded-xl font-bold text-lg transition-all ${
          currentScore 
            ? currentScore <= 3 
              ? 'bg-green-100 text-green-700 border-2 border-green-300' 
              : currentScore === 4
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-red-100 text-red-700 border-2 border-red-300'
            : 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300'
        }`}
      >
        {currentScore || '-'}
      </motion.button>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Hole Selector */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-green-600" />
            Select Hole
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {holes.map((hole) => (
              <motion.button
                key={hole}
                onClick={() => setSelectedHole(hole)}
                whileTap={{ scale: 0.95 }}
                className={`aspect-square rounded-xl font-semibold transition-all ${
                  selectedHole === hole
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-green-50'
                }`}
              >
                {hole}
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Hole Scores */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hole {selectedHole} Scores</span>
            <div className="text-sm font-normal text-gray-500">
              Tap to edit
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {players.map((player, index) => {
                const scoreKey = `${player._id}-${selectedHole}`;
                const currentScore = scoresByPlayerAndHole[scoreKey];
                
                return (
                  <motion.div
                    key={player._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-500">
                          Total: {player.totalStrokes} ({player.holesPlayed} holes)
                        </div>
                      </div>
                    </div>
                    
                    <ScoreInput
                      playerId={player._id}
                      currentScore={currentScore}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...players]
              .sort((a, b) => a.totalStrokes - b.totalStrokes)
              .map((player, index) => (
                <motion.div
                  key={player._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200' 
                      : 'bg-white/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-500">
                      {player.holesPlayed} holes played
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{player.totalStrokes}</div>
                    <div className="text-sm text-gray-500">strokes</div>
                  </div>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}