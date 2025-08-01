import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { useState, useEffect, Suspense, lazy } from 'react';
import { Users, Clock, Target, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { GolfLoader } from '@/components/ui/golf-loader';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { BottomTabNavigation } from '@/components/layout/BottomTabNavigation';
import { ScorecardScreen } from '@/components/screens/ScorecardScreen';
import { SocialScreen } from '@/components/screens/SocialScreen';
import { CameraScreen } from '@/components/screens/CameraScreen';
import { FoodBeverageScreen } from '@/components/screens/FoodBeverageScreen';
import { notificationManager } from '@/utils/notificationManager';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';


export default function GameScorecard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedHole, setSelectedHole] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'social' | 'camera' | 'orders' | 'players'>('scorecard');
  const [showCamera, setShowCamera] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<Id<"players"> | null>(null);

  // Real-time game state subscription with optimization
  const gameState = useOptimizedQuery(
    api.games.getGameState, 
    gameId ? { gameId: gameId as Id<"games"> } : "skip",
    {
      selectiveFields: ['game.status', 'players.length', 'game.name'],
      debounce: 100 // Debounce updates by 100ms
    }
  );

  // Get detailed game data including scores with optimization
  const gameData = useOptimizedQuery(
    api.games.getGameData,
    gameId ? { gameId: gameId as Id<"games"> } : "skip",
    {
      selectiveFields: ['scores', 'players', 'photos'],
      debounce: 200 // Debounce score updates by 200ms
    }
  );

  // Record score mutation
  const recordScore = useMutation(api.games.recordScore);

  // Update game status mutation
  const updateGameStatus = useMutation(api.games.updateGameStatus);

  // Achievement creation mutation
  const createAchievementPost = useMutation(api.socialPosts.createAchievementPost);

  // Set current player ID from guest session or user context
  useEffect(() => {
    // Get current player from game state or location state
    if (gameState?.players && gameState.players.length > 0) {
      // Try to get player ID from navigation state first
      const locationState = window.history.state?.usr;
      if (locationState?.playerId) {
        setCurrentPlayerId(locationState.playerId);
      } else {
        // Default to first player for now
        setCurrentPlayerId(gameState.players[0]._id);
      }
    }
  }, [gameState]);

  const detectAchievements = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    // Achievement detection is now handled automatically by the backend
    // in the recordScore mutation, so we don't need to do it here
  };

  const handleScoreUpdate = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    try {
      setError(null);
      
      // Record score in backend (achievements are handled automatically)
      await recordScore({
        playerId,
        holeNumber,
        strokes,
      });

      // Find the player who scored
      const player = gameState?.players.find(p => p._id === playerId);
      if (player && gameId) {
        // Trigger score update notification for other players
        await notificationManager.notifyGameEvent(
          `${player.name} scored on hole ${holeNumber}`,
          `${strokes} strokes on hole ${holeNumber}`,
          gameId,
          'normal'
        );

        // Check for notable scores and trigger special notifications
        if (strokes === 1) {
          await notificationManager.notifyAchievement(
            'Hole in One!',
            `${player.name} got a hole in one on hole ${holeNumber}!`,
            gameId
          );
        } else if (strokes === 2 && holeNumber >= 3) { // Assuming par 3+ holes
          await notificationManager.notifyAchievement(
            'Eagle!',
            `${player.name} scored an eagle on hole ${holeNumber}!`,
            gameId
          );
        }
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
      <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">Invalid game ID</div>
            <Button onClick={() => navigate('/join')}>Back to Join Game</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (gameState === undefined || gameData === undefined) {
    return (
      <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
        <GolfLoader size="lg" text="Loading game..." />
      </div>
    );
  }

  // Show error state if game doesn't exist
  if (gameState === null || gameData === null) {
    return (
      <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">Game not found</div>
            <p className="text-gray-600 mb-4">This game may have been deleted or you may not have access to it.</p>
            <Button onClick={() => navigate('/join')}>Back to Join Game</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.game.status === "finished") {
    return (
      <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
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
  const scoresByPlayerAndHole = gameData.scores.reduce((acc, score) => {
    const key = `${score.playerId}-${score.holeNumber}`;
    acc[key] = score.strokes;
    return acc;
  }, {} as Record<string, number>);

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <MobileLayout
      header={
        <NavigationHeader
          title={gameState.game.name}
          subtitle={`${gameState.players.length} players • ${gameState.game.status}`}
          onBack={() => navigate(-1)}
          onShare={() => {
            if (navigator.share) {
              navigator.share({
                title: 'ParParty Golf Game',
                text: `Join my golf game: ${gameState.game.name}`,
                url: window.location.href,
              });
            }
          }}
          rightAction={
            <button
              onClick={handleFinishGame}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors border border-red-500/30"
            >
              Finish
            </button>
          }
        />
      }
      footer={
        <BottomTabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'camera') {
              setShowCamera(true);
            } else {
              setActiveTab(tab as any);
            }
          }}
          onCameraPress={() => setShowCamera(true)}
        />
      }
    >

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'scorecard' ? (
        <ScorecardScreen
          players={gameState.players}
          scores={gameData.scores}
          onScoreUpdate={handleScoreUpdate}
        />
      ) : activeTab === 'social' ? (
        <SocialScreen />
      ) : activeTab === 'orders' ? (
        <FoodBeverageScreen />
      ) : activeTab === 'players' ? (
        <div className="p-4">
          <div className="text-center py-8 text-gray-500">
            Players view coming soon...
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-center py-8 text-gray-500">
            Coming soon...
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraScreen
          onClose={() => setShowCamera(false)}
          currentHole={selectedHole}
        />
      )}
    </MobileLayout>
  );
}