import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, MapPin, Brain, Wind, Thermometer } from 'lucide-react';
import { HoleNavigator } from '@/components/game/HoleNavigator';
import { PartyScoreCard } from '@/components/game/PartyScoreCard';
import { HoleMapView } from '@/components/game/HoleMapView';
import { AICaddiePanel } from '@/components/game/AICaddiePanel';
import { GPSRangefinder } from '@/components/game/GPSRangefinder';
import { WeatherConditions } from '@/components/game/WeatherConditions';

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
  putts?: number;
}

interface ScorecardScreenProps {
  players: Player[];
  scores: Score[];
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number, putts?: number) => void;
}

export function ScorecardScreen({ players, scores, onScoreUpdate }: ScorecardScreenProps) {
  const [selectedHole, setSelectedHole] = useState(1);
  const [view, setView] = useState<'scoring' | 'caddie'>('scoring');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);

  // Create score lookup
  const scoresByPlayerAndHole = scores.reduce((acc, score) => {
    const key = `${score.playerId}-${score.holeNumber}`;
    acc[key] = { strokes: score.strokes, putts: score.putts };
    return acc;
  }, {} as Record<string, { strokes: number; putts?: number }>);

  // Calculate completed holes for progress tracking
  const holesCompleted = new Set<number>();
  for (let hole = 1; hole <= 18; hole++) {
    const allPlayersHaveScore = players.every(player => {
      const key = `${player._id}-${hole}`;
      return scoresByPlayerAndHole[key]?.strokes !== undefined;
    });
    if (allPlayersHaveScore) {
      holesCompleted.add(hole);
    }
  }

  // Sort players by total strokes for ranking
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.totalStrokes === b.totalStrokes) {
      return b.holesPlayed - a.holesPlayed; // More holes played wins ties
    }
    return a.totalStrokes - b.totalStrokes;
  });

  // Mock data for golf intelligence components (in production, this would come from Convex)
  const mockHoleData = {
    number: selectedHole,
    par: 4,
    yardage: 385,
    teePosition: { x: 50, y: 280 },
    pinPosition: {
      x: 350,
      y: 50,
      difficulty: 'medium' as const,
      description: 'Back right, 15 yards from center'
    },
    fairwayPath: [
      { x: 50, y: 280 },
      { x: 120, y: 200 },
      { x: 200, y: 120 },
      { x: 280, y: 80 },
      { x: 350, y: 50 }
    ],
    hazards: [
      {
        type: 'water' as const,
        coordinates: { x: 180, y: 60, width: 80, height: 40 },
        carryDistance: 210
      },
      {
        type: 'bunker' as const,
        coordinates: { x: 300, y: 30, width: 30, height: 25 },
        carryDistance: 160
      }
    ],
    greenContour: [
      { x: 325, y: 30 },
      { x: 375, y: 30 },
      { x: 375, y: 70 },
      { x: 325, y: 70 }
    ]
  };

  const mockPlayerPosition = {
    x: 120,
    y: 200,
    distanceToPin: 185,
    club: selectedClub
  };

  const mockRangefinderTargets = [
    { name: 'Pin', distance: 185, bearing: 45, type: 'pin' as const },
    { name: 'Front', distance: 165, bearing: 45, type: 'front' as const },
    { name: 'Middle', distance: 175, bearing: 45, type: 'middle' as const },
    { name: 'Back', distance: 195, bearing: 45, type: 'back' as const },
    { name: 'Water Carry', distance: 210, bearing: 48, type: 'hazard' as const },
    { name: 'Layup Zone', distance: 140, bearing: 45, type: 'layup' as const }
  ];

  const mockWeatherData = {
    temperature: 72,
    humidity: 65,
    windSpeed: 8,
    windDirection: 225,
    windGusts: 12,
    pressure: 30.15,
    visibility: 10,
    conditions: 'partly-cloudy' as const,
    uvIndex: 6,
    dewPoint: 58
  };

  const mockPlayerStats = {
    averageDriver: 280,
    average7Iron: 155,
    averageWedge: 90,
    recentRounds: [78, 82, 76, 80],
    strengths: ['Putting', 'Short Game'],
    improvements: ['Driving Accuracy', 'Long Irons']
  };

  // Get current hole par (defaulting to 4 if not found)
  const currentHolePar = mockHoleData.par;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
      
      <div className="relative space-y-6 pb-8">
        {/* Slim Info Bar - Always Visible */}
        <div className="pt-4 px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2.5"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {/* Distance */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-medium">{mockPlayerPosition.distanceToPin}y</span>
                </div>
                
                {/* Weather */}
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{mockWeatherData.windSpeed}mph {mockWeatherData.windDirection < 90 ? 'N' : mockWeatherData.windDirection < 180 ? 'E' : mockWeatherData.windDirection < 270 ? 'S' : 'W'}</span>
                </div>
                
                {/* Temperature */}
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{mockWeatherData.temperature}°F</span>
                </div>
              </div>
              
              {/* Hole Info */}
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-mono">Par {mockHoleData.par}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono">{mockHoleData.yardage}y</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Simplified Tab Navigation */}
        <div className="px-6">
          <div className="flex gap-2 bg-white/5 rounded-2xl p-1">
            <button
              onClick={() => setView('scoring')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                view === 'scoring'
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4" />
                Scoring
              </div>
            </button>
            <button
              onClick={() => setView('caddie')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                view === 'caddie'
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Brain className="w-4 h-4" />
                Caddie
              </div>
            </button>
          </div>
        </div>

        {view === 'scoring' ? (
          /* Primary Scoring View */
          <div className="space-y-6">
            {/* Hole Navigation */}
            <div className="px-6">
              <HoleNavigator
                currentHole={selectedHole}
                onHoleChange={setSelectedHole}
                holesCompleted={holesCompleted}
              />
            </div>

            {/* Player Scoring Cards */}
            <div className="px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedHole}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, staggerChildren: 0.1 }}
                  className="space-y-4"
                >
                  {sortedPlayers.map((player, index) => {
                    const scoreKey = `${player._id}-${selectedHole}`;
                    const scoreData = scoresByPlayerAndHole[scoreKey];
                    
                    return (
                      <motion.div
                        key={player._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <PartyScoreCard
                          player={player}
                          currentHole={selectedHole}
                          currentScore={scoreData?.strokes}
                          currentPutts={scoreData?.putts}
                          onScoreUpdate={onScoreUpdate}
                          rank={index + 1}
                          isLeader={index === 0}
                          par={currentHolePar}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Caddie View */
          <div className="space-y-6">
            {/* Hole Navigation */}
            <div className="px-6">
              <HoleNavigator
                currentHole={selectedHole}
                onHoleChange={setSelectedHole}
                holesCompleted={holesCompleted}
              />
            </div>

            {/* Caddie Content */}
            <div className="px-6 space-y-6">
              {/* Hole Map - Clickable for fullscreen */}
              <HoleMapView
                holeData={mockHoleData}
                playerPosition={mockPlayerPosition}
                onPositionSelect={(position) => console.log('Selected position:', position)}
                onMapClick={() => setShowFullscreenMap(true)}
              />

              {/* Caddie Suggestion */}
              <AICaddiePanel
                holeNumber={selectedHole}
                par={mockHoleData.par}
                distanceToPin={mockPlayerPosition.distanceToPin}
                conditions={{
                  windSpeed: mockWeatherData.windSpeed,
                  windDirection: 'SW',
                  temperature: mockWeatherData.temperature,
                  humidity: mockWeatherData.humidity,
                  greenSpeed: 'medium',
                  firmness: 'medium'
                }}
                playerStats={mockPlayerStats}
                pinDifficulty={mockHoleData.pinPosition.difficulty}
                hazards={mockHoleData.hazards.map(h => ({
                  type: h.type,
                  distance: h.carryDistance || 0,
                  carry: h.carryDistance || 0
                }))}
                onClubSelect={setSelectedClub}
              />
            </div>
          </div>
        )}

        {/* Fullscreen Map Modal */}
        <AnimatePresence>
          {showFullscreenMap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center"
              onClick={() => setShowFullscreenMap(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-full h-full max-w-4xl max-h-4xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full h-full">
                  <HoleMapView
                    holeData={mockHoleData}
                    playerPosition={mockPlayerPosition}
                    onPositionSelect={(position) => console.log('Selected position:', position)}
                  />
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => setShowFullscreenMap(false)}
                  className="absolute top-6 right-6 w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all"
                >
                  ✕
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}