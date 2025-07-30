import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Clock, Target, Camera, MessageSquare, Utensils, Minus, Plus } from 'lucide-react';
import SocialFeed from '@/components/SocialFeed';
import PhotoCapture from '@/components/PhotoCapture';
import FoodOrderingMenu from '@/components/FoodOrderingMenu';
import OrderStatus from '@/components/OrderStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { GolfLoader } from '@/components/ui/golf-loader';

interface ScoreInputProps {
  playerId: Id<"players">;
  holeNumber: number;
  currentScore?: number;
  onScoreUpdate: (playerId: Id<"players">, holeNumber: number, strokes: number) => void;
  disabled?: boolean;
}

function ScoreInput({ playerId, holeNumber, currentScore, onScoreUpdate, disabled }: ScoreInputProps) {
  const [score, setScore] = useState(currentScore?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setScore(currentScore?.toString() || '');
  }, [currentScore]);

  const handleSubmit = () => {
    const numScore = parseInt(score);
    if (numScore >= 1 && numScore <= 20) {
      onScoreUpdate(playerId, holeNumber, numScore);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setScore(currentScore?.toString() || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="flex items-center gap-1"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newScore = Math.max(1, parseInt(score || '1') - 1);
            setScore(newScore.toString());
          }}
          className="w-8 h-8 p-0"
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
          onKeyDown={handleKeyPress}
          className="w-12 h-8 text-center text-sm font-semibold"
          autoFocus
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newScore = Math.min(20, parseInt(score || '1') + 1);
            setScore(newScore.toString());
          }}
          className="w-8 h-8 p-0"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Button
        variant={currentScore ? "outline" : "ghost"}
        size="sm"
        className={`w-12 h-8 text-sm font-semibold transition-all ${
          currentScore 
            ? currentScore <= 3 
              ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200' 
              : 'bg-green-50 border-green-200'
            : 'border-dashed'
        }`}
        onClick={() => setIsEditing(true)}
        disabled={disabled}
      >
        {currentScore || '-'}
      </Button>
    </motion.div>
  );
}

interface LeaderboardProps {
  players: Array<{
    _id: Id<"players">;
    name: string;
    totalStrokes: number;
    holesPlayed: number;
    currentPosition: number;
  }>;
}

function Leaderboard({ players }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.totalStrokes !== b.totalStrokes) {
      return a.totalStrokes - b.totalStrokes;
    }
    return b.holesPlayed - a.holesPlayed;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="mb-6 card-hover glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gray-50'
                }`}
              >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-gray-500">
                    {player.holesPlayed} hole{player.holesPlayed !== 1 ? 's' : ''} played
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{player.totalStrokes}</div>
                <div className="text-sm text-gray-500">strokes</div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}

export default function GameScorecard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedHole, setSelectedHole] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'social' | 'orders'>('scorecard');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showFoodMenu, setShowFoodMenu] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<Id<"players"> | null>(null);

  // Real-time game state subscription
  const gameState = useQuery(api.games.getGameState, 
    (gameId && gameId !== 'demo') ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Get detailed game data including scores
  const gameData = useQuery(api.games.getGameData,
    (gameId && gameId !== 'demo') ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Demo data for demo mode
  const demoGameState = gameId === 'demo' ? {
    game: {
      _id: 'demo',
      name: 'Demo Golf Round',
      status: 'active',
      format: 'stroke',
      startedAt: Date.now() - 30 * 60 * 1000,
    },
    players: [
      { _id: 'demo-player-1', name: 'Demo Player', totalStrokes: 15, holesPlayed: 4, currentPosition: 1 },
      { _id: 'demo-player-2', name: 'Alex Johnson', totalStrokes: 18, holesPlayed: 4, currentPosition: 2 },
      { _id: 'demo-player-3', name: 'Sam Wilson', totalStrokes: 22, holesPlayed: 4, currentPosition: 3 }
    ]
  } : null;

  const demoGameData = gameId === 'demo' ? {
    game: demoGameState?.game,
    players: demoGameState?.players,
    scores: [
      { playerId: 'demo-player-1', holeNumber: 1, strokes: 4, timestamp: Date.now() - 25 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 2, strokes: 3, timestamp: Date.now() - 20 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 3, strokes: 5, timestamp: Date.now() - 15 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 4, strokes: 3, timestamp: Date.now() - 10 * 60 * 1000 },
    ],
    photos: []
  } : null;

  // Use demo data if in demo mode
  const currentGameState = gameId === 'demo' ? demoGameState : gameState;
  const currentGameData = gameId === 'demo' ? demoGameData : gameData;

  // Record score mutation
  const recordScore = useMutation(api.games.recordScore);

  // Update game status mutation
  const updateGameStatus = useMutation(api.games.updateGameStatus);

  // Achievement creation mutation
  const createAchievementPost = useMutation(api.socialPosts.createAchievementPost);

  // Set current player ID from guest session or user context
  useEffect(() => {
    // For now, we'll use the first player as current player
    // In a real app, this would come from authentication context
    if (currentGameState?.players && currentGameState.players.length > 0) {
      setCurrentPlayerId(currentGameState.players[0]._id);
    }
  }, [currentGameState]);

  const detectAchievements = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    try {
      // Get player's previous scores to detect achievements
      const playerScores = currentGameData?.scores.filter(s => s.playerId === playerId) || [];
      const isFirstScore = playerScores.length === 0;
      
      // Detect hole-in-one
      if (strokes === 1) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "hole_in_one",
          holeNumber,
          score: strokes,
        });
      }
      // Detect eagle (2 under par, assuming par 4)
      else if (strokes === 2) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "eagle",
          holeNumber,
          score: strokes,
        });
      }
      // Detect birdie (1 under par, assuming par 4)
      else if (strokes === 3) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "birdie",
          holeNumber,
          score: strokes,
        });
      }
      // First score achievement
      else if (isFirstScore) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "first_score",
        });
      }
    } catch (error) {
      console.error('Error creating achievement post:', error);
    }
  };

  const handleScoreUpdate = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    try {
      setError(null);
      
      // Skip backend calls in demo mode
      if (gameId !== 'demo') {
        await recordScore({
          playerId,
          holeNumber,
          strokes,
        });
        
        // Detect and create achievement posts
        await detectAchievements(playerId, holeNumber, strokes);
      } else {
        // In demo mode, just show celebration
        await detectAchievements(playerId, holeNumber, strokes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record score');
    }
  };

  const handleFinishGame = async () => {
    if (!gameId) return;
    
    try {
      await updateGameStatus({
        gameId: gameId as Id<"games">,
        status: "finished"
      });
      navigate(`/finish/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish game');
    }
  };

  if (!gameId) {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">Invalid game ID</div>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGameState || !currentGameData) {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <GolfLoader size="lg" text="Loading game..." />
      </div>
    );
  }

  if (currentGameState.game.status === "finished") {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Card className="w-full max-w-md glass">
            <CardContent className="p-6 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2">Game Finished!</h2>
              <p className="text-gray-600 mb-4">This game has already ended.</p>
              <Button onClick={() => navigate(`/finish/${gameId}`)}>
                View Results
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Create score lookup for easy access
  const scoresByPlayerAndHole = currentGameData.scores.reduce((acc, score) => {
    const key = `${score.playerId}-${score.holeNumber}`;
    acc[key] = score.strokes;
    return acc;
  }, {} as Record<string, number>);

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen gradient-golf-green gradient-animated p-4">
      <motion.div 
        className="w-full max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gradient">{currentGameState.game.name}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {currentGameState.players.length} players
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {currentGameState.game.status}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {currentGameState.game.format}
              </div>
            </div>
          </div>

          <Button
            onClick={handleFinishGame}
            variant="outline"
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:scale-105 transition-all"
          >
            Finish Game
          </Button>
        </motion.div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="text-red-700 text-sm">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="mb-6 glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-white/50 p-1 rounded-lg backdrop-blur">
                  <AnimatePresence mode="wait">
                    <Button
                      variant={activeTab === 'scorecard' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('scorecard')}
                      className={activeTab === 'scorecard' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Scorecard
                    </Button>
                    <Button
                      variant={activeTab === 'social' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('social')}
                      className={activeTab === 'social' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Social Feed
                    </Button>
                    <Button
                      variant={activeTab === 'orders' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('orders')}
                      className={activeTab === 'orders' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <Utensils className="w-4 h-4 mr-2" />
                      F&B Orders
                    </Button>
                  </AnimatePresence>
                </div>
              
              {currentPlayerId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhotoCapture(true)}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Share Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Leaderboard - Always visible */}
        <Leaderboard players={currentGameState.players} />

        {/* Tab Content */}
        {activeTab === 'scorecard' ? (
          <>
            {/* Hole Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="mb-6 glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select Hole</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-9 gap-2">
                    {holes.map((hole) => (
                      <motion.div
                        key={hole}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={selectedHole === hole ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedHole(hole)}
                          className={`aspect-square transition-all ${
                            selectedHole === hole 
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg' 
                              : 'hover:bg-green-50'
                          }`}
                        >
                          {hole}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Scorecard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Hole {selectedHole} Scores</span>
                  <div className="text-sm font-normal text-gray-600">
                    Tap to enter/edit scores
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentGameState.players.map((player) => {
                    const scoreKey = `${player._id}-${selectedHole}`;
                    const currentScore = scoresByPlayerAndHole[scoreKey];
                    
                    return (
                      <div
                        key={player._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-700 font-medium">
                              {player.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-500">
                              Total: {player.totalStrokes} ({player.holesPlayed} holes)
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Strokes:</span>
                          <ScoreInput
                            playerId={player._id}
                            holeNumber={selectedHole}
                            currentScore={currentScore}
                            onScoreUpdate={handleScoreUpdate}
                            disabled={currentGameState.game.status === "finished"}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentGameState.players.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No players in this game yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Game Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.max(...currentGameState.players.map(p => p.holesPlayed), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Max Holes Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(currentGameState.players.reduce((sum, p) => sum + p.holesPlayed, 0) / currentGameState.players.length) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Avg Holes Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentGameData.scores.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Scores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {new Date(currentGameState.game.startedAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">Started At</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : activeTab === 'social' ? (
          /* Social Feed Tab */
          <SocialFeed
            gameId={gameId as Id<"games">}
            currentPlayerId={currentPlayerId}
            className="max-w-2xl mx-auto"
          />
        ) : (
          /* F&B Orders Tab */
          <div className="max-w-4xl mx-auto">
            {currentPlayerId && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowFoodMenu(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Utensils className="w-5 h-5 mr-2" />
                  Order Food & Beverages
                </Button>
              </div>
            )}
            
            {currentPlayerId && (
              <OrderStatus
                playerId={currentPlayerId}
                gameId={gameId as Id<"games">}
              />
            )}
          </div>
        )}

        {/* Photo Capture Modal */}
        {showPhotoCapture && currentPlayerId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <PhotoCapture
              gameId={gameId as Id<"games">}
              playerId={currentPlayerId}
              holeNumber={selectedHole}
              onPhotoShared={() => {
                setShowPhotoCapture(false);
                // Switch to social tab to see the shared photo
                setActiveTab('social');
              }}
              onClose={() => setShowPhotoCapture(false)}
            />
          </div>
        )}

        {/* Food Ordering Menu Modal */}
        {showFoodMenu && currentPlayerId && currentGameState.game.courseId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <FoodOrderingMenu
              gameId={gameId as Id<"games">}
              playerId={currentPlayerId}
              courseId={currentGameState.game.courseId}
              currentHole={selectedHole}
              onClose={() => setShowFoodMenu(false)}
              onOrderPlaced={() => {
                setShowFoodMenu(false);
                // Switch to orders tab to see the order status
                setActiveTab('orders');
              }}
            />
          </div>
        )}
        
        {/* Mobile Bottom Navigation */}
        {false && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onPhotoCapture={currentPlayerId ? () => setShowPhotoCapture(true) : undefined}
          />
        )}
      </motion.div>
    </div>
  );
}