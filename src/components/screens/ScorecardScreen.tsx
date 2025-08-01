import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, MapPin, Brain, Wind, Thermometer } from 'lucide-react';
import { HoleNavigator } from '@/components/game/HoleNavigator';
import { PartyScoreCard } from '@/components/game/PartyScoreCard';
import { HoleMapView } from '@/components/game/HoleMapView';
import { CompactHoleMap } from '@/components/game/CompactHoleMap';
import { AICaddiePanel } from '@/components/game/AICaddiePanel';
import { GPSRangefinder } from '@/components/game/GPSRangefinder';
import { WeatherConditions } from '@/components/game/WeatherConditions';
import { useGolfCourseWeather } from '@/hooks/useWeather';

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

interface CourseData {
  _id: string;
  name: string;
  clubName: string;
  latitude?: number;
  longitude?: number;
  holes?: Array<{
    holeNumber: number;
    par: number;
    coordinates?: Array<{
      type: string;
      latitude: number;
      longitude: number;
      location: number;
      poi: number;
    }>;
  }>;
}

// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;

interface HoleCoordinate {
  _id: Id<"holeCoordinates">;
  courseId: Id<"courses">;
  holeNumber: number;
  par: number;
  coordinates: Array<{
    type: string;
    latitude: number;
    longitude: number;
    location: number;
    poi: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

interface ScorecardScreenProps {
  players: Player[];
  scores: Score[];
  onScoreUpdate: (playerId: string, holeNumber: number, strokes: number, putts?: number) => void;
  courseData?: CourseData | null;
  holeCoordinates?: HoleCoordinate[] | null;
}

export function ScorecardScreen({ players, scores, onScoreUpdate, courseData, holeCoordinates }: ScorecardScreenProps) {
  const [selectedHole, setSelectedHole] = useState(1);
  const [view, setView] = useState<'scoring' | 'caddie'>('scoring');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);

  // Get real weather data for the golf course
  const { weatherData, loading: weatherLoading, error: weatherError } = useGolfCourseWeather(
    courseData?.clubName || 'Peterborough Golf and Country Club',
    courseData?.latitude && courseData?.longitude 
      ? { lat: courseData.latitude, lng: courseData.longitude }
      : { lat: 44.3106, lng: -78.2889 } // Peterborough coordinates
  );

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

  // Use real weather data or fallback to mock data
  const currentWeather = weatherData || {
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

  // Generate real course GPS coordinates for current hole using new holeCoordinates table
  const generateHoleGPSCoordinates = (holeNumber: number) => {
    // Enhanced debug logging
    console.log('=== GPS COORDINATES DEBUG ===');
    console.log('Current hole:', holeNumber);
    console.log('Course data loaded:', !!courseData);
    console.log('Hole coordinates loaded:', !!holeCoordinates);
    console.log('Hole coordinates count:', holeCoordinates?.length);
    
    if (holeCoordinates) {
      console.log('All hole numbers available:', holeCoordinates.map(h => h.holeNumber));
    }
    
    // Default to Peterborough coordinates for fallback
    const peterboroughBase = { lat: 44.3106, lng: -78.2889 };
    
    // Find hole coordinates from the new holeCoordinates table
    const holeData = holeCoordinates?.find(h => h.holeNumber === holeNumber);
    
    if (holeData && holeData.coordinates && holeData.coordinates.length > 0) {
      console.log(`🎯 FOUND REAL GPS DATA for hole ${holeNumber}!`);
      console.log('Hole data:', {
        holeNumber: holeData.holeNumber,
        par: holeData.par,
        coordinates: holeData.coordinates
      });
      
      // Use actual GPS coordinates from the holeCoordinates table
      // According to golf API docs: poi: 1 = Green, poi: 11 = Front tee, poi: 12 = Back tee
      // IMPORTANT: The poi values are correct, but I mislabeled the types during import
      // poi: 1 = Green, poi: 12 = Back tee (this is the actual structure in our data)
      const teeCoord = holeData.coordinates.find(c => c.poi === 12 || c.poi === 11); // Back tee or Front tee
      const pinCoord = holeData.coordinates.find(c => c.poi === 1); // Green
      
      console.log('Tee coordinate found:', teeCoord);
      console.log('Pin coordinate found:', pinCoord);
      
      let teeCoords = { lat: peterboroughBase.lat, lng: peterboroughBase.lng };
      let pinCoords = { lat: peterboroughBase.lat + 0.003, lng: peterboroughBase.lng + 0.001 };
      
      if (teeCoord) {
        teeCoords = { lat: teeCoord.latitude, lng: teeCoord.longitude };
        console.log(`✅ Using REAL tee coordinates: ${teeCoords.lat}, ${teeCoords.lng}`);
      } else {
        console.log('⚠️ No tee coordinate found, using fallback');
      }
      
      if (pinCoord) {
        pinCoords = { lat: pinCoord.latitude, lng: pinCoord.longitude };
        console.log(`✅ Using REAL pin coordinates: ${pinCoords.lat}, ${pinCoords.lng}`);
      } else {
        console.log('⚠️ No pin coordinate found, using fallback');
      }
      
      // Generate player position between tee and pin
      const playerLat = teeCoords.lat + (pinCoords.lat - teeCoords.lat) * 0.4;
      const playerLng = teeCoords.lng + (pinCoords.lng - teeCoords.lng) * 0.4;
      
      const result = {
        teeBox: teeCoords,
        pin: pinCoords,
        playerLocation: { lat: playerLat, lng: playerLng },
        hazards: [
          { 
            lat: playerLat + 0.0005, 
            lng: playerLng + 0.0008, 
            type: 'water' as const, 
            name: 'Water Hazard' 
          },
          { 
            lat: pinCoords.lat - 0.0003, 
            lng: pinCoords.lng - 0.0005, 
            type: 'bunker' as const, 
            name: 'Green Side Bunker' 
          },
        ],
      };
      
      console.log('🚀 Returning REAL GPS coordinates:', result);
      return result;
    } else {
      console.log('❌ No hole coordinate data found for hole', holeNumber);
      console.log('Available holes:', holeCoordinates?.map(h => h.holeNumber) || 'none');
    }
    
    // Fallback: If no hole coordinates data available, generate realistic defaults
    console.log('⚠️ Using FALLBACK coordinates for hole', holeNumber);
    const holeOffset = (holeNumber - 1) * 0.002; // ~200m between holes
    const holeVariation = (holeNumber % 2 === 0 ? 1 : -1) * 0.001; // Alternating sides
    
    const fallbackResult = {
      teeBox: { lat: peterboroughBase.lat + holeOffset, lng: peterboroughBase.lng + holeVariation },
      pin: { lat: peterboroughBase.lat + holeOffset + 0.003, lng: peterboroughBase.lng + holeVariation + 0.001 },
      playerLocation: { lat: peterboroughBase.lat + holeOffset + 0.0012, lng: peterboroughBase.lng + holeVariation + 0.0004 },
      hazards: [
        { lat: peterboroughBase.lat + holeOffset + 0.0015, lng: peterboroughBase.lng + holeVariation + 0.0008, type: 'water' as const, name: 'Water Hazard' },
        { lat: peterboroughBase.lat + holeOffset + 0.0027, lng: peterboroughBase.lng + holeVariation + 0.0009, type: 'bunker' as const, name: 'Green Side Bunker' },
      ],
    };
    
    console.log('📍 Returning fallback coordinates:', fallbackResult);
    return fallbackResult;
  };

  // Get current hole par from holeCoordinates or courseData or default to 4
  const currentHoleCoordinate = holeCoordinates?.find(h => h.holeNumber === selectedHole);
  const currentHole = courseData?.holes?.find(h => h.holeNumber === selectedHole);
  const currentHolePar = currentHoleCoordinate?.par || currentHole?.par || mockHoleData.par;

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
                  <span className="text-slate-300">{currentWeather.windSpeed}mph {currentWeather.windDirection < 90 ? 'N' : currentWeather.windDirection < 180 ? 'E' : currentWeather.windDirection < 270 ? 'S' : 'W'}</span>
                </div>
                
                {/* Temperature */}
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{currentWeather.temperature}°F</span>
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

            {/* Compact Hole Map */}
            <div className="px-6">
              <CompactHoleMap
                holeData={{
                  ...mockHoleData,
                  number: selectedHole,
                  par: currentHolePar,
                  hazards: [
                    { type: 'water', carryDistance: 185, name: 'Water Hazard' },
                    { type: 'bunker', carryDistance: 220, name: 'Front Bunker' },
                    { type: 'bunker', carryDistance: 240, name: 'Right Bunker' }
                  ]
                }}
                gpsCoordinates={generateHoleGPSCoordinates(selectedHole)}
                distanceToPin={mockPlayerPosition.distanceToPin}
                onMapClick={() => setShowFullscreenMap(true)}
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
                holeData={{
                  ...mockHoleData,
                  number: selectedHole,
                  par: currentHolePar,
                }}
                playerPosition={mockPlayerPosition}
                onPositionSelect={(position) => console.log('Selected position:', position)}
                onMapClick={() => setShowFullscreenMap(true)}
                gpsCoordinates={generateHoleGPSCoordinates(selectedHole)}
              />

              {/* AI Caddie Suggestions */}
              <AICaddiePanel
                holeNumber={selectedHole}
                par={mockHoleData.par}
                distanceToPin={mockPlayerPosition.distanceToPin}
                conditions={{
                  windSpeed: currentWeather.windSpeed,
                  windDirection: 'SW',
                  temperature: currentWeather.temperature,
                  humidity: currentWeather.humidity,
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

              {/* Course Conditions */}
              {!weatherLoading && currentWeather && (
                <WeatherConditions 
                  weather={currentWeather} 
                  compact={false}
                  showPlayabilityIndex={true}
                />
              )}

              {/* Weather Loading State */}
              {weatherLoading && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                    <span className="text-slate-400 text-sm">Loading weather conditions...</span>
                  </div>
                </div>
              )}

              {/* Weather Error State */}
              {weatherError && (
                <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-4">
                  <div className="text-center">
                    <span className="text-red-400 text-sm">Failed to load weather: {weatherError}</span>
                  </div>
                </div>
              )}
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
                    holeData={{
                      ...mockHoleData,
                      number: selectedHole,
                      par: currentHolePar,
                    }}
                    playerPosition={mockPlayerPosition}
                    onPositionSelect={(position) => console.log('Selected position:', position)}
                    gpsCoordinates={generateHoleGPSCoordinates(selectedHole)}
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